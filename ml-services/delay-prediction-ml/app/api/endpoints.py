"""API endpoints for construction delay prediction"""

import logging
from typing import Dict, Any

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import JSONResponse

from app.schemas import (
    DelayPredictionRequest,
    DelayPredictionResponse,
    RegressionPredictionResult,
    ClassificationPredictionResult
)

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
        "service": "Construction Delay Prediction API",
        "version": "1.0.0"
    }


@router.post(
    "/predict/regression",
    response_model=DelayPredictionResponse,
    status_code=status.HTTP_200_OK,
    tags=["Prediction"]
)
async def predict_delay_days(request: DelayPredictionRequest) -> DelayPredictionResponse:
    """
    Predict total delay days for a construction project (Regression)
    
    Args:
        request: Project features for prediction
        
    Returns:
        Prediction results including predicted delay days
        
    Raises:
        HTTPException 400: Invalid input data
        HTTPException 500: Model inference error
    """
    
    try:
        logger.info("Received regression prediction request")
        
        predictor = get_predictor()
        
        if predictor is None:
            logger.error("Predictor not initialized")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Predictor service not initialized"
            )
        
        payload = request.data
        
        # Run regression prediction
        result = predictor.predict_regression(payload)
        
        logger.info("Regression prediction completed successfully")
        
        response = DelayPredictionResponse(
            success=True,
            prediction_type="regression",
            regression_result=RegressionPredictionResult(**result)
        )
        
        return response
        
    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid input: {str(e)}"
        )
        
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction failed: {str(e)}"
        )


@router.post(
    "/predict/classification",
    response_model=DelayPredictionResponse,
    status_code=status.HTTP_200_OK,
    tags=["Prediction"]
)
async def predict_delay_category(request: DelayPredictionRequest) -> DelayPredictionResponse:
    """
    Predict delay category for a construction project (Classification)
    
    Categories:
    - On-Time: 0 days delay
    - Minor Delay: 1-60 days
    - Major Delay: 61-180 days
    - Critical Delay: >180 days
    
    Args:
        request: Project features for prediction
        
    Returns:
        Prediction results including delay category and probabilities
        
    Raises:
        HTTPException 400: Invalid input data
        HTTPException 500: Model inference error
    """
    
    try:
        logger.info("Received classification prediction request")
        
        predictor = get_predictor()
        
        if predictor is None:
            logger.error("Predictor not initialized")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Predictor service not initialized"
            )
        
        payload = request.data
        
        # Run classification prediction
        result = predictor.predict_classification(payload)
        
        logger.info("Classification prediction completed successfully")
        
        response = DelayPredictionResponse(
            success=True,
            prediction_type="classification",
            classification_result=ClassificationPredictionResult(**result)
        )
        
        return response
        
    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid input: {str(e)}"
        )
        
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction failed: {str(e)}"
        )


@router.post(
    "/predict",
    response_model=DelayPredictionResponse,
    status_code=status.HTTP_200_OK,
    tags=["Prediction"]
)
async def predict_delay_full(request: DelayPredictionRequest) -> DelayPredictionResponse:
    """
    Full delay prediction combining both regression and classification
    
    Args:
        request: Project features for prediction
        
    Returns:
        Complete prediction including delay days and category
        
    Raises:
        HTTPException 400: Invalid input data
        HTTPException 500: Model inference error
    """
    
    try:
        logger.info("Received full prediction request")
        
        predictor = get_predictor()
        
        if predictor is None:
            logger.error("Predictor not initialized")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Predictor service not initialized"
            )
        
        payload = request.data
        
        # Run both predictions
        regression_result = predictor.predict_regression(payload)
        classification_result = predictor.predict_classification(payload)
        
        logger.info("Full prediction completed successfully")
        
        response = DelayPredictionResponse(
            success=True,
            prediction_type="full",
            regression_result=RegressionPredictionResult(**regression_result),
            classification_result=ClassificationPredictionResult(**classification_result)
        )
        
        return response
        
    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid input: {str(e)}"
        )
        
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction failed: {str(e)}"
        )
