"""Application configuration"""

import os
from pathlib import Path

# Base directory
BASE_DIR = Path(__file__).resolve().parent.parent

# Models directory (where trained models and artifacts are stored)
MODELS_DIR = BASE_DIR / "models"

# Model file paths
REGRESSION_MODEL_PATH = MODELS_DIR / "ann_delay_model.h5"
CLASSIFICATION_MODEL_PATH = MODELS_DIR / "ann_classifier_model.h5"

# Preprocessing artifacts
REGRESSION_SCALER_PATH = MODELS_DIR / "ann_scaler.pkl"
REGRESSION_FEATURE_COLUMNS_PATH = MODELS_DIR / "ann_feature_columns.pkl"
CLASSIFICATION_SCALER_PATH = MODELS_DIR / "ann_class_scaler.pkl"
CLASSIFICATION_FEATURE_COLUMNS_PATH = MODELS_DIR / "ann_class_feature_columns.pkl"
LABEL_ENCODER_PATH = MODELS_DIR / "ann_label_encoder.pkl"

# Classification classes
DELAY_CATEGORIES = ["On-Time", "Minor Delay", "Major Delay", "Critical Delay"]

# API configuration
API_TITLE = "Construction Delay Prediction API"
API_DESCRIPTION = """
Predicts construction project delays using ANN models.

**Features:**
- Regression model to predict total delay days
- Classification model to categorize delay severity
- Support for various project attributes including district, project type, and contractor grade
"""
API_VERSION = "1.0.0"
