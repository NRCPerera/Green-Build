"""Application configuration"""

import os
from pathlib import Path

# Base directory
BASE_DIR = Path(__file__).resolve().parent.parent

# Models directory
MODELS_DIR = BASE_DIR / "app" / "models"

# New model file paths (updated models)
REGRESSION_MODEL_PATH = MODELS_DIR / "cost_overrun_regression_model.keras"
CLASSIFICATION_MODEL_PATH = MODELS_DIR / "cost_overrun_classification_model.keras"
PREPROCESSOR_PATH = MODELS_DIR / "preprocessor.joblib"
FEATURE_COLUMNS_PATH = MODELS_DIR / "feature_columns.joblib"
FEATURE_NAMES_ENCODED_PATH = MODELS_DIR / "feature_names_encoded.joblib"
SHAP_BACKGROUND_PATH = MODELS_DIR / "shap_background.joblib"
REGRESSION_METRICS_PATH = MODELS_DIR / "regression_metrics.joblib"
CLASSIFICATION_METRICS_PATH = MODELS_DIR / "classification_metrics.joblib"

# Legacy model paths (for backward compatibility, can be removed later)
ANN_REGRESSION_MODEL_PATH = MODELS_DIR / "ann_regression_model.keras"
ANN_CLASSIFICATION_MODEL_PATH = MODELS_DIR / "ann_classification_model.keras"
FEATURE_SCALER_PATH = MODELS_DIR / "feature_scaler.joblib"
FEATURE_NAMES_PATH = MODELS_DIR / "feature_names.joblib"
CATEGORICAL_MAPPINGS_PATH = MODELS_DIR / "categorical_mappings.joblib"
NUMERIC_MEDIANS_PATH = MODELS_DIR / "numeric_medians.joblib"
CATEGORICAL_MODES_PATH = MODELS_DIR / "categorical_modes.joblib"

# Model configuration
CLASSIFICATION_THRESHOLD = 0.5

# API configuration
API_TITLE = "Cost Overrun Prediction API"
API_DESCRIPTION = "Predicts construction project cost overruns using ANN models"
API_VERSION = "1.0.0"
