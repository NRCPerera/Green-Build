"""Pydantic schemas for request and response validation"""

from typing import List, Optional
from pydantic import BaseModel, Field


class SustainabilityPredictionRequest(BaseModel):
    """Request model for sustainability score prediction"""
    
    # Add your actual features here based on your model
    # These are examples - modify according to your model's input features
    material_type: Optional[str] = Field(None, description="Type of construction material")
    energy_efficiency: Optional[float] = Field(None, description="Energy efficiency rating")
    water_usage: Optional[float] = Field(None, description="Estimated water usage")
    carbon_footprint: Optional[float] = Field(None, description="Carbon footprint estimate")
    renewable_energy_percentage: Optional[float] = Field(None, description="Percentage of renewable energy")
    waste_management_score: Optional[float] = Field(None, description="Waste management score")
    
    class Config:
        json_schema_extra = {
            "example": {
                "material_type": "recycled_steel",
                "energy_efficiency": 85.5,
                "water_usage": 1200.0,
                "carbon_footprint": 450.0,
                "renewable_energy_percentage": 60.0,
                "waste_management_score": 75.0
            }
        }


class SustainabilityPredictionResponse(BaseModel):
    """Response model for sustainability score prediction"""
    
    sustainability_score: float = Field(..., description="Predicted sustainability score (0-100)")
    confidence: float = Field(..., description="Prediction confidence level")
    interpretation: str = Field(..., description="Human-readable interpretation")
    
    class Config:
        json_schema_extra = {
            "example": {
                "sustainability_score": 78.5,
                "confidence": 0.92,
                "interpretation": "Good sustainability rating"
            }
        }


class LifecycleCostRequest(BaseModel):
    """Request model for lifecycle cost prediction"""
    
    project_size: Optional[float] = Field(None, description="Project size in square meters")
    building_type: Optional[str] = Field(None, description="Type of building")
    material_quality: Optional[str] = Field(None, description="Material quality grade")
    energy_systems: Optional[str] = Field(None, description="Energy systems installed")
    maintenance_plan: Optional[str] = Field(None, description="Maintenance plan type")
    
    class Config:
        json_schema_extra = {
            "example": {
                "project_size": 5000.0,
                "building_type": "commercial",
                "material_quality": "premium",
                "energy_systems": "solar_hvac",
                "maintenance_plan": "comprehensive"
            }
        }


class LifecycleCostResponse(BaseModel):
    """Response model for lifecycle cost prediction"""
    
    total_lifecycle_cost: float = Field(..., description="Total lifecycle cost estimate")
    annual_operating_cost: float = Field(..., description="Annual operating cost")
    maintenance_cost: float = Field(..., description="Maintenance cost over lifetime")
    currency: str = Field(default="USD", description="Currency of cost estimates")
    
    class Config:
        json_schema_extra = {
            "example": {
                "total_lifecycle_cost": 2500000.0,
                "annual_operating_cost": 125000.0,
                "maintenance_cost": 750000.0,
                "currency": "USD"
            }
        }


class RiskPredictionRequest(BaseModel):
    """Request model for sustainability risk prediction"""
    
    location: Optional[str] = Field(None, description="Project location")
    climate_zone: Optional[str] = Field(None, description="Climate zone")
    regulatory_compliance: Optional[float] = Field(None, description="Regulatory compliance score")
    environmental_impact: Optional[float] = Field(None, description="Environmental impact score")
    
    class Config:
        json_schema_extra = {
            "example": {
                "location": "coastal",
                "climate_zone": "tropical",
                "regulatory_compliance": 85.0,
                "environmental_impact": 65.0
            }
        }


class RiskPredictionResponse(BaseModel):
    """Response model for risk prediction"""
    
    risk_level: str = Field(..., description="Risk level: low, medium, high")
    risk_score: float = Field(..., description="Numerical risk score (0-100)")
    risk_factors: List[str] = Field(..., description="List of identified risk factors")
    recommendations: List[str] = Field(..., description="Risk mitigation recommendations")
    
    class Config:
        json_schema_extra = {
            "example": {
                "risk_level": "medium",
                "risk_score": 45.5,
                "risk_factors": ["Climate variability", "Regulatory changes"],
                "recommendations": ["Implement climate adaptation measures", "Regular compliance audits"]
            }
        }


class HealthResponse(BaseModel):
    """Health check response"""
    
    status: str = Field(..., description="API health status")
    mode: str = Field(..., description="Running mode (development/production)")
    models_loaded: bool = Field(..., description="Whether models are loaded")
    version: str = Field(..., description="API version")
