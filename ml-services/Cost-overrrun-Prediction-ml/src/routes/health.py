from __future__ import annotations

from fastapi import APIRouter, Request

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check(request: Request) -> dict[str, object]:
    model_status = getattr(request.app.state, "model_status", {})
    return {
        "status": "ok",
        "service": "cost-overrun-prediction-ml",
        **model_status,
    }
