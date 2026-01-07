"""API endpoints for sustainability predictions"""

import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any

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


# ==============================================
# Simplified input model for React frontend
# ==============================================
class SimplifiedPredictionRequest(BaseModel):
    """Simplified request matching the React frontend form"""
    Area_SQFT: float = 2000
    Floors: int = 2
    Design_Completeness: float = 80
    Contractor_Experience: float = 10
    Inflation_Rate: float = 6.5
    Interest_Rate: float = 10.0
    base_construction_rate: float = 12000
    maintenance_overhead: float = 2.0
    electricity_unit_cost: float = 45.0
    co2_factor: float = 0.0004


def calculate_derived_features(data: dict) -> dict:
    """Calculate all derived engineering features from basic inputs"""
    area = data.get('Area_SQFT', 2000)
    floors = data.get('Floors', 2)
    design_completeness = data.get('Design_Completeness', 80)
    contractor_experience = data.get('Contractor_Experience', 10)
    inflation_rate = data.get('Inflation_Rate', 6.5)
    interest_rate = data.get('Interest_Rate', 10.0)
    
    base_rate = data.get('base_construction_rate', 12000)
    maint_overhead = data.get('maintenance_overhead', 2.0) / 100
    elec_cost = data.get('electricity_unit_cost', 45.0)
    co2_factor = data.get('co2_factor', 0.0004)
    
    # Energy calculations
    energy_per_sqft = 12.5
    energy_kwh_year = area * energy_per_sqft
    annual_energy_cost = energy_kwh_year * elec_cost
    
    # CO2 calculations
    embodied_co2_per_sqft = 0.05
    operational_co2_tons = energy_kwh_year * co2_factor
    embodied_co2_tons = area * embodied_co2_per_sqft
    
    # Cost calculations
    floor_increment = 500
    construction_cost_per_sqft = base_rate + (floors * floor_increment)
    total_construction_cost = area * construction_cost_per_sqft
    maintenance_cost_per_year = total_construction_cost * maint_overhead
    
    # Sustainability calculations
    sustainability_ratio = 0.15
    cost_per_sqft_sustainability = construction_cost_per_sqft * sustainability_ratio
    energy_efficiency = min(100, max(0, design_completeness * 0.9))
    energy_efficiency_per_sqft = energy_kwh_year / area if area > 0 else 0
    
    # Impact ratios
    lifecycle_est = total_construction_cost + (maintenance_cost_per_year * 50)
    co2_impact_ratio = (operational_co2_tons * 1000000) / lifecycle_est if lifecycle_est > 0 else 0
    
    # Complexity metrics
    complexity_score = min(100, floors * 10 + (100 - design_completeness) * 0.5)
    change_order_freq = max(0, (100 - design_completeness) / 20)
    
    return {
        'area_sqft': area,
        'floors': floors,
        'design_completeness': design_completeness,
        'contractor_experience': contractor_experience,
        'inflation_rate': inflation_rate,
        'interest_rate': interest_rate,
        'energy_kwh_year': energy_kwh_year,
        'annual_energy_cost': annual_energy_cost,
        'energy_efficiency': energy_efficiency,
        'energy_efficiency_per_sqft': round(energy_efficiency_per_sqft, 2),
        'operational_co2_tons': round(operational_co2_tons, 4),
        'embodied_co2_tons': round(embodied_co2_tons, 2),
        'construction_cost_per_sqft': construction_cost_per_sqft,
        'total_construction_cost': total_construction_cost,
        'maintenance_cost_per_year': maintenance_cost_per_year,
        'cost_per_sqft_for_sustainability': round(cost_per_sqft_sustainability, 2),
        'energy_co2_impact_relative_to_cost': round(co2_impact_ratio, 6),
        'project_complexity_score': round(complexity_score, 1),
        'change_order_frequency': round(change_order_freq, 1),
    }


@router.post("/predict")
async def simplified_predict(request: SimplifiedPredictionRequest):
    """
    Simplified prediction endpoint for React frontend.
    Uses Multi-Output Lifecycle Cost Model (3 outputs).
    """
    try:
        service = get_inference_service()
        data = request.model_dump()
        
        # Calculate all derived features
        features = calculate_derived_features(data)
        
        # Run sustainability prediction
        sustainability_result = service.predict_sustainability({
            "energy_kwh_year": features['energy_kwh_year'],
            "embodied_co2_tons": features['embodied_co2_tons'],
            "operational_co2_tons": features['operational_co2_tons'],
            "energy_efficiency": features['energy_efficiency'],
            "energy_efficiency_per_sqft": features['energy_efficiency_per_sqft'],
            "cost_per_sqft_for_sustainability": features['cost_per_sqft_for_sustainability'],
            "energy_co2_impact_relative_to_cost": features['energy_co2_impact_relative_to_cost']
        })
        
        # Run multi-output lifecycle cost prediction
        lifecycle_result = service.predict_lifecycle_cost({
            "construction_cost_per_sqft": features['construction_cost_per_sqft'],
            "maintenance_cost_per_year": features['maintenance_cost_per_year'],
            "energy_kwh_year": features['energy_kwh_year'],
            "energy_efficiency": features['energy_efficiency'],
            "sustainability_score": sustainability_result['sustainability_score'],
            "energy_efficiency_per_sqft": features['energy_efficiency_per_sqft'],
            "cost_per_sqft_for_sustainability": features['cost_per_sqft_for_sustainability'],
            "energy_co2_impact_relative_to_cost": features['energy_co2_impact_relative_to_cost'],
            "area_sqft": features['area_sqft']
        })
        
        # Run risk prediction
        risk_result = service.predict_risk({
            "design_completeness": features['design_completeness'],
            "project_complexity_score": features['project_complexity_score'],
            "change_order_frequency": features['change_order_frequency'],
            "inflation_rate": features['inflation_rate'],
            "interest_rate": features['interest_rate'],
            "contractor_experience_years": features['contractor_experience']
        })
        
        # ===================================================================
        # STEP A: AI PREDICTION (FINANCIALS) - Multi-Output Model
        # ===================================================================
        if lifecycle_result.get('is_multioutput') and 'multi_output_predictions' in lifecycle_result:
            preds = lifecycle_result['multi_output_predictions']
            
            # Un-scale according to training scales
            initial_cost = preds[0] * 1_000_000           # Scaled by 1,000,000
            maintenance_cost_year = preds[1] * 100_000    # Scaled by 100,000
            sust_invest_factor = preds[2] * 10_000        # Scaled by 10,000
            
            is_ai_predicted = True
        else:
            # Fallback to formula-based calculations if model not available
            initial_cost = features['total_construction_cost']
            maintenance_cost_year = features['maintenance_cost_per_year']
            sust_invest_factor = features['cost_per_sqft_for_sustainability']
            
            is_ai_predicted = False
        
        # Calculate derived financial values
        green_features_cost = sust_invest_factor * features['area_sqft']
        maintenance_total_50yr = maintenance_cost_year * 50
        total_lifecycle_cost = initial_cost + maintenance_total_50yr
        
        # ===================================================================
        # STEP B: ENGINEERING CALCULATION (PHYSICALS) - Always use formulas
        # ===================================================================
        area_sqft = features['area_sqft']
        design_completeness = features['design_completeness']
        
        # Energy Usage (kWh/year) = Area * 12.5 kWh per sqft
        energy_usage_kwh = area_sqft * 12.5
        
        # Operational CO2 (tons/year) = Energy * emission factor
        operational_co2 = energy_usage_kwh * 0.0004
        
        # Embodied Carbon (tons) = Area * 0.05 tons per sqft
        embodied_co2 = area_sqft * 0.05
        
        # Efficiency Rating (0-100) = Design Completeness + Green Bonus
        green_bonus = 20 if green_features_cost > 500000 else (10 if green_features_cost > 250000 else 0)
        efficiency_rating = min(100, (design_completeness * 0.8) + green_bonus)
        
        # Annual energy cost
        electricity_rate = data.get('electricity_unit_cost', 45.0)
        annual_energy_cost = energy_usage_kwh * electricity_rate
        
        # ===================================================================
        # BUILD FINANCIALS OBJECT (AI-Predicted)
        # ===================================================================
        financials = {
            "initial_cost": round(initial_cost, 0),
            "maintenance_per_year": round(maintenance_cost_year, 0),
            "maintenance_total_50yr": round(maintenance_total_50yr, 0),
            "green_cost": round(green_features_cost, 0),
            "total_lifecycle_cost": round(total_lifecycle_cost, 0),
            "sust_invest_factor": round(sust_invest_factor, 2),
            "is_ai_predicted": is_ai_predicted
        }
        
        # ===================================================================
        # BUILD ENGINEERING OBJECT (Formula-Calculated)
        # ===================================================================
        engineering = {
            "energy_kwh_year": round(energy_usage_kwh, 0),
            "operational_co2_tons": round(operational_co2, 4),
            "embodied_co2_tons": round(embodied_co2, 2),
            "total_co2_tons": round(operational_co2 + embodied_co2, 2),
            "efficiency_rating": round(efficiency_rating, 1),
            "annual_energy_cost": round(annual_energy_cost, 0),
            "energy_per_sqft": 12.5,
            "green_bonus_applied": green_bonus
        }
        
        # ===================================================================
        # SMART SUGGESTIONS (Hybrid Analysis)
        # ===================================================================
        smart_suggestions = []
        
        # High long-term maintenance alert (from AI)
        if maintenance_total_50yr > initial_cost:
            smart_suggestions.append({
                "type": "alert",
                "title": "High Long-term Maintenance",
                "text": f"AI predicts maintenance (LKR {maintenance_total_50yr/1_000_000:.1f}M) exceeds initial cost. Consider higher quality materials."
            })
        
        # Green investment ratio check (from AI)
        green_ratio = green_features_cost / total_lifecycle_cost if total_lifecycle_cost > 0 else 0
        if green_ratio < 0.05:
            smart_suggestions.append({
                "type": "warning",
                "title": "Low Sustainability Investment",
                "text": f"Green features are only {green_ratio*100:.1f}% of lifecycle cost. Increasing to 10%+ improves efficiency."
            })
        elif green_ratio > 0.15:
            smart_suggestions.append({
                "type": "success",
                "title": "Strong Green Investment",
                "text": f"Excellent! {green_ratio*100:.1f}% allocated to sustainability features."
            })
        
        # High operational CO2 warning (from Engineering)
        if operational_co2 > 10:
            smart_suggestions.append({
                "type": "eco",
                "title": "High Carbon Footprint",
                "text": f"Operational CO2 is {operational_co2:.1f} tons/year. Consider solar panels or energy-efficient systems."
            })
        
        # Low efficiency warning (from Engineering)
        if efficiency_rating < 60:
            smart_suggestions.append({
                "type": "warning",
                "title": "Low Energy Efficiency",
                "text": f"Efficiency rating is {efficiency_rating:.0f}/100. Higher design completeness or green investment can improve this."
            })
        elif efficiency_rating >= 80:
            smart_suggestions.append({
                "type": "success",
                "title": "Excellent Efficiency",
                "text": f"Efficiency rating of {efficiency_rating:.0f}/100 qualifies for green building certification."
            })
        
        # High energy cost warning (from Engineering)
        if annual_energy_cost > 1_000_000:
            smart_suggestions.append({
                "type": "info",
                "title": "High Energy Costs",
                "text": f"Annual energy cost is LKR {annual_energy_cost/1_000_000:.2f}M. Consider renewable energy options."
            })
        
        # Well-balanced project success
        if risk_result['risk_level'] == 'low' and sustainability_result['sustainability_score'] >= 70:
            smart_suggestions.append({
                "type": "success",
                "title": "Well-Balanced Project",
                "text": "Low risk with good sustainability. Project parameters are well optimized."
            })
        
        # ===================================================================
        # DETERMINE RATINGS
        # ===================================================================
        score = sustainability_result['sustainability_score']
        if score >= 80:
            rating = 'Excellent'
        elif score >= 60:
            rating = 'Good'
        elif score >= 40:
            rating = 'Fair'
        else:
            rating = 'Poor'
        
        # ===================================================================
        # BUILD RESPONSE (Hybrid: AI + Engineering)
        # ===================================================================
        return {
            "success": True,
            "data": {
                # Core Predictions
                "sustainability_score": sustainability_result['sustainability_score'],
                "sustainability_rating": rating,
                "lifecycle_cost_lkr": round(total_lifecycle_cost, 0),
                "lifecycle_cost_millions": round(total_lifecycle_cost / 1_000_000, 2),
                "risk_probability": risk_result['risk_probability'],
                "risk_level": risk_result['risk_level'],
                "is_high_risk": risk_result['is_high_risk'],
                "is_high_efficiency": efficiency_rating > 75,
                
                # NEW: Separate Financials (AI) and Engineering (Formulas)
                "financials": financials,
                "engineering": engineering,
                
                # Cost breakdown for Pie Chart (from financials)
                "cost_breakdown": {
                    "initial_construction": round(initial_cost, 0),
                    "lifetime_maintenance": round(maintenance_total_50yr, 0),
                    "green_investment": round(green_features_cost, 0),
                    "is_ai_predicted": is_ai_predicted
                },
                
                # Smart suggestions
                "smart_suggestions": smart_suggestions,
                
                # Legacy format (for backwards compatibility)
                "ai_cost_breakdown": {
                    "initial_contract_value": round(initial_cost, 0),
                    "maintenance_per_year": round(maintenance_cost_year, 0),
                    "sustainability_per_sqft": round(sust_invest_factor, 2),
                    "total_sustainability": round(green_features_cost, 0),
                    "lifetime_maintenance_50yr": round(maintenance_total_50yr, 0)
                },
                
                # Legacy analysis_details (combining both)
                "analysis_details": {
                    "energy_kwh_year": round(energy_usage_kwh, 0),
                    "annual_energy_cost": round(annual_energy_cost, 0),
                    "energy_efficiency_rating": round(efficiency_rating, 1),
                    "efficiency_per_sqft": round(energy_usage_kwh / area_sqft, 2) if area_sqft > 0 else 0,
                    "embodied_co2_tons": round(embodied_co2, 2),
                    "operational_co2_tons": round(operational_co2, 4),
                    "total_co2_tons": round(embodied_co2 + operational_co2, 2),
                    "construction_cost_per_sqft": round(features['construction_cost_per_sqft'], 0),
                    "total_construction_cost": round(features['total_construction_cost'], 0),
                    "maintenance_cost_per_year": round(maintenance_cost_year, 0),
                    "sustainability_cost_per_sqft": round(sust_invest_factor, 0),
                    "project_complexity_score": features['project_complexity_score'],
                    "change_order_frequency": features['change_order_frequency']
                }
            }
        }
        
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}", exc_info=True)
        return {"success": False, "error": str(e)}


@router.get("/")
async def root():
    """API information endpoint"""
    return {
        "service": "Sustainability Prediction API",
        "version": "3.0.0",
        "status": "running",
        "endpoints": {
            "simplified_predict": "/predict",
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

