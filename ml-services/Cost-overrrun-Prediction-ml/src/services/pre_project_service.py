from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np
import pandas as pd

from app.loaders import PreProjectArtifacts


@dataclass
class MissingFieldsError(Exception):
    missing_fields: list[str]


# Status mapping for common risk features
STATUS_MAPPING = {
    "Contractor_Risk_Score": "🔴 Review Contractor",
    "Change_Order_Freq": "🟡 Reduce Change Orders",
    "Design_Completeness": "🟡 Improve Design",
    "Economic_Risk_Index": "🟠 Monitor Economics",
}


def _get_impact_level(shap_value: float) -> str:
    """Categorize SHAP value magnitude into impact level."""
    abs_value = abs(shap_value)
    if abs_value >= 0.07:
        return "High"
    elif abs_value >= 0.03:
        return "Medium"
    else:
        return "Low"


def _get_status_recommendation(feature_name: str) -> str:
    """Get action recommendation for a feature."""
    return STATUS_MAPPING.get(feature_name, "📋 Monitor Impact")


def _get_original_feature_value(feature_name: str, payload: dict[str, Any], df_original: pd.DataFrame) -> float | int | str:
    """
    Get the original feature value before encoding.
    For one-hot encoded features, try to find the original categorical value.
    """
    # First, try to get directly from payload
    if feature_name in payload:
        return payload[feature_name]
    
    # For one-hot encoded features, check if it's an encoded column
    # Try to extract base feature name
    for orig_col in df_original.columns:
        if orig_col in feature_name or feature_name.startswith(orig_col):
            if feature_name in df_original.columns:
                return df_original[feature_name].iloc[0]
    
    return 0.0


def predict_pre_project(payload: dict[str, Any], artifacts: PreProjectArtifacts) -> dict[str, Any]:
    """
    Predict cost overrun for pre-project using trained models.
    
    1. Creates a DataFrame from payload
    2. One-hot encodes categorical features
    3. Aligns features with model_feature_names using .reindex()
    4. Makes predictions with regressor and classifier
    5. Computes SHAP values for feature importance
    6. Returns predictions, risk factors, and risk scorecard
    """
    
    # Categorical features to encode
    categorical_features = ["Project_Type", "Province", "District", "CIDA_Grade", "Season"]
    
    # Create DataFrame from payload (keep for original value lookup)
    df_original = pd.DataFrame([payload])
    
    # One-hot encode categorical features (model was trained without drop_first)
    df_encoded = pd.get_dummies(df_original, columns=categorical_features, drop_first=False)
    
    # Align features with model_feature_names.joblib using reindex
    df_aligned = df_encoded.reindex(columns=artifacts.feature_names, fill_value=0)
    
    # Verify all required features are present
    missing_cols = [col for col in artifacts.feature_names if col not in df_aligned.columns]
    if missing_cols:
        raise ValueError(f"Missing required features after alignment: {missing_cols}")
    
    # Make predictions with regressor (cost overrun percentage)
    reg_pred = float(artifacts.regressor_model.predict(df_aligned)[0])
    
    # Make predictions with classifier (high risk, 0 or 1)
    clf_pred_class = int(artifacts.classifier_model.predict(df_aligned)[0])
    
    # Get prediction probability from classifier
    clf_pred_proba = artifacts.classifier_model.predict_proba(df_aligned)
    # proba returns [[prob_class_0, prob_class_1]], so we get the prob of class 1
    clf_pred_prob = float(clf_pred_proba[0][1])
    
    top_risk_factors = []
    risk_scorecard = []

    if artifacts.shap_explainer is not None:
        shap_values = artifacts.shap_explainer.shap_values(df_aligned)

        # Handle different SHAP output formats
        if isinstance(shap_values, list):
            # For binary classification, shap_values is a list with 2 elements
            # shap_values[1] corresponds to class 1 (high risk)
            shap_values_class1 = shap_values[1]
        else:
            # If SHAP values are 3D or 2D array, handle appropriately
            if len(shap_values.shape) == 3:
                # 3D array: [sample, feature, class] - use class 1
                shap_values_class1 = shap_values[:, :, 1]
            else:
                # 2D array: [sample, feature]
                shap_values_class1 = shap_values

        # Extract SHAP values for the single sample (first row)
        sample_shap_values = shap_values_class1[0] if isinstance(shap_values_class1, np.ndarray) else shap_values_class1

        # Get absolute values and find top features
        abs_shap_values = np.abs(sample_shap_values)
        top_indices = np.argsort(abs_shap_values)[::-1][:10]  # Top 10 for risk factors
        top_5_indices = np.argsort(abs_shap_values)[::-1][:5]  # Top 5 for scorecard

        # Build top risk factors list (based on top 10)
        for idx in top_indices:
            if idx < len(artifacts.feature_names):
                feature_name = artifacts.feature_names[idx]
                impact = float(abs_shap_values[idx])
                top_risk_factors.append({
                    "feature": feature_name,
                    "impact": impact,
                })

        # Build risk scorecard (based on top 5)
        for idx in top_5_indices:
            if idx < len(artifacts.feature_names):
                feature_name = artifacts.feature_names[idx]
                shap_value = float(sample_shap_values[idx])

                # Get feature value from original payload or encoded dataframe
                feature_value = _get_original_feature_value(feature_name, payload, df_aligned)

                # Categorize impact level
                impact_level = _get_impact_level(shap_value)

                # Get status recommendation
                status = _get_status_recommendation(feature_name)

                risk_scorecard.append({
                    "feature": feature_name,
                    "feature_value": feature_value,
                    "impact": impact_level,
                    "status": status,
                })
    
    return {
        "predicted_cost_overrun_pct": reg_pred,
        "predicted_high_risk_class": clf_pred_class,
        "predicted_high_risk_probability": clf_pred_prob,
        "top_risk_factors": top_risk_factors,
        "risk_scorecard": risk_scorecard,
        "model_version": "pre_project_v2_sklearn",
    }
