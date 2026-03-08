"""Pydantic schemas for request/response validation"""

from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field


class DelayPredictionRequest(BaseModel):
    """Request model for delay prediction"""
    
    data: Dict[str, Any] = Field(
        ...,
        description="Project features for prediction",
        examples=[{
            "Project_Type": "House",
            "Province": "Western",
            "District": "Colombo",
            "Location": "Colombo 03",
            "Contractor_ICTAD_Grade": "M1",
            "Start_Season": "SW Monsoon",
            "Payment_Delay_History": "Yes",
            "Floors": 3,
            "Contractor_Experience_Years": 10,
            "Contractor_Previous_Projects": 15,
            "Contractor_Past_Delay_Rate": 0.15,
            "Labour_Pool_Size": 50,
            "Labour_Assigned_To_Project": 25,
            "Planned_Duration_Days": 360,
            "Weather_Impact_Days": 25,
            "Design_Change_Orders": 2,
            "Material_Delivery_Delay_Days": 5,
            "Payment_Delay_Days": 10
        }]
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
    p10_delay_days: Optional[float] = Field(
        default=None,
        description="P10 quantile prediction (Best Case)"
    )
    p90_delay_days: Optional[float] = Field(
        default=None,
        description="P90 quantile prediction (Worst Case)"
    )
    shap_values: Optional[Dict[str, float]] = Field(
        default=None,
        description="SHAP feature importances for predictions"
    )


class ClassificationPredictionResult(BaseModel):
    """Classification prediction result - predicts delay category"""
    
    predicted_category: str = Field(
        ...,
        description="Predicted delay category (No Delay, Minor Delay, Major Delay, Critical Delay)"
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
    shap_values: Optional[Dict[str, float]] = Field(
        default=None,
        description="SHAP feature importances for predictions"
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
