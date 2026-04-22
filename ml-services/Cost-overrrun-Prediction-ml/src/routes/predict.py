from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

from src.schemas.pre_project import PreProjectRequest, PreProjectResponse
from src.services.pre_project_service import predict_pre_project

router = APIRouter(prefix="/predict", tags=["predict"])


@router.post("/pre-project", response_model=PreProjectResponse)
def pre_project_prediction(request: Request, payload: PreProjectRequest) -> PreProjectResponse:
    try:
        if request.app.state.model_registry is None:
            raise HTTPException(
                status_code=503,
                detail={"message": "Model registry not loaded. Check /health for startup_error."},
            )
        result = predict_pre_project(
            payload.model_dump(),
            request.app.state.model_registry.pre_project,
        )
        return PreProjectResponse(**result)
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail={"message": str(exc)},
        ) from exc
