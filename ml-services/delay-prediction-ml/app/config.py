"""Application configuration"""

import os
from pathlib import Path

# Base directory
BASE_DIR = Path(__file__).resolve().parent.parent

# Models directory (where trained models and artifacts are stored)
MODELS_DIR = BASE_DIR / "models"

# ============================================================
# Ensemble Model Bundles (trained via Stacking Ensemble scripts)
# ============================================================

# Regression bundle: main_pipeline, p10_pipeline, p90_pipeline, preprocessor, feature_names
REGRESSION_BUNDLE_PATH = MODELS_DIR / "delay_regression_bundle.joblib"
REGRESSION_EXPLAINER_PATH = MODELS_DIR / "regression_explainer.joblib"

# Classification bundle: main_pipeline, preprocessor, feature_names, label_encoder
CLASSIFICATION_BUNDLE_PATH = MODELS_DIR / "delay_classification_bundle.joblib"
CLASSIFICATION_EXPLAINER_PATH = MODELS_DIR / "classification_explainer.joblib"

# Classification classes (must match label encoder output from training)
DELAY_CATEGORIES = ["No Delay", "Minor Delay", "Major Delay", "Critical Delay"]

# ============================================================
# Feature Definitions (must match training scripts exactly)
# ============================================================
NUMERIC_FEATURES = [
    'Floors', 'Contractor_Experience_Years', 'Contractor_Previous_Projects',
    'Contractor_Past_Delay_Rate', 'Labour_Pool_Size', 'Labour_Assigned_To_Project',
    'Planned_Duration_Days', 'Weather_Impact_Days', 'Design_Change_Orders',
    'Material_Delivery_Delay_Days', 'Payment_Delay_Days'
]

CATEGORICAL_FEATURES = [
    'Project_Type', 'Province', 'District', 'Location',
    'Contractor_ICTAD_Grade', 'Start_Season', 'Payment_Delay_History'
]

ALL_FEATURES = NUMERIC_FEATURES + CATEGORICAL_FEATURES

# API configuration
API_TITLE = "Construction Delay Prediction API"
API_DESCRIPTION = """
Predicts construction project delays using Stacking Ensemble ML models
(XGBoost + RandomForest + LightGBM with meta-learner).

**Features:**
- Regression: Predicts total delay days with P10/P90 quantile uncertainty
- Classification: Categorizes delay severity (No Delay, Minor, Major, Critical)
- SHAP explainability for individual predictions
"""
API_VERSION = "2.0.0"
