"""Application configuration"""

import os
from pathlib import Path

# Base paths
BASE_DIR = Path(__file__).resolve().parent.parent
MODELS_DIR = BASE_DIR / "models"

# API Configuration
API_TITLE = "Sustainability Prediction API"
API_DESCRIPTION = """
## Sustainability Prediction API

This API provides predictions for sustainability metrics in construction projects.

### Available Models:
1. **Sustainability Score Model** - Predicts overall sustainability score
2. **Lifecycle Cost Model** - Estimates lifecycle costs
3. **Risk Prediction Model** - Assesses sustainability risks

### Features:
- Real-time predictions
- Batch processing support
- Development mode with mock predictions
"""
API_VERSION = "1.0.0"

# Model Paths
SUSTAINABILITY_MODEL_PATH = MODELS_DIR / "sustainability_model.keras"
LIFECYCLE_COST_MODEL_PATH = MODELS_DIR / "lifecycle_cost_model.keras"
RISK_PREDICTION_MODEL_PATH = MODELS_DIR / "risk_prediction_model.keras"

# Feature Scaler Path (if you have one)
FEATURE_SCALER_PATH = MODELS_DIR / "feature_scaler.pkl"

# Feature Names Path (if you have one)
FEATURE_NAMES_PATH = MODELS_DIR / "feature_names.pkl"

# Categorical Mappings Path (if you have one)
CATEGORICAL_MAPPINGS_PATH = MODELS_DIR / "categorical_mappings.pkl"

# Medians and Modes for preprocessing (if you have them)
NUMERIC_MEDIANS_PATH = MODELS_DIR / "numeric_medians.pkl"
CATEGORICAL_MODES_PATH = MODELS_DIR / "categorical_modes.pkl"