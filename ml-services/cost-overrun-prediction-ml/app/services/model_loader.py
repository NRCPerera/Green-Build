"""Model loading utilities"""

import logging
from pathlib import Path
from typing import Any

import joblib
import tensorflow as tf
from tensorflow import keras

logger = logging.getLogger(__name__)


class ModelLoader:
    """Handles loading of all models and artifacts"""
    
    def __init__(self):
        self.ann_regression_model = None
        self.ann_classification_model = None
        self.feature_scaler = None
        self.feature_names = None
        self.categorical_mappings = None
        self.numeric_medians = None
        self.categorical_modes = None
    
    def load_all(
        self,
        ann_regression_path: Path,
        ann_classification_path: Path,
        scaler_path: Path,
        feature_names_path: Path,
        categorical_mappings_path: Path,
        numeric_medians_path: Path,
        categorical_modes_path: Path
    ) -> None:
        """Load all models and preprocessing artifacts"""
        
        logger.info("Loading ANN regression model...")
        self.ann_regression_model = keras.models.load_model(str(ann_regression_path))
        logger.info(f"✓ Loaded regression model from {ann_regression_path}")
        
        logger.info("Loading ANN classification model...")
        self.ann_classification_model = keras.models.load_model(str(ann_classification_path))
        logger.info(f"✓ Loaded classification model from {ann_classification_path}")
        
        logger.info("Loading feature scaler...")
        self.feature_scaler = joblib.load(scaler_path)
        logger.info(f"✓ Loaded scaler from {scaler_path}")
        
        logger.info("Loading feature names...")
        self.feature_names = joblib.load(feature_names_path)
        logger.info(f"✓ Loaded {len(self.feature_names)} feature names")
        
        logger.info("Loading categorical mappings...")
        self.categorical_mappings = joblib.load(categorical_mappings_path)
        logger.info(f"✓ Loaded mappings for {len(self.categorical_mappings)} categorical features")
        
        logger.info("Loading numeric medians...")
        self.numeric_medians = joblib.load(numeric_medians_path)
        logger.info(f"✓ Loaded medians for {len(self.numeric_medians)} numeric features")
        
        logger.info("Loading categorical modes...")
        self.categorical_modes = joblib.load(categorical_modes_path)
        logger.info(f"✓ Loaded modes for {len(self.categorical_modes)} categorical features")
        
        logger.info("All models and artifacts loaded successfully!")
    
    def is_loaded(self) -> bool:
        """Check if all models are loaded"""
        return all([
            self.ann_regression_model is not None,
            self.ann_classification_model is not None,
            self.feature_scaler is not None,
            self.feature_names is not None,
            self.categorical_mappings is not None,
            self.numeric_medians is not None,
            self.categorical_modes is not None
        ])
