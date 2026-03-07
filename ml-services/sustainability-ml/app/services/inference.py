"""Inference service for real model predictions

Enhanced with:
- MC Dropout for confidence intervals (P10/P50/P90)
- SHAP integration for per-prediction explainability

All 3 models (sustainability, lifecycle, risk) expect the SAME 16 input features
derived from the calculate_derived_features() function in endpoints.py.
"""

import logging
import numpy as np

logger = logging.getLogger(__name__)

# Number of MC Dropout forward passes for uncertainty estimation
MC_DROPOUT_SAMPLES = 50

# All 3 models share the same 16-feature input vector
# This must match the order used during model training
COMMON_FEATURE_ORDER = [
    'area_sqft',
    'floors',
    'design_completeness',
    'contractor_experience',
    'inflation_rate',
    'interest_rate',
    'energy_kwh_year',
    'energy_efficiency',
    'energy_efficiency_per_sqft',
    'operational_co2_tons',
    'embodied_co2_tons',
    'construction_cost_per_sqft',
    'maintenance_cost_per_year',
    'cost_per_sqft_for_sustainability',
    'energy_co2_impact_relative_to_cost',
    'project_complexity_score',
]

COMMON_FEATURE_DISPLAY_NAMES = [
    'Area (sqft)',
    'Floors',
    'Design Completeness (%)',
    'Contractor Experience (yrs)',
    'Inflation Rate (%)',
    'Interest Rate (%)',
    'Energy (kWh/yr)',
    'Energy Efficiency',
    'Efficiency per sqft',
    'Operational CO₂ (tons)',
    'Embodied CO₂ (tons)',
    'Construction Cost/sqft',
    'Maintenance Cost/yr',
    'Cost/sqft for Sustainability',
    'CO₂ Impact vs Cost',
    'Project Complexity',
]


class InferenceService:
    """Handles model inference with explainability and uncertainty quantification"""
    
    def __init__(
        self,
        sustainability_model,
        lifecycle_cost_model,
        risk_prediction_model,
        preprocessor,
        shap_explainer=None
    ):
        self.sustainability_model = sustainability_model
        self.lifecycle_cost_model = lifecycle_cost_model
        self.risk_prediction_model = risk_prediction_model
        self.preprocessor = preprocessor
        self.shap_explainer = shap_explainer

    # =========================================================================
    # Build common feature vector from derived features dict
    # =========================================================================

    def _build_feature_vector(self, data: dict) -> np.ndarray:
        """Build the 16-feature input vector expected by all models.
        
        Args:
            data: Dict from calculate_derived_features()
            
        Returns:
            numpy array of shape (1, 16)
        """
        values = []
        for feat in COMMON_FEATURE_ORDER:
            values.append(float(data.get(feat, 0)))
        return np.array([values], dtype=np.float32)

    # =========================================================================
    # MC Dropout Uncertainty Estimation
    # =========================================================================

    def _predict_with_uncertainty(self, model, features: np.ndarray, n_samples: int = MC_DROPOUT_SAMPLES) -> dict:
        """Run MC Dropout inference: N forward passes with dropout active.
        
        By calling model(features, training=True) we keep dropout layers active,
        producing a distribution of predictions that quantifies model uncertainty.
        """
        features_float = features.astype(np.float32)
        
        # Collect stochastic predictions
        predictions = []
        for _ in range(n_samples):
            pred = model(features_float, training=True).numpy()
            # Handle multi-output models
            if pred.shape[-1] > 1:
                predictions.append([float(pred[0][i]) for i in range(pred.shape[-1])])
            else:
                predictions.append(float(pred[0][0]))
        
        predictions = np.array(predictions)
        
        # Deterministic prediction (dropout off)
        deterministic = model.predict(features_float, verbose=0)
        
        if len(predictions.shape) == 1:
            # Single output
            return {
                "point_estimate": float(deterministic[0][0]),
                "mc_mean": round(float(np.mean(predictions)), 4),
                "mc_std": round(float(np.std(predictions)), 4),
                "p10": round(float(np.percentile(predictions, 10)), 4),
                "p50": round(float(np.percentile(predictions, 50)), 4),
                "p90": round(float(np.percentile(predictions, 90)), 4),
                "n_samples": n_samples
            }
        else:
            # Multi-output (lifecycle cost model has 3 outputs)
            return {
                "point_estimate": [float(deterministic[0][i]) for i in range(deterministic.shape[-1])],
                "mc_mean": [round(float(np.mean(predictions[:, i])), 4) for i in range(predictions.shape[-1])],
                "mc_std": [round(float(np.std(predictions[:, i])), 4) for i in range(predictions.shape[-1])],
                "p10": [round(float(np.percentile(predictions[:, i], 10)), 4) for i in range(predictions.shape[-1])],
                "p50": [round(float(np.percentile(predictions[:, i], 50)), 4) for i in range(predictions.shape[-1])],
                "p90": [round(float(np.percentile(predictions[:, i], 90)), 4) for i in range(predictions.shape[-1])],
                "n_samples": n_samples,
                "is_multioutput": True
            }

    # =========================================================================
    # Sustainability Score Prediction
    # =========================================================================

    def predict_sustainability(self, data: dict) -> dict:
        """Predict sustainability score with SHAP explanation and confidence intervals."""
        
        try:
            features = self._build_feature_vector(data)
            
            # --- MC Dropout for confidence intervals ---
            uncertainty = self._predict_with_uncertainty(
                self.sustainability_model, features
            )
            score = uncertainty["point_estimate"]
            if isinstance(score, list):
                score = score[0]
            
            # Clamp to valid range
            score = max(0, min(100, score))
            
            # Clamp confidence interval bounds
            ci_lower = max(0, min(100, uncertainty["p10"] if not isinstance(uncertainty["p10"], list) else uncertainty["p10"][0]))
            ci_upper = max(0, min(100, uncertainty["p90"] if not isinstance(uncertainty["p90"], list) else uncertainty["p90"][0]))
            ci_median = max(0, min(100, uncertainty["p50"] if not isinstance(uncertainty["p50"], list) else uncertainty["p50"][0]))
            mc_std = uncertainty["mc_std"] if not isinstance(uncertainty["mc_std"], list) else uncertainty["mc_std"][0]
            
            # Interpret the score
            if score >= 80:
                interpretation = "Excellent sustainability rating"
            elif score >= 60:
                interpretation = "Good sustainability rating"
            elif score >= 40:
                interpretation = "Fair sustainability rating"
            else:
                interpretation = "Poor sustainability rating - improvements recommended"
            
            # --- SHAP explainability ---
            shap_result = {}
            if self.shap_explainer and self.shap_explainer.is_available():
                shap_result = self.shap_explainer.explain_sustainability(features)
            
            return {
                "sustainability_score": round(score, 2),
                "interpretation": interpretation,
                "confidence_interval": {
                    "lower": round(ci_lower, 2),
                    "median": round(ci_median, 2),
                    "upper": round(ci_upper, 2),
                    "std": round(mc_std, 4)
                },
                "shap_explanation": shap_result
            }
            
        except Exception as e:
            logger.error(f"Sustainability prediction error: {str(e)}", exc_info=True)
            raise
    
    # =========================================================================
    # Lifecycle Cost Prediction
    # =========================================================================

    def predict_lifecycle_cost(self, data: dict) -> dict:
        """Predict lifecycle costs with SHAP explanation and confidence intervals."""
        
        try:
            features = self._build_feature_vector(data)
            
            # --- MC Dropout for confidence intervals ---
            uncertainty = self._predict_with_uncertainty(
                self.lifecycle_cost_model, features
            )
            
            point_est = uncertainty["point_estimate"]
            
            # Handle multi-output (3 outputs: initial, maintenance, sustainability)
            if isinstance(point_est, list):
                return {
                    "multi_output_predictions": point_est,
                    "is_multioutput": True,
                    "confidence_interval": {
                        "lower_millions": round(max(0, uncertainty["p10"][0]), 2) if isinstance(uncertainty["p10"], list) else round(max(0, uncertainty["p10"]), 2),
                        "median_millions": round(uncertainty["p50"][0], 2) if isinstance(uncertainty["p50"], list) else round(uncertainty["p50"], 2),
                        "upper_millions": round(uncertainty["p90"][0], 2) if isinstance(uncertainty["p90"], list) else round(uncertainty["p90"], 2),
                        "lower_lkr": round(max(0, (uncertainty["p10"][0] if isinstance(uncertainty["p10"], list) else uncertainty["p10"])) * 1_000_000, 2),
                        "upper_lkr": round((uncertainty["p90"][0] if isinstance(uncertainty["p90"], list) else uncertainty["p90"]) * 1_000_000, 2),
                        "std_millions": round(uncertainty["mc_std"][0] if isinstance(uncertainty["mc_std"], list) else uncertainty["mc_std"], 4)
                    },
                    "shap_explanation": self.shap_explainer.explain_lifecycle(features) if self.shap_explainer and self.shap_explainer.is_available() else {}
                }
            
            # Single output fallback
            cost_millions = max(0, point_est)
            mc_std = uncertainty["mc_std"]
            
            return {
                "lifecycle_cost_millions_lkr": round(cost_millions, 2),
                "lifecycle_cost_lkr": round(cost_millions * 1_000_000, 2),
                "interpretation": "Estimated lifecycle cost",
                "confidence_interval": {
                    "lower_millions": round(max(0, uncertainty["p10"]), 2),
                    "median_millions": round(uncertainty["p50"], 2),
                    "upper_millions": round(uncertainty["p90"], 2),
                    "lower_lkr": round(max(0, uncertainty["p10"]) * 1_000_000, 2),
                    "upper_lkr": round(uncertainty["p90"] * 1_000_000, 2),
                    "std_millions": round(mc_std, 4)
                },
                "shap_explanation": self.shap_explainer.explain_lifecycle(features) if self.shap_explainer and self.shap_explainer.is_available() else {}
            }
            
        except Exception as e:
            logger.error(f"Lifecycle cost prediction error: {str(e)}", exc_info=True)
            raise
    
    # =========================================================================
    # Risk Prediction
    # =========================================================================

    def predict_risk(self, data: dict) -> dict:
        """Predict project risk with SHAP explanation and confidence intervals."""
        
        try:
            features = self._build_feature_vector(data)
            
            # --- MC Dropout for confidence intervals ---
            uncertainty = self._predict_with_uncertainty(
                self.risk_prediction_model, features
            )
            risk_probability = uncertainty["point_estimate"]
            if isinstance(risk_probability, list):
                risk_probability = risk_probability[0]
            
            # Clamp to valid range
            risk_probability = max(0, min(1, risk_probability))
            
            is_high_risk = risk_probability > 0.5
            
            # Determine risk level
            if risk_probability < 0.3:
                risk_level = "low"
            elif risk_probability < 0.6:
                risk_level = "medium"
            else:
                risk_level = "high"
            
            mc_std = uncertainty["mc_std"] if not isinstance(uncertainty["mc_std"], list) else uncertainty["mc_std"][0]
            
            # --- SHAP explainability ---
            shap_result = {}
            if self.shap_explainer and self.shap_explainer.is_available():
                shap_result = self.shap_explainer.explain_risk(features)
            
            # Generate SHAP-driven recommendations
            recommendations = self._generate_shap_recommendations(
                data, shap_result, risk_probability
            )
            
            return {
                "is_high_risk": is_high_risk,
                "risk_probability": round(risk_probability, 3),
                "risk_level": risk_level,
                "recommendations": recommendations,
                "confidence_interval": {
                    "lower": round(max(0, min(1, uncertainty["p10"] if not isinstance(uncertainty["p10"], list) else uncertainty["p10"][0])), 3),
                    "median": round(max(0, min(1, uncertainty["p50"] if not isinstance(uncertainty["p50"], list) else uncertainty["p50"][0])), 3),
                    "upper": round(max(0, min(1, uncertainty["p90"] if not isinstance(uncertainty["p90"], list) else uncertainty["p90"][0])), 3),
                    "std": round(mc_std, 4)
                },
                "shap_explanation": shap_result
            }
            
        except Exception as e:
            logger.error(f"Risk prediction error: {str(e)}", exc_info=True)
            raise

    # =========================================================================
    # SHAP-Driven Recommendations
    # =========================================================================

    def _generate_shap_recommendations(self, data: dict, shap_result: dict, risk_prob: float) -> list:
        """Generate recommendations driven by SHAP feature importance."""
        recommendations = []
        
        if shap_result and shap_result.get("available") and shap_result.get("top_drivers"):
            for driver in shap_result["top_drivers"][:3]:
                feat = driver["feature"]
                impact = driver["impact"]
                
                if impact > 0:
                    if "Design Completeness" in feat:
                        val = data.get('design_completeness', 0)
                        recommendations.append(
                            f"Design completeness ({val:.0f}%) is increasing risk by {abs(impact):.2f}. "
                            f"Increase to 85%+ to reduce risk."
                        )
                    elif "Complexity" in feat:
                        recommendations.append(
                            f"Project complexity is a key risk driver (+{abs(impact):.2f}). "
                            f"Consider phased approach."
                        )
                    elif "Change Order" in feat:
                        recommendations.append(
                            f"Change order frequency contributes +{abs(impact):.2f} to risk. "
                            f"Implement stricter change controls."
                        )
                    elif "Inflation" in feat:
                        recommendations.append(
                            f"Inflation rate impact: +{abs(impact):.2f}. "
                            f"Include inflation contingency in budget."
                        )
                    elif "Interest" in feat:
                        recommendations.append(
                            f"Interest rate impact: +{abs(impact):.2f}. "
                            f"Consider fixed-rate financing."
                        )
                    elif "Contractor" in feat:
                        recommendations.append(
                            f"Contractor experience impact: +{abs(impact):.2f}. "
                            f"Partner with more experienced contractor."
                        )
        
        # Fallback
        if not recommendations:
            if data.get('design_completeness', 100) < 80:
                recommendations.append(f"Increase design completeness (currently {data.get('design_completeness', 0):.0f}%)")
            if data.get('project_complexity_score', 0) > 60:
                recommendations.append("Consider phased approach to reduce complexity")
            if data.get('contractor_experience', 20) < 5:
                recommendations.append("Consider partnering with more experienced contractor")
        
        if not recommendations:
            recommendations.append("Project parameters are within acceptable ranges")
        
        return recommendations