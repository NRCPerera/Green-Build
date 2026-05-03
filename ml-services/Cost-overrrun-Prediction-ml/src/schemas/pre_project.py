from __future__ import annotations

from pydantic import BaseModel, Field


class RiskFactor(BaseModel):
    """Individual risk factor with SHAP value impact."""
    
    feature: str = Field(..., description="Feature name")
    impact: float = Field(..., description="Absolute SHAP value (impact magnitude)")


class RiskScorecardItem(BaseModel):
    """Risk scorecard item with feature value, impact level, and action recommendation."""
    
    feature: str = Field(..., description="Feature name")
    feature_value: float | int | str = Field(..., description="Actual value from input")
    impact: str = Field(..., description="Impact level: High, Medium, or Low")
    status: str = Field(..., description="Action recommendation with emoji indicator")


class PreProjectRequest(BaseModel):
    """Request model for pre-project cost overrun prediction."""
    
    # Categorical features
    Project_Type: str = Field(..., description="Type of project")
    Province: str = Field(..., description="Province/region")
    District: str = Field(..., description="District")
    CIDA_Grade: str = Field(..., description="CIDA grade")
    Season: str = Field(..., description="Season of project start")
    
    # Integer features
    Floors: int = Field(..., description="Number of floors")
    Area_SQFT: int = Field(..., description="Total area in square feet")
    Year_of_Tender: int = Field(..., description="Year of tender")
    Contractor_Experience_Years: int = Field(..., description="Years of contractor experience")
    Complexity_Score: int = Field(..., description="Complexity score")
    Change_Order_Freq: int = Field(..., description="Frequency of change orders")
    Start_Month: int = Field(..., description="Month of project start (1-12)")
    Start_Quarter: int = Field(..., description="Quarter of project start (1-4)")
    Start_Weekday: int = Field(..., description="Day of week project starts (0-6)")
    
    # Float features
    Initial_Period_Months: float = Field(..., description="Initial planned period in months")
    Inflation_Rate: float = Field(..., description="Inflation rate")
    Exchange_Rate_LKR: float = Field(..., description="Exchange rate (LKR)")
    Material_Index: float = Field(..., description="Material price index")
    Design_Completeness: float = Field(..., description="Design completeness percentage")
    Project_Size_Index: float = Field(..., description="Project size index")
    Economic_Risk_Index: float = Field(..., description="Economic risk index")
    Design_Risk_Score: float = Field(..., description="Design risk score")
    Contractor_Risk_Score: float = Field(..., description="Contractor risk score")
    Weather_Risk_Score: float = Field(..., description="Weather risk score")
    Rate_per_SQFT: float = Field(..., description="Cost rate per square foot")
    Initial_Value: float = Field(..., description="Initial project value")


class PreProjectResponse(BaseModel):
    """Response model for pre-project cost overrun prediction."""
    
    predicted_cost_overrun_pct: float = Field(
        ..., 
        description="Predicted cost overrun percentage from regression model."
    )
    predicted_high_risk_class: int = Field(
        ..., 
        description="Binary risk class from classification model (0=Low, 1=High)."
    )
    predicted_high_risk_probability: float = Field(
        ..., 
        description="Probability of high risk (0.0 to 1.0) from classification model."
    )
    top_risk_factors: list[RiskFactor] = Field(
        ..., 
        description="Top 5-10 features contributing to risk prediction, ranked by SHAP impact."
    )
    risk_scorecard: list[RiskScorecardItem] = Field(
        ...,
        description="Top 5 risk factors with categorized impact levels and action recommendations."
    )
    model_version: str = Field(..., description="Model version identifier.")


class BatchItemResult(BaseModel):
    index: int
    data: PreProjectResponse

class BatchItemError(BaseModel):
    index: int
    error: str

class PreProjectBatchResponse(BaseModel):
    results: list[BatchItemResult]
    errors: list[BatchItemError]
