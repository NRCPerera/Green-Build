"""Model inference service"""

import logging
from typing import Dict, Any

import numpy as np

from app.config import CLASSIFICATION_THRESHOLD

logger = logging.getLogger(__name__)


class InferenceService:
    """Handles model predictions"""
    
    def __init__(self, regression_model, classification_model, preprocessor):
        self.regression_model = regression_model
        self.classification_model = classification_model
        self.preprocessor = preprocessor
        self.threshold = CLASSIFICATION_THRESHOLD
    
    def predict(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Run inference on input data
        
        Args:
            data: Dictionary of input features
            
        Returns:
            Dictionary with prediction results
        """
        
        # Preprocess input data
        logger.info("Preprocessing input data...")
        processed_data = self.preprocessor.preprocess(data)
        
        # Run regression model
        logger.info("Running regression model...")
        regression_output = self.regression_model.predict(processed_data, verbose=0)
        cost_overrun_pct = float(regression_output[0][0])
        logger.info(f"Predicted cost overrun: {cost_overrun_pct:.2f}%")
        
        # Run classification model
        logger.info("Running classification model...")
        classification_output = self.classification_model.predict(processed_data, verbose=0)
        overrun_probability = float(classification_output[0][0])
        logger.info(f"Overrun probability: {overrun_probability:.4f}")
        
        # Apply threshold for high risk classification
        high_risk_label = overrun_probability >= self.threshold
        logger.info(f"High risk label: {high_risk_label} (threshold: {self.threshold})")
        
        # Prepare response
        result = {
            "predicted_cost_overrun_pct": round(cost_overrun_pct, 2),
            "overrun_probability": round(overrun_probability, 4),
            "high_risk_label": high_risk_label,
            "threshold": self.threshold
        }
        
        return result
