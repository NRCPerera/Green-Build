from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np

from app.loaders import PreProjectArtifacts
from src.utils.io import build_single_row_dataframe, find_missing_fields


@dataclass
class MissingFieldsError(Exception):
    missing_fields: list[str]


def predict_pre_project(payload: dict[str, Any], artifacts: PreProjectArtifacts) -> dict[str, Any]:
    feature_cols = list(artifacts.metadata["feature_cols"])
    missing_fields = find_missing_fields(payload, feature_cols)
    if missing_fields:
        raise MissingFieldsError(missing_fields=missing_fields)

    input_df = build_single_row_dataframe(payload, feature_cols)
    transformed = artifacts.preprocess.transform(input_df)
    scaled = artifacts.scaler.transform(transformed)

    reg_pred = float(np.asarray(artifacts.ann_reg_model.predict(scaled, verbose=0)).ravel()[0])
    clf_prob = float(np.asarray(artifacts.ann_clf_model.predict(scaled, verbose=0)).ravel()[0])

    high_risk = int(clf_prob >= 0.5)
    risk_label = "HIGH" if high_risk == 1 else "LOW"

    return {
        "predicted_cost_overrun_percentage": reg_pred,
        "predicted_high_risk_project": high_risk,
        "risk_label": risk_label,
        "model_version": "pre_project_v1",
    }
