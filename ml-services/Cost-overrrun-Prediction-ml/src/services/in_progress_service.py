from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np

from app.loaders import InProgressArtifacts
from src.utils.io import build_single_row_dataframe, find_missing_fields


@dataclass
class MissingFieldsError(Exception):
    missing_fields: list[str]


def _map_risk_label(predicted_overrun_pct: float) -> str:
    if predicted_overrun_pct >= 15:
        return "HIGH"
    if predicted_overrun_pct >= 5:
        return "MEDIUM"
    return "LOW"


def predict_in_progress(payload: dict[str, Any], artifacts: InProgressArtifacts) -> dict[str, Any]:
    sanitized_payload = {k: v for k, v in payload.items() if k != "project_id"}
    feature_cols = list(artifacts.metadata["feature_cols"])

    missing_fields = find_missing_fields(sanitized_payload, feature_cols)
    if missing_fields:
        raise MissingFieldsError(missing_fields=missing_fields)

    input_df = build_single_row_dataframe(sanitized_payload, feature_cols)
    transformed = artifacts.preprocess.transform(input_df)
    scaled = artifacts.scaler.transform(transformed)

    reg_pred = float(np.asarray(artifacts.ann_reg_model.predict(scaled, verbose=0)).ravel()[0])
    risk_label = _map_risk_label(reg_pred)

    return {
        "forecast_final_cost_overrun_pct_p50": reg_pred,
        "risk_label": risk_label,
        "model_version": "in_progress_v1",
    }
