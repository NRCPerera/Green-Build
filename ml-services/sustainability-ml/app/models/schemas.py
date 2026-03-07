"""Pydantic schemas for request and response validation - Matching actual model features"""

from typing import List, Optional
from pydantic import BaseModel, Field


# ============================================================================
# SUSTAINABILITY SCORE MODEL
# ============================================================================

class SustainabilityPredictionRequest(BaseModel):
    """Request model for sustainability score prediction"""
    
    energy_kwh_year: float = Field(..., description="Annual energy consumption in kWh")
    embodied_co2_tons: float = Field(..., description="Embodied CO2 in tons")
    operational_co2_tons: float = Field(..., description="Operational CO2 in tons per year")
    energy_efficiency: float = Field(..., description="Energy efficiency rating (0-100)")
    energy_efficiency_per_sqft: float = Field(..., description="Energy efficiency per square foot")
    cost_per_sqft_for_sustainability: float = Field(..., description="Cost per sqft for sustainability features")
    energy_co2_impact_relative_to_cost: float = Field(..., description="Energy CO2 impact relative to cost")
    
    class Config:
        json_schema_extra = {
            "example": {
                "energy_kwh_year": 15000.0,
                "embodied_co2_tons": 45.0,
                "operational_co2_tons": 12.0,
                "energy_efficiency": 75.0,
                "energy_efficiency_per_sqft": 0.85,
                "cost_per_sqft_for_sustainability": 250.0,
                "energy_co2_impact_relative_to_cost": 0.15
            }
        }


class SustainabilityPredictionResponse(BaseModel):
    """Response model for sustainability score prediction"""
    
    sustainability_score: float = Field(..., description="Predicted sustainability score (0-100)")
    interpretation: str = Field(..., description="Human-readable interpretation")
    
    class Config:
        json_schema_extra = {
            "example": {
                "sustainability_score": 78.5,
                "interpretation": "Good sustainability rating"
            }
        }


# ============================================================================
# LIFECYCLE COST MODEL
# ============================================================================

class LifecycleCostRequest(BaseModel):
    """Request model for lifecycle cost prediction"""
    
    construction_cost_per_sqft: float = Field(..., description="Construction cost per square foot (LKR)")
    maintenance_cost_per_year: float = Field(..., description="Annual maintenance cost (LKR)")
    energy_kwh_year: float = Field(..., description="Annual energy consumption in kWh")
    energy_efficiency: float = Field(..., description="Energy efficiency rating (0-100)")
    sustainability_score: float = Field(..., description="Sustainability score (0-100)")
    energy_efficiency_per_sqft: float = Field(..., description="Energy efficiency per square foot")
    cost_per_sqft_for_sustainability: float = Field(..., description="Cost per sqft for sustainability features")
    energy_co2_impact_relative_to_cost: float = Field(..., description="Energy CO2 impact relative to cost")
    
    class Config:
        json_schema_extra = {
            "example": {
                "construction_cost_per_sqft": 12000.0,
                "maintenance_cost_per_year": 150000.0,
                "energy_kwh_year": 15000.0,
                "energy_efficiency": 75.0,
                "sustainability_score": 72.0,
                "energy_efficiency_per_sqft": 0.85,
                "cost_per_sqft_for_sustainability": 250.0,
                "energy_co2_impact_relative_to_cost": 0.15
            }
        }


class LifecycleCostResponse(BaseModel):
    """Response model for lifecycle cost prediction"""
    
    lifecycle_cost_millions_lkr: float = Field(..., description="Total lifecycle cost in millions LKR")
    lifecycle_cost_lkr: float = Field(..., description="Total lifecycle cost in LKR")
    interpretation: str = Field(..., description="Cost interpretation")
    
    class Config:
        json_schema_extra = {
            "example": {
                "lifecycle_cost_millions_lkr": 25.5,
                "lifecycle_cost_lkr": 25500000.0,
                "interpretation": "Moderate lifecycle cost"
            }
        }


# ============================================================================
# RISK PREDICTION MODEL
# ============================================================================

class RiskPredictionRequest(BaseModel):
    """Request model for project risk prediction"""
    
    design_completeness: float = Field(..., ge=0, le=100, description="Design completeness percentage (0-100)")
    project_complexity_score: float = Field(..., ge=0, le=100, description="Project complexity score (0-100)")
    change_order_frequency: float = Field(..., ge=0, description="Expected change order frequency")
    inflation_rate: float = Field(..., description="Current inflation rate (%)")
    interest_rate: float = Field(..., description="Current interest rate (%)")
    contractor_experience_years: float = Field(..., ge=0, description="Contractor experience in years")
    
    class Config:
        json_schema_extra = {
            "example": {
                "design_completeness": 85.0,
                "project_complexity_score": 65.0,
                "change_order_frequency": 3.5,
                "inflation_rate": 6.5,
                "interest_rate": 12.0,
                "contractor_experience_years": 15.0
            }
        }


class RiskPredictionResponse(BaseModel):
    """Response model for risk prediction"""
    
    is_high_risk: bool = Field(..., description="Whether project is high risk")
    risk_probability: float = Field(..., description="Probability of high risk (0-1)")
    risk_level: str = Field(..., description="Risk level: low, medium, high")
    recommendations: List[str] = Field(..., description="Risk mitigation recommendations")
    
    class Config:
        json_schema_extra = {
            "example": {
                "is_high_risk": False,
                "risk_probability": 0.35,
                "risk_level": "medium",
                "recommendations": ["Increase design completeness", "Consider more experienced contractor"]
            }
        }


# ============================================================================
# COMBINED ANALYSIS
# ============================================================================

class FullAnalysisRequest(BaseModel):
    """Request model for full sustainability analysis (all 3 models)"""
    
    # Sustainability model features
    energy_kwh_year: float = Field(..., description="Annual energy consumption in kWh")
    embodied_co2_tons: float = Field(..., description="Embodied CO2 in tons")
    operational_co2_tons: float = Field(..., description="Operational CO2 in tons per year")
    energy_efficiency: float = Field(..., description="Energy efficiency rating (0-100)")
    energy_efficiency_per_sqft: float = Field(..., description="Energy efficiency per square foot")
    cost_per_sqft_for_sustainability: float = Field(..., description="Cost per sqft for sustainability")
    energy_co2_impact_relative_to_cost: float = Field(..., description="Energy CO2 impact relative to cost")
    
    # Additional lifecycle cost features
    construction_cost_per_sqft: float = Field(..., description="Construction cost per sqft (LKR)")
    maintenance_cost_per_year: float = Field(..., description="Annual maintenance cost (LKR)")
    
    # Risk model features
    design_completeness: float = Field(..., ge=0, le=100, description="Design completeness (%)")
    project_complexity_score: float = Field(..., ge=0, le=100, description="Project complexity score")
    change_order_frequency: float = Field(..., ge=0, description="Change order frequency")
    inflation_rate: float = Field(..., description="Inflation rate (%)")
    interest_rate: float = Field(..., description="Interest rate (%)")
    contractor_experience_years: float = Field(..., ge=0, description="Contractor experience (years)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "energy_kwh_year": 15000.0,
                "embodied_co2_tons": 45.0,
                "operational_co2_tons": 12.0,
                "energy_efficiency": 75.0,
                "energy_efficiency_per_sqft": 0.85,
                "cost_per_sqft_for_sustainability": 250.0,
                "energy_co2_impact_relative_to_cost": 0.15,
                "construction_cost_per_sqft": 12000.0,
                "maintenance_cost_per_year": 150000.0,
                "design_completeness": 85.0,
                "project_complexity_score": 65.0,
                "change_order_frequency": 3.5,
                "inflation_rate": 6.5,
                "interest_rate": 12.0,
                "contractor_experience_years": 15.0
            }
        }


class FullAnalysisResponse(BaseModel):
    """Response model for full analysis"""
    
    # Sustainability results
    sustainability_score: float
    sustainability_interpretation: str
    
    # Lifecycle cost results
    lifecycle_cost_millions_lkr: float
    lifecycle_cost_lkr: float
    lifecycle_interpretation: str
    
    # Risk results
    is_high_risk: bool
    risk_probability: float
    risk_level: str
    risk_recommendations: List[str]


class HealthResponse(BaseModel):
    """Health check response"""
    
    status: str = Field(..., description="API health status")
    mode: str = Field(..., description="Running mode (development/production)")
    models_loaded: bool = Field(..., description="Whether models are loaded")