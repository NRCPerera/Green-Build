"""Application configuration"""

import os
from pathlib import Path

# Base directory
BASE_DIR = Path(__file__).resolve().parent.parent

# Models directory
MODELS_DIR = BASE_DIR / "models"

# Model file paths
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
