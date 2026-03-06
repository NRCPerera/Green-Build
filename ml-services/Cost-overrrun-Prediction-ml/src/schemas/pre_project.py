from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class PreProjectRequest(BaseModel):
    model_config = ConfigDict(extra="allow")


class PreProjectResponse(BaseModel):
    predicted_cost_overrun_percentage: float = Field(
        ..., description="Predicted cost overrun percentage from regression model."
    )
    predicted_high_risk_project: int = Field(
        ..., description="Binary risk class from classification model (0/1)."
    )
    risk_label: str = Field(..., description="Mapped risk label based on classifier output.")
    model_version: str = Field(..., description="Model version identifier.")


class PreProjectPayloadExample(BaseModel):
    """Optional schema helper for docs/examples."""

    payload: dict[str, Any]
