"""API endpoint definitions"""

import logging
from fastapi import APIRouter, HTTPException

from app.models import (
    SustainabilityPredictionRequest,
    SustainabilityPredictionResponse,
    LifecycleCostRequest,
    LifecycleCostResponse,
    RiskPredictionRequest,
    RiskPredictionResponse,
    HealthResponse
)
from app import __version__
from app.dev_config import DEV_MODE

logger = logging.getLogger(__name__)

# Create router
router = APIRouter()

# Global inference service (set by main.py during startup)
_inference_service = None


def set_inference_service(service):
    """Set the inference service instance"""
    global _inference_service
    _inference_service = service


@router.get("/", response_model=HealthResponse)
async def root():
    """Root endpoint with API information"""
    return {
        "status": "healthy",
        "mode": "development (mock predictions)" if DEV_MODE else "production (real models)",
        "models_loaded": _inference_service is not None,
        "version": __version__
    }


@router.post("/predict/sustainability", response_model=SustainabilityPredictionResponse)
async def predict_sustainability(request: SustainabilityPredictionRequest):
    """
    Predict sustainability score for a construction project
    
    Returns a sustainability score (0-100) with confidence level and interpretation
    """
    if _inference_service is None:
        raise HTTPException(status_code=503, detail="Inference service not initialized")
    
    try:
        logger.info("Processing sustainability prediction request")
        result = _inference_service.predict_sustainability(request.dict())
        return result
    except Exception as e:
        logger.error(f"Prediction failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@router.post("/predict/lifecycle-cost", response_model=LifecycleCostResponse)
async def predict_lifecycle_cost(request: LifecycleCostRequest):
    """
    Predict lifecycle costs for a construction project
    
    Returns total lifecycle cost, annual operating cost, and maintenance cost estimates
    """
    if _inference_service is None:
        raise HTTPException(status_code=503, detail="Inference service not initialized")
    
    try:
        logger.info("Processing lifecycle cost prediction request")
        result = _inference_service.predict_lifecycle_cost(request.dict())
        return result
    except Exception as e:
        logger.error(f"Prediction failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@router.post("/predict/risk", response_model=RiskPredictionResponse)
async def predict_risk(request: RiskPredictionRequest):
    """
    Predict sustainability risks for a construction project
    
    Returns risk level, score, identified factors, and mitigation recommendations
    """
    if _inference_service is None:
        raise HTTPException(status_code=503, detail="Inference service not initialized")
    
    try:
        logger.info("Processing risk prediction request")
        result = _inference_service.predict_risk(request.dict())
        return result
    except Exception as e:
        logger.error(f"Prediction failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")
