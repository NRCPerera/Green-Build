"""API endpoints for cost overrun prediction"""

import logging
from typing import Dict, Any

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import JSONResponse

from app.models.schemas import PredictionRequest, PredictionResponse

logger = logging.getLogger(__name__)

# Global reference to inference service (set by main.py)
_inference_service = None


def set_inference_service(service):
    """Set the global inference service instance"""
    global _inference_service
    _inference_service = service


def get_inference_service():
    """Get the global inference service instance"""
    return _inference_service

router = APIRouter()


@router.get("/", tags=["Health"])
async def root() -> Dict[str, str]:
    """
    Health check endpoint
    
    Returns:
        Status information
    """
    return {
        "status": "healthy",
        "service": "Cost Overrun Prediction API",
        "version": "1.0.0"
    }


@router.post(
    "/predict/raw",
    response_model=PredictionResponse,
    status_code=status.HTTP_200_OK,
    tags=["Prediction"]
)
async def predict_raw(request: PredictionRequest) -> PredictionResponse:
    """
    Predict cost overrun for a construction project
    
    Args:
        request: Project features
        
    Returns:
        Prediction results including cost overrun percentage, probability, and risk label
        
    Raises:
        HTTPException 400: Invalid input data
        HTTPException 500: Model inference error
    """
    
    try:
        logger.info("Received prediction request")
        
        # Get inference service
        inference_service = get_inference_service()
        
        if inference_service is None:
            logger.error("Inference service not initialized")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Model service not initialized"
            )
        
        # Run prediction
        result = inference_service.predict(request.data)
        
        logger.info("Prediction completed successfully")
        
        return PredictionResponse(**result)
        
    except ValueError as e:
        # Validation errors (invalid categorical values, etc.)
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid input: {str(e)}"
        )
        
    except Exception as e:
        # Model errors or unexpected errors
        logger.error(f"Prediction error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction failed: {str(e)}"
        )
