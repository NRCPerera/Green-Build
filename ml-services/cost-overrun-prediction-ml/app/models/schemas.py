"""Request and response schemas"""

from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class PredictionRequest(BaseModel):
    """Request schema for cost overrun prediction"""
    
    data: Dict[str, Any] = Field(
        ...,
        description="Project features as key-value pairs",
        example={
            "project_size": 5000000,
            "duration_months": 18,
            "project_type": "Commercial",
            "location": "Urban",
            "contractor_experience": "High"
        }
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "data": {
                    "project_size": 5000000,
                    "duration_months": 18,
                    "project_type": "Commercial",
                    "location": "Urban",
                    "contractor_experience": "High",
                    "weather_risk": "Medium"
                }
            }
        }


class PredictionResponse(BaseModel):
    """Response schema for cost overrun prediction"""
    
    predicted_cost_overrun_pct: float = Field(
        ...,
        description="Predicted cost overrun percentage"
    )
    overrun_probability: float = Field(
        ...,
        description="Probability of cost overrun (0-1)"
    )
    high_risk_label: bool = Field(
        ...,
        description="Whether the project is classified as high risk"
    )
    threshold: float = Field(
        ...,
        description="Classification threshold used"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "predicted_cost_overrun_pct": 15.5,
                "overrun_probability": 0.78,
                "high_risk_label": True,
                "threshold": 0.5
            }
        }
