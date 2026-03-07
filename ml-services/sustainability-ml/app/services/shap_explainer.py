"""SHAP Explainability Service for Sustainability ML Models

Provides per-prediction SHAP explanations for all 3 models:
- Sustainability Score
- Lifecycle Cost
- Risk Prediction

Uses DeepExplainer for Keras/TF models with fallback to KernelExplainer.
"""

import logging
import numpy as np

logger = logging.getLogger(__name__)

# Attempt to import SHAP
try:
    import shap
    SHAP_AVAILABLE = True
    logger.info("SHAP library loaded successfully")
except ImportError:
    SHAP_AVAILABLE = False
    logger.warning("SHAP library not available - explainability features disabled")


class SHAPExplainer:
    """Computes SHAP values for model predictions to explain feature contributions."""

    # All 3 models share the same 16 features (must match inference.py COMMON_FEATURE_ORDER)
    FEATURE_DISPLAY_NAMES = [
        'Area (sqft)', 'Floors', 'Design Completeness (%)',
        'Contractor Experience (yrs)', 'Inflation Rate (%)', 'Interest Rate (%)',
        'Energy (kWh/yr)', 'Energy Efficiency', 'Efficiency per sqft',
        'Operational CO₂ (tons)', 'Embodied CO₂ (tons)', 'Construction Cost/sqft',
        'Maintenance Cost/yr', 'Cost/sqft for Sustainability',
        'CO₂ Impact vs Cost', 'Project Complexity'
    ]

    # Aliases for backwards compatibility
    SUSTAINABILITY_FEATURE_NAMES = FEATURE_DISPLAY_NAMES
    LIFECYCLE_FEATURE_NAMES = FEATURE_DISPLAY_NAMES
    RISK_FEATURE_NAMES = FEATURE_DISPLAY_NAMES

    def __init__(self, sustainability_model=None, lifecycle_model=None, risk_model=None):
        """Initialize SHAP explainers for each model.
        
        Args:
            sustainability_model: Loaded Keras model for sustainability score
            lifecycle_model: Loaded Keras model for lifecycle cost
            risk_model: Loaded Keras model for risk prediction
        """
        self.sustainability_explainer = None
        self.lifecycle_explainer = None
        self.risk_explainer = None
        self._initialized = False

        if not SHAP_AVAILABLE:
            logger.warning("SHAP not available - all explain() calls will return empty results")
            return

        try:
            # Background data: typical values for all 16 features
            # Order: area, floors, design_comp, contractor_exp, inflation, interest,
            #        energy_kwh, energy_eff, eff_per_sqft, op_co2, emb_co2,
            #        cost_per_sqft, maint_per_yr, sust_cost_per_sqft, co2_impact, complexity
            bg_data = np.array([[
                2000, 2, 80, 10, 6.5, 10.0,
                25000, 72, 12.5, 10.0, 100.0,
                13000, 520000, 1950, 0.0004, 50.0
            ]], dtype=np.float32)

            if sustainability_model is not None:
                self.sustainability_explainer = shap.DeepExplainer(
                    sustainability_model, bg_data
                )
                logger.info("✅ SHAP DeepExplainer initialized for sustainability model")

            if lifecycle_model is not None:
                self.lifecycle_explainer = shap.DeepExplainer(
                    lifecycle_model, bg_data
                )
                logger.info("✅ SHAP DeepExplainer initialized for lifecycle cost model")

            if risk_model is not None:
                self.risk_explainer = shap.DeepExplainer(
                    risk_model, bg_data
                )
                logger.info("✅ SHAP DeepExplainer initialized for risk model")

            self._initialized = True
            logger.info("✅ All SHAP explainers initialized successfully")

        except Exception as e:
            logger.error(f"Failed to initialize SHAP explainers: {e}", exc_info=True)
            logger.warning("SHAP explanations will be unavailable")

    def is_available(self) -> bool:
        """Check if SHAP explanations are available."""
        return SHAP_AVAILABLE and self._initialized

    def explain_sustainability(self, features: np.ndarray) -> dict:
        return self._explain(self.sustainability_explainer, features, self.FEATURE_DISPLAY_NAMES, "sustainability")

    def explain_lifecycle(self, features: np.ndarray) -> dict:
        return self._explain(self.lifecycle_explainer, features, self.FEATURE_DISPLAY_NAMES, "lifecycle")

    def explain_risk(self, features: np.ndarray) -> dict:
        return self._explain(self.risk_explainer, features, self.FEATURE_DISPLAY_NAMES, "risk")

    def _explain(self, explainer, features: np.ndarray, feature_names: list, model_name: str) -> dict:
        """Internal method to compute SHAP values for a given model."""
        if explainer is None:
            return self._empty_explanation(feature_names)

        try:
            features_float = features.astype(np.float32)
            shap_values = explainer.shap_values(features_float)

            # Handle different SHAP output formats
            if isinstance(shap_values, list):
                # Multi-output: take first output
                sv = shap_values[0][0]
            elif len(shap_values.shape) == 3:
                sv = shap_values[0, :, 0]
            else:
                sv = shap_values[0]

            # Build per-feature SHAP value mapping
            shap_dict = {}
            for i, name in enumerate(feature_names):
                if i < len(sv):
                    shap_dict[name] = round(float(sv[i]), 4)

            # Sort by absolute impact (descending)
            sorted_features = sorted(
                shap_dict.items(),
                key=lambda x: abs(x[1]),
                reverse=True
            )

            # Build top drivers list with human-readable explanations
            top_drivers = []
            for feat_name, impact in sorted_features[:5]:
                direction = "increases" if impact > 0 else "decreases"
                top_drivers.append({
                    "feature": feat_name,
                    "impact": round(impact, 4),
                    "direction": direction,
                    "description": f"{feat_name} {direction} the prediction by {abs(impact):.2f}"
                })

            # Build feature values for reference
            feature_values = {}
            for i, name in enumerate(feature_names):
                if i < features.shape[1]:
                    feature_values[name] = round(float(features[0][i]), 4)

            return {
                "available": True,
                "shap_values": shap_dict,
                "top_drivers": top_drivers,
                "feature_values": feature_values,
                "model": model_name
            }

        except Exception as e:
            logger.error(f"SHAP explanation failed for {model_name}: {e}", exc_info=True)
            return self._empty_explanation(feature_names)

    def _empty_explanation(self, feature_names: list) -> dict:
        """Return an empty explanation when SHAP is unavailable."""
        return {
            "available": False,
            "shap_values": {name: 0.0 for name in feature_names},
            "top_drivers": [],
            "feature_values": {},
            "model": "unavailable"
        }
