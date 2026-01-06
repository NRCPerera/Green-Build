"""API endpoints for sustainability predictions"""

import logging
from fastapi import APIRouter, HTTPException

from app.models import (
    SustainabilityPredictionRequest,
    SustainabilityPredictionResponse,
    LifecycleCostRequest,
    LifecycleCostResponse,
    RiskPredictionRequest,
    RiskPredictionResponse,
    FullAnalysisRequest,
    FullAnalysisResponse
)

logger = logging.getLogger(__name__)

router = APIRouter()

# Global inference service - set by main.py during startup
_inference_service = None


def set_inference_service(service):
    """Set the inference service instance"""
    global _inference_service
    _inference_service = service


def get_inference_service():
    """Get the inference service instance"""
    if _inference_service is None:
        raise HTTPException(status_code=503, detail="Inference service not initialized")
    return _inference_service


@router.get("/")
async def root():
    """API information endpoint"""
    return {
        "service": "Sustainability Prediction API",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "sustainability_score": "/predict/sustainability",
            "lifecycle_cost": "/predict/lifecycle-cost",
            "risk_prediction": "/predict/risk",
            "full_analysis": "/predict/full-analysis",
            "health": "/health"
        }
    }


@router.post("/predict/sustainability", response_model=SustainabilityPredictionResponse)
async def predict_sustainability(request: SustainabilityPredictionRequest):
    """
    Predict sustainability score based on energy and environmental metrics.
    
    Returns a sustainability score (0-100) with interpretation.
    """
    try:
        service = get_inference_service()
        result = service.predict_sustainability(request.model_dump())
        return SustainabilityPredictionResponse(**result)
    except Exception as e:
        logger.error(f"Sustainability prediction error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/predict/lifecycle-cost", response_model=LifecycleCostResponse)
async def predict_lifecycle_cost(request: LifecycleCostRequest):
    """
    Predict total lifecycle cost in LKR (Sri Lankan Rupees).
    
    Returns lifecycle cost in millions LKR with interpretation.
    """
    try:
        service = get_inference_service()
        result = service.predict_lifecycle_cost(request.model_dump())
        return LifecycleCostResponse(**result)
    except Exception as e:
        logger.error(f"Lifecycle cost prediction error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/predict/risk", response_model=RiskPredictionResponse)
async def predict_risk(request: RiskPredictionRequest):
    """
    Predict project risk level based on project parameters.
    
    Returns risk probability and mitigation recommendations.
    """
    try:
        service = get_inference_service()
        result = service.predict_risk(request.model_dump())
        return RiskPredictionResponse(**result)
    except Exception as e:
        logger.error(f"Risk prediction error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/predict/full-analysis", response_model=FullAnalysisResponse)
async def full_analysis(request: FullAnalysisRequest):
    """
    Run all three prediction models and return combined results.
    
    This endpoint runs sustainability, lifecycle cost, and risk predictions
    in a single request for comprehensive project analysis.
    """
    try:
        service = get_inference_service()
        data = request.model_dump()
        
        # Run all three predictions
        sustainability_result = service.predict_sustainability({
            "energy_kwh_year": data["energy_kwh_year"],
            "embodied_co2_tons": data["embodied_co2_tons"],
            "operational_co2_tons": data["operational_co2_tons"],
            "energy_efficiency": data["energy_efficiency"],
            "energy_efficiency_per_sqft": data["energy_efficiency_per_sqft"],
            "cost_per_sqft_for_sustainability": data["cost_per_sqft_for_sustainability"],
            "energy_co2_impact_relative_to_cost": data["energy_co2_impact_relative_to_cost"]
        })
        
        lifecycle_result = service.predict_lifecycle_cost({
            "construction_cost_per_sqft": data["construction_cost_per_sqft"],
            "maintenance_cost_per_year": data["maintenance_cost_per_year"],
            "energy_kwh_year": data["energy_kwh_year"],
            "energy_efficiency": data["energy_efficiency"],
            "sustainability_score": sustainability_result["sustainability_score"],
            "energy_efficiency_per_sqft": data["energy_efficiency_per_sqft"],
            "cost_per_sqft_for_sustainability": data["cost_per_sqft_for_sustainability"],
            "energy_co2_impact_relative_to_cost": data["energy_co2_impact_relative_to_cost"]
        })
        
        risk_result = service.predict_risk({
            "design_completeness": data["design_completeness"],
            "project_complexity_score": data["project_complexity_score"],
            "change_order_frequency": data["change_order_frequency"],
            "inflation_rate": data["inflation_rate"],
            "interest_rate": data["interest_rate"],
            "contractor_experience_years": data["contractor_experience_years"]
        })
        
        return FullAnalysisResponse(
            sustainability_score=sustainability_result["sustainability_score"],
            sustainability_interpretation=sustainability_result["interpretation"],
            lifecycle_cost_millions_lkr=lifecycle_result["lifecycle_cost_millions_lkr"],
            lifecycle_cost_lkr=lifecycle_result["lifecycle_cost_lkr"],
            lifecycle_interpretation=lifecycle_result["interpretation"],
            is_high_risk=risk_result["is_high_risk"],
            risk_probability=risk_result["risk_probability"],
            risk_level=risk_result["risk_level"],
            risk_recommendations=risk_result["recommendations"]
        )
        
    except Exception as e:
        logger.error(f"Full analysis error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
