"""Model loading service"""

import logging
import pickle
from pathlib import Path
import tensorflow as tf

logger = logging.getLogger(__name__)


class ModelLoader:
    """Handles loading of ML models and artifacts"""
    
    def __init__(self):
        self.sustainability_model = None
        self.lifecycle_cost_model = None
        self.risk_prediction_model = None
        self.feature_scaler = None
        self.feature_names = None
        self.categorical_mappings = None
        self.numeric_medians = None
        self.categorical_modes = None
        self._loaded = False
    
    def load_all(
        self,
        sustainability_path: Path,
        lifecycle_cost_path: Path,
        risk_prediction_path: Path,
        scaler_path: Path = None,
        feature_names_path: Path = None,
        categorical_mappings_path: Path = None,
        numeric_medians_path: Path = None,
        categorical_modes_path: Path = None
    ):
        """Load all models and preprocessing artifacts"""
        
        try:
            logger.info("Loading models...")
            
            # Load Keras models
            logger.info(f"Loading sustainability model from {sustainability_path}")
            self.sustainability_model = tf.keras.models.load_model(sustainability_path)
            
            logger.info(f"Loading lifecycle cost model from {lifecycle_cost_path}")
            self.lifecycle_cost_model = tf.keras.models.load_model(lifecycle_cost_path)
            
            logger.info(f"Loading risk prediction model from {risk_prediction_path}")
            self.risk_prediction_model = tf.keras.models.load_model(risk_prediction_path)
            
            # Load preprocessing artifacts (if they exist)
            if scaler_path and scaler_path.exists():
                logger.info(f"Loading feature scaler from {scaler_path}")
                with open(scaler_path, 'rb') as f:
                    self.feature_scaler = pickle.load(f)
            
            if feature_names_path and feature_names_path.exists():
                logger.info(f"Loading feature names from {feature_names_path}")
                with open(feature_names_path, 'rb') as f:
                    self.feature_names = pickle.load(f)
            
            if categorical_mappings_path and categorical_mappings_path.exists():
                logger.info(f"Loading categorical mappings from {categorical_mappings_path}")
                with open(categorical_mappings_path, 'rb') as f:
                    self.categorical_mappings = pickle.load(f)
            
            if numeric_medians_path and numeric_medians_path.exists():
                logger.info(f"Loading numeric medians from {numeric_medians_path}")
                with open(numeric_medians_path, 'rb') as f:
                    self.numeric_medians = pickle.load(f)
            
            if categorical_modes_path and categorical_modes_path.exists():
                logger.info(f"Loading categorical modes from {categorical_modes_path}")
                with open(categorical_modes_path, 'rb') as f:
                    self.categorical_modes = pickle.load(f)
            
            self._loaded = True
            logger.info("✅ All models and artifacts loaded successfully")
            
        except Exception as e:
            logger.error(f"Failed to load models: {str(e)}", exc_info=True)
            raise
    
    def is_loaded(self) -> bool:
        """Check if models are loaded"""
        return self._loaded
