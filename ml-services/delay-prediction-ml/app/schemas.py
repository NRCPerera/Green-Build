"""Pydantic schemas for request/response validation"""

from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field


class DelayPredictionRequest(BaseModel):
    """Request model for delay prediction"""
    
    data: Dict[str, Any] = Field(
        ...,
        description="Project features for prediction",
        example={
            "District": "Colombo",
            "Project_Type": "Commercial Building",
            "Contractor_ICTAD_Grade": "CIDA 1",
            "Contract_Value_LKR": 500000000,
            "Land_Area_Sqft": 15000,
            "Planned_Duration_Days": 365,
            "Weather_Impact_Score": 2.5,
            "Contractor_Experience_Years": 10,
            "Labor_Availability_Score": 3.0,
            "Material_Cost_Index": 105,
            "Inflation_Rate": 0.08,
            "Rainfall_mm": 150,
            "Equipment_Availability_Score": 3.5
        }
    )


class RegressionPredictionResult(BaseModel):
    """Regression prediction result - predicts delay days"""
    
    predicted_delay_days: float = Field(
        ...,
        description="Predicted total delay days"
    )
    delay_severity: str = Field(
        ...,
        description="Human-readable severity label based on predicted days"
    )


class ClassificationPredictionResult(BaseModel):
    """Classification prediction result - predicts delay category"""
    
    predicted_category: str = Field(
        ...,
        description="Predicted delay category (On-Time, Minor Delay, Major Delay, Critical Delay)"
    )
    will_delay: Optional[bool] = Field(
        default=None,
        description="Whether the project will be delayed (binary)"
    )
    category_index: Optional[int] = Field(
        default=None,
        description="Numeric index of predicted category (0-3)"
    )
    confidence: float = Field(
        ...,
        description="Model confidence in the prediction (0-1)"
    )
    class_probabilities: Dict[str, float] = Field(
        ...,
        description="Probability for each delay category"
    )


class DelayPredictionResponse(BaseModel):
    """Response model for delay prediction"""
    
    success: bool = Field(
        default=True,
        description="Whether the prediction was successful"
    )
    prediction_type: str = Field(
        ...,
        description="Type of prediction: 'regression', 'classification', or 'full'"
    )
    regression_result: Optional[RegressionPredictionResult] = Field(
        default=None,
        description="Regression prediction result (if applicable)"
    )
    classification_result: Optional[ClassificationPredictionResult] = Field(
        default=None,
        description="Classification prediction result (if applicable)"
    )
