"""Cost overrun prediction service with SHAP explanations"""

import logging
from pathlib import Path
from typing import Dict, Any, Optional, List

import joblib
import numpy as np
import pandas as pd
import shap
from tensorflow import keras

logger = logging.getLogger(__name__)


class CostOverrunPredictor:
    """
    Handles cost overrun predictions with optional SHAP explanations.
    
    Loads models and artifacts once at initialization and reuses them
    for all predictions.
    """
    
    def __init__(self, models_dir: Path):
        """
        Initialize the predictor by loading all required models and artifacts.
        
        Args:
            models_dir: Path to the directory containing model files
        """
        self.models_dir = models_dir
        self.threshold = 0.5
        
        logger.info("Initializing CostOverrunPredictor...")
        
        # Load artifacts
        self._load_artifacts()
        
        # Initialize SHAP explainer
        self._initialize_shap_explainer()
        
        logger.info("CostOverrunPredictor initialized successfully")
    
    def _load_artifacts(self):
        """Load all models and preprocessing artifacts"""
        
        try:
            # Load preprocessor (sklearn ColumnTransformer)
            preprocessor_path = self.models_dir / "preprocessor.joblib"
            self.preprocessor = joblib.load(preprocessor_path)
            logger.info(f"Loaded preprocessor from {preprocessor_path}")
            
            # Load feature columns (expected column order)
            feature_columns_path = self.models_dir / "feature_columns.joblib"
            self.feature_columns = joblib.load(feature_columns_path)
            logger.info(f"Loaded {len(self.feature_columns)} feature columns")
            
            # Load feature names after encoding (for SHAP)
            feature_names_encoded_path = self.models_dir / "feature_names_encoded.joblib"
            self.feature_names_encoded = joblib.load(feature_names_encoded_path)
            logger.info(f"Loaded {len(self.feature_names_encoded)} encoded feature names")
            
            # Load regression model
            regression_model_path = self.models_dir / "cost_overrun_regression_model.keras"
            self.regression_model = keras.models.load_model(
                regression_model_path,
                compile=False,
                safe_mode=False
            )
            logger.info(f"Loaded regression model from {regression_model_path}")
            
            # Load classification model
            classification_model_path = self.models_dir / "cost_overrun_classification_model.keras"
            self.classification_model = keras.models.load_model(
                classification_model_path,
                compile=False,
                safe_mode=False
            )
            logger.info(f"Loaded classification model from {classification_model_path}")
            
            # Load SHAP background data
            shap_background_path = self.models_dir / "shap_background.joblib"
            self.shap_background = joblib.load(shap_background_path)
            logger.info(f"Loaded SHAP background data: shape {self.shap_background.shape}")
            
            # Load metrics (optional, for logging)
            try:
                regression_metrics_path = self.models_dir / "regression_metrics.joblib"
                self.regression_metrics = joblib.load(regression_metrics_path)
                logger.info(f"Loaded regression metrics: {self.regression_metrics}")
            except Exception as e:
                logger.warning(f"Could not load regression metrics: {e}")
                self.regression_metrics = None
            
            try:
                classification_metrics_path = self.models_dir / "classification_metrics.joblib"
                self.classification_metrics = joblib.load(classification_metrics_path)
                logger.info(f"Loaded classification metrics: {self.classification_metrics}")
            except Exception as e:
                logger.warning(f"Could not load classification metrics: {e}")
                self.classification_metrics = None
                
        except Exception as e:
            logger.error(f"Failed to load artifacts: {str(e)}", exc_info=True)
            raise
    
    def _initialize_shap_explainer(self):
        """
        Initialize SHAP KernelExplainer once at startup.
        This is done once to avoid recomputation per request.
        """
        try:
            logger.info("Initializing SHAP KernelExplainer...")
            
            # Create a wrapper function for the classification model
            def model_predict(X):
                """Wrapper for classification model prediction"""
                return self.classification_model.predict(X, verbose=0)
            
            # Initialize KernelExplainer with background data
            self.explainer = shap.KernelExplainer(
                model_predict,
                self.shap_background
            )
            
            logger.info("SHAP KernelExplainer initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize SHAP explainer: {str(e)}", exc_info=True)
            self.explainer = None
    
    def _prepare_input(self, payload: Dict[str, Any]) -> pd.DataFrame:
        """
        Prepare input data for prediction.
        
        Args:
            payload: User input dictionary
            
        Returns:
            DataFrame with all expected features in correct order
        """
        # Convert to DataFrame
        df = pd.DataFrame([payload])
        
        # Ensure all expected feature columns exist
        for col in self.feature_columns:
            if col not in df.columns:
                df[col] = np.nan
        
        # Preserve column order
        df = df[self.feature_columns]
        
        return df
    
    def _compute_shap_explanation(
        self, 
        processed_data: np.ndarray, 
        top_n: int = 6
    ) -> Optional[List[Dict[str, Any]]]:
        """
        Compute SHAP explanations for the input data.
        
        Args:
            processed_data: Preprocessed input data (single row)
            top_n: Number of top features to return
            
        Returns:
            List of feature importance dictionaries, or None if SHAP fails
        """
        if self.explainer is None:
            logger.warning("SHAP explainer not initialized, skipping explanation")
            return None
        
        try:
            logger.info("Computing SHAP values...")
            
            # Compute SHAP values for the single input
            shap_values = self.explainer.shap_values(processed_data)
            
            # Extract SHAP values for the single row
            if isinstance(shap_values, list):
                # For multi-output models, take the first output
                shap_vals = shap_values[0][0]
            else:
                shap_vals = shap_values[0]
            
            # Create feature importance list
            feature_importance = []
            for i, (feature_name, shap_val) in enumerate(zip(self.feature_names_encoded, shap_vals)):
                feature_importance.append({
                    "feature": feature_name,
                    "impact": abs(float(shap_val)),
                    "shap_value": float(shap_val),
                    "direction": "increase" if shap_val > 0 else "decrease"
                })
            
            # Sort by absolute impact (descending)
            feature_importance.sort(key=lambda x: x["impact"], reverse=True)
            
            # Take top N features
            top_features = feature_importance[:top_n]
            
            # Remove shap_value from final output (keep impact and direction)
            result = [
                {
                    "feature": f["feature"],
                    "impact": round(f["impact"], 4),
                    "direction": f["direction"]
                }
                for f in top_features
            ]
            
            logger.info(f"SHAP explanation computed: {len(result)} top features")
            return result
            
        except Exception as e:
            logger.error(f"Failed to compute SHAP explanation: {str(e)}", exc_info=True)
            return None
    
    def predict(
        self, 
        payload: Dict[str, Any], 
        explain: bool = False, 
        top_n: int = 6
    ) -> Dict[str, Any]:
        """
        Run prediction on input data with optional SHAP explanation.
        
        Args:
            payload: Dictionary of input features
            explain: Whether to compute SHAP explanations
            top_n: Number of top SHAP features to return
            
        Returns:
            Dictionary with prediction results and optional SHAP explanation
        """
        try:
            # Prepare input DataFrame
            logger.info("Preparing input data...")
            df = self._prepare_input(payload)
            
            # Transform using preprocessor
            logger.info("Applying preprocessing...")
            processed_data = self.preprocessor.transform(df)
            
            # Run regression model
            logger.info("Running regression model...")
            regression_output = self.regression_model.predict(processed_data, verbose=0)
            predicted_cost_overrun_pct = float(regression_output[0][0])
            logger.info(f"Predicted cost overrun: {predicted_cost_overrun_pct:.2f}%")
            
            # Run classification model
            logger.info("Running classification model...")
            classification_output = self.classification_model.predict(processed_data, verbose=0)
            overrun_probability = float(classification_output[0][0])
            logger.info(f"Overrun probability: {overrun_probability:.4f}")
            
            # Determine high risk label
            high_risk_label = overrun_probability >= self.threshold
            logger.info(f"High risk: {high_risk_label} (threshold: {self.threshold})")
            
            # Build base result
            result = {
                "predicted_cost_overrun_pct": round(predicted_cost_overrun_pct, 2),
                "overrun_probability": round(overrun_probability, 4),
                "high_risk_label": high_risk_label,
                "threshold": self.threshold
            }
            
            # Add SHAP explanation if requested
            if explain:
                logger.info("SHAP explanation requested")
                shap_explanation = self._compute_shap_explanation(processed_data, top_n)
                result["shap_explanation"] = shap_explanation
            else:
                result["shap_explanation"] = None
            
            return result
            
        except Exception as e:
            logger.error(f"Prediction failed: {str(e)}", exc_info=True)
            raise
