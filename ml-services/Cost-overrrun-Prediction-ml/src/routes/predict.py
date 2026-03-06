from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

from src.schemas.in_progress import InProgressRequest, InProgressResponse
from src.schemas.pre_project import PreProjectRequest, PreProjectResponse
from src.services.in_progress_service import MissingFieldsError as InProgressMissingFieldsError
from src.services.in_progress_service import predict_in_progress
from src.services.pre_project_service import MissingFieldsError as PreProjectMissingFieldsError
from src.services.pre_project_service import predict_pre_project

router = APIRouter(prefix="/predict", tags=["predict"])


@router.post("/pre-project", response_model=PreProjectResponse)
def pre_project_prediction(request: Request, payload: PreProjectRequest) -> PreProjectResponse:
    try:
        result = predict_pre_project(
            payload.model_dump(),
            request.app.state.model_registry.pre_project,
        )
        return PreProjectResponse(**result)
    except PreProjectMissingFieldsError as exc:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Missing required fields",
                "missing_fields": exc.missing_fields,
            },
        ) from exc


@router.post("/in-progress", response_model=InProgressResponse)
def in_progress_prediction(request: Request, payload: InProgressRequest) -> InProgressResponse:
    try:
        result = predict_in_progress(
            payload.model_dump(),
            request.app.state.model_registry.in_progress,
        )
        return InProgressResponse(**result)
    except InProgressMissingFieldsError as exc:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Missing required fields",
                "missing_fields": exc.missing_fields,
            },
        ) from exc
