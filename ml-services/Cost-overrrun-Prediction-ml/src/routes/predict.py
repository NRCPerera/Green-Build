from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

from src.schemas.pre_project import (
    PreProjectRequest, 
    PreProjectResponse,
    PreProjectBatchResponse,
    BatchItemResult,
    BatchItemError
)
from src.services.pre_project_service import predict_pre_project, predict_many

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


@router.post("/batch", response_model=PreProjectBatchResponse)
def pre_project_batch_prediction(request: Request, items: list[dict]) -> PreProjectBatchResponse:
    if request.app.state.model_registry is None:
        raise HTTPException(
            status_code=503,
            detail={"message": "Model registry not loaded. Check /health for startup_error."},
        )
    
    valid_payloads = []
    errors = []
    
    # 1. Validate items
    for idx, item in enumerate(items):
        try:
            validated_item = PreProjectRequest(**item)
            valid_payloads.append((idx, validated_item.model_dump()))
        except Exception as exc:
            errors.append(BatchItemError(index=idx, error=str(exc)))
            
    if not valid_payloads:
        return PreProjectBatchResponse(results=[], errors=errors)
        
    try:
        # 2. Extract dicts for prediction
        indices = [p[0] for p in valid_payloads]
        dicts = [p[1] for p in valid_payloads]
        
        # 3. Batch prediction
        batch_results = predict_many(dicts, request.app.state.model_registry.pre_project)
        
        # 4. Map results back
        results = [
            BatchItemResult(index=indices[i], data=PreProjectResponse(**res))
            for i, res in enumerate(batch_results)
        ]
        
        return PreProjectBatchResponse(results=results, errors=errors)
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail={"message": f"Batch prediction failed: {str(exc)}"},
        ) from exc
