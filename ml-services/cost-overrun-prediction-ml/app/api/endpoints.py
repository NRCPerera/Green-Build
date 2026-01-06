"""API endpoints for cost overrun prediction"""

import logging
from typing import Dict, Any

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import JSONResponse

from app.models.schemas import PredictionRequest, PredictionResponse, PredictionResult

logger = logging.getLogger(__name__)

# Global reference to predictor (set by main.py)
_predictor = None


def set_predictor(predictor):
    """Set the global predictor instance"""
    global _predictor
    _predictor = predictor


def get_predictor():
    """Get the global predictor instance"""
    return _predictor

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
    "/predict",
    response_model=PredictionResponse,
    status_code=status.HTTP_200_OK,
    tags=["Prediction"]
)
async def predict(request: PredictionRequest) -> PredictionResponse:
    """
    Predict cost overrun for a construction project
    
    Args:
        request: Project features and optional explain flag
        
    Returns:
        Prediction results including cost overrun percentage, probability, 
        risk label, and optional SHAP explanations
        
    Raises:
        HTTPException 400: Invalid input data
        HTTPException 500: Model inference error
    """
    
    try:
        logger.info("Received prediction request")
        
        # Get predictor
        predictor = get_predictor()
        
        if predictor is None:
            logger.error("Predictor not initialized")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Predictor service not initialized"
            )
        
        # Extract explain flag, top_n, and data
        explain = request.explain
        top_n = request.top_n
        payload = request.data
        
        logger.info(f"Explain flag: {explain}, top_n: {top_n}")
        
        # Run prediction
        result = predictor.predict(payload, explain=explain, top_n=top_n)
        
        logger.info("Prediction completed successfully")
        
        # Build response
        response = PredictionResponse(
            success=True,
            prediction=PredictionResult(**result)
        )
        
        return response
        
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
