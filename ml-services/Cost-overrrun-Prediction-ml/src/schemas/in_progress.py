from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class InProgressRequest(BaseModel):
    model_config = ConfigDict(extra="allow")


class InProgressResponse(BaseModel):
    forecast_final_cost_overrun_pct_p50: float = Field(
        ..., description="Forecast final overrun percentage (P50 estimate)."
    )
    risk_label: str = Field(..., description="Risk label from threshold-based mapping.")
    model_version: str = Field(..., description="Model version identifier.")


class InProgressPayloadExample(BaseModel):
    """Optional schema helper for docs/examples."""

    payload: dict[str, Any]
