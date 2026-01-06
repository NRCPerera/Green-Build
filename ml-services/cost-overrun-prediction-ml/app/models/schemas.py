"""Pydantic schemas for request/response validation"""

from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field


class PredictionRequest(BaseModel):
    """Request model for cost overrun prediction"""
    
    data: Dict[str, Any] = Field(
        ...,
        description="Project features for prediction",
        example={
            "project_type": "Residential",
            "contract_type": "Fixed Price",
            "project_size_sqft": 5000.0,
            "duration_months": 12.0,
            "location": "Urban",
            "complexity": "Medium"
        }
    )
    explain: bool = Field(
        default=False,
        description="Whether to include SHAP explanations in the response"
    )
    top_n: int = Field(
        default=6,
        ge=1,
        le=50,
        description="Number of top SHAP features to return"
    )


class ShapFeature(BaseModel):
    """SHAP feature impact"""
    
    feature: str = Field(..., description="Feature name")
    impact: float = Field(..., description="SHAP value (absolute impact)")
    direction: str = Field(..., description="Impact direction: 'increase' or 'decrease'")


class PredictionResult(BaseModel):
    """Prediction result details"""
    
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
        description="Threshold used for high risk classification"
    )
    shap_explanation: Optional[List[ShapFeature]] = Field(
        default=None,
        description="SHAP feature importance explanation (only if explain=True)"
    )


class PredictionResponse(BaseModel):
    """Response model for cost overrun prediction"""
    
    success: bool = Field(
        default=True,
        description="Whether the prediction was successful"
    )
    prediction: PredictionResult = Field(
        ...,
        description="Prediction results"
    )
