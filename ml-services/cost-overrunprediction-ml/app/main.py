import logging
import os
from pathlib import Path
from typing import Any, Dict, Iterable, List

import joblib
import numpy as np
import pandas as pd
import tensorflow as tf
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator

os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")
logger = logging.getLogger("uvicorn.error")

MODELS_DIR = Path(__file__).resolve().parent / "models"
CLASSIFICATION_THRESHOLD = 0.5


def _load_artifacts():
    """Load all model artifacts once at startup."""
    try:
        regression_model = tf.keras.models.load_model(MODELS_DIR / "ann_regression_model.keras")
        classification_model = tf.keras.models.load_model(MODELS_DIR / "ann_classification_model.keras")
        feature_scaler = joblib.load(MODELS_DIR / "feature_scaler.joblib")
        feature_names = list(joblib.load(MODELS_DIR / "feature_names.joblib"))
        categorical_mappings = joblib.load(MODELS_DIR / "categorical_mappings.joblib")
        numeric_medians = joblib.load(MODELS_DIR / "numeric_medians.joblib")
        categorical_modes = joblib.load(MODELS_DIR / "categorical_modes.joblib")
    except Exception as exc:  # pragma: no cover - startup should fail fast
        logger.exception("Failed to load model artifacts")
        raise RuntimeError("Unable to load model artifacts") from exc

    return (
        regression_model,
        classification_model,
        feature_scaler,
        feature_names,
        categorical_mappings,
        numeric_medians,
        categorical_modes,
    )


(
    REGRESSION_MODEL,
    CLASSIFICATION_MODEL,
    FEATURE_SCALER,
    FEATURE_NAMES,
    CATEGORICAL_MAPPINGS,
    NUMERIC_MEDIANS,
    CATEGORICAL_MODES,
) = _load_artifacts()

app = FastAPI(title="Cost Overrun Prediction API", version="1.0.0")


def _is_missing(value: Any) -> bool:
    """Return True for None, NaN, empty string, or pandas NA."""
    if value is None:
        return True
    if isinstance(value, str) and value.strip() == "":
        return True
    return pd.isna(value)


def _allowed_categories(mapping: Any) -> Iterable[Any]:
    if isinstance(mapping, dict):
        return mapping.keys()
    if isinstance(mapping, (list, tuple, set, np.ndarray, pd.Series)):
        return mapping
    return []


class RawPredictionRequest(BaseModel):
    features: Dict[str, Any] = Field(..., description="Raw input features as key-value pairs.")

    @field_validator("features")
    @classmethod
    def validate_features(cls, value: Dict[str, Any]) -> Dict[str, Any]:
        if not isinstance(value, dict) or not value:
            raise ValueError("features must be a non-empty object")
        return value


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=400,
        content={"detail": "Invalid request payload", "errors": exc.errors()},
    )


@app.get("/")
async def health_check():
    return {"status": "ok"}


def _preprocess(payload: Dict[str, Any]) -> np.ndarray:
    try:
        df = pd.DataFrame([payload])

        categorical_cols: List[str] = sorted(
            set(CATEGORICAL_MAPPINGS.keys()) | set(CATEGORICAL_MODES.keys())
        )

        for col, median in NUMERIC_MEDIANS.items():
            if col not in df.columns:
                df[col] = np.nan
            df[col] = pd.to_numeric(df[col], errors="coerce")
            df[col] = df[col].where(~df[col].apply(_is_missing), median)

        for col, mode_value in CATEGORICAL_MODES.items():
            if col not in df.columns:
                df[col] = pd.NA
            df[col] = df[col].astype("object")
            df[col] = df[col].where(~df[col].apply(_is_missing), mode_value)

        for col, mapping in CATEGORICAL_MAPPINGS.items():
            if col not in df.columns:
                df[col] = CATEGORICAL_MODES.get(col, pd.NA)
            value = df.at[0, col]
            if _is_missing(value):
                continue
            allowed = set(_allowed_categories(mapping))
            if value not in allowed:
                allowed_sorted = sorted(allowed)
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid category '{value}' for '{col}'. Allowed: {allowed_sorted}",
                )

        df_encoded = pd.get_dummies(df, columns=categorical_cols, drop_first=True)
        df_aligned = df_encoded.reindex(columns=FEATURE_NAMES, fill_value=0)

        scaled = FEATURE_SCALER.transform(df_aligned)
        return np.asarray(scaled, dtype=np.float32)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Preprocessing failed")
        raise HTTPException(status_code=500, detail="Failed to preprocess input data") from exc


def _predict(features: np.ndarray) -> Dict[str, Any]:
    try:
        reg_output = REGRESSION_MODEL.predict(features, verbose=0)
        clf_output = CLASSIFICATION_MODEL.predict(features, verbose=0)
    except Exception as exc:
        logger.exception("Model inference failed")
        raise HTTPException(status_code=500, detail="Model inference failed") from exc

    predicted_cost_overrun_pct = float(reg_output[0][0])
    overrun_probability = float(clf_output[0][0])
    high_risk_label = overrun_probability >= CLASSIFICATION_THRESHOLD

    return {
        "predicted_cost_overrun_pct": predicted_cost_overrun_pct,
        "overrun_probability": overrun_probability,
        "high_risk_label": high_risk_label,
        "threshold": CLASSIFICATION_THRESHOLD,
    }


@app.post("/predict/raw")
async def predict_raw(request: RawPredictionRequest):
    features = _preprocess(request.features)
    return _predict(features)


if __name__ == "__main__":  # pragma: no cover - manual execution helper
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))
