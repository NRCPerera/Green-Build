"""Construction delay prediction service"""

import logging
from pathlib import Path
from typing import Dict, Any, List

import joblib
import numpy as np
import pandas as pd
from tensorflow import keras

logger = logging.getLogger(__name__)


class DelayPredictor:
    """
    Handles construction delay predictions using trained ANN models.
    
    Supports:
    - Regression: Predicts total delay days
    - Classification: Predicts delay category (On-Time, Minor, Major, Critical)
    """
    
    def __init__(self, models_dir: Path):
        """
        Initialize the predictor by loading all required models and artifacts.
        
        Args:
            models_dir: Path to the directory containing model files
        """
        self.models_dir = models_dir
        
        # Delay category mappings
        self.delay_categories = ["On-Time", "Minor Delay", "Major Delay", "Critical Delay"]
        
        logger.info("Initializing DelayPredictor...")
        
        # Load all artifacts
        self._load_artifacts()
        
        logger.info("DelayPredictor initialized successfully")
    
    def _load_artifacts(self):
        """Load all models and preprocessing artifacts"""
        
        try:
            # ==========================================
            # Load Regression Model Artifacts
            # ==========================================
            
            # Regression model (.h5 format from training)
            # Using compile=False for compatibility with legacy TF2 models in Keras 3
            regression_model_path = self.models_dir / "ann_delay_model.h5"
            self.regression_model = keras.models.load_model(
                regression_model_path, 
                compile=False
            )
            logger.info(f"Loaded regression model from {regression_model_path}")
            
            # Regression scaler
            regression_scaler_path = self.models_dir / "ann_scaler.pkl"
            self.regression_scaler = joblib.load(regression_scaler_path)
            logger.info(f"Loaded regression scaler from {regression_scaler_path}")
            
            # Regression feature columns
            regression_features_path = self.models_dir / "ann_feature_columns.pkl"
            self.regression_feature_columns = joblib.load(regression_features_path)
            logger.info(f"Loaded {len(self.regression_feature_columns)} regression feature columns")
            
            # ==========================================
            # Load Classification Model Artifacts
            # ==========================================
            
            # Classification model
            # Using compile=False for compatibility with legacy TF2 models in Keras 3
            classification_model_path = self.models_dir / "ann_classifier_model.h5"
            self.classification_model = keras.models.load_model(
                classification_model_path,
                compile=False
            )
            logger.info(f"Loaded classification model from {classification_model_path}")
            
            # Classification scaler
            classification_scaler_path = self.models_dir / "ann_class_scaler.pkl"
            self.classification_scaler = joblib.load(classification_scaler_path)
            logger.info(f"Loaded classification scaler from {classification_scaler_path}")
            
            # Classification feature columns
            classification_features_path = self.models_dir / "ann_class_feature_columns.pkl"
            self.classification_feature_columns = joblib.load(classification_features_path)
            logger.info(f"Loaded {len(self.classification_feature_columns)} classification feature columns")
            
            # Label encoder for classification
            label_encoder_path = self.models_dir / "ann_label_encoder.pkl"
            self.label_encoder = joblib.load(label_encoder_path)
            logger.info(f"Loaded label encoder with classes: {self.label_encoder.classes_}")
            
        except Exception as e:
            logger.error(f"Failed to load artifacts: {str(e)}", exc_info=True)
            raise
    
    def _prepare_features(
        self, 
        payload: Dict[str, Any], 
        feature_columns: List[str]
    ) -> pd.DataFrame:
        """
        Prepare input features as a DataFrame with one-hot encoding.
        
        The training script used:
        X = pd.get_dummies(X, columns=['District', 'Project_Type', 'Contractor_ICTAD_Grade'], drop_first=True)
        
        Args:
            payload: User input dictionary
            feature_columns: Expected feature columns after one-hot encoding
            
        Returns:
            DataFrame with all expected features in correct order
        """
        
        # Convert to DataFrame
        df = pd.DataFrame([payload])
        
        # Apply one-hot encoding to categorical columns if present
        categorical_cols = ['District', 'Project_Type', 'Contractor_ICTAD_Grade']
        existing_categorical = [col for col in categorical_cols if col in df.columns]
        
        if existing_categorical:
            df = pd.get_dummies(df, columns=existing_categorical, drop_first=True)
        
        # Ensure all expected feature columns exist (fill missing with 0)
        for col in feature_columns:
            if col not in df.columns:
                df[col] = 0
        
        # Select only expected columns in the correct order
        df = df[feature_columns]
        
        return df
    
    def _get_delay_severity(self, delay_days: float) -> str:
        """
        Convert delay days to severity label.
        
        Args:
            delay_days: Predicted delay days
            
        Returns:
            Human-readable severity label
        """
        if delay_days <= 0:
            return "On-Time (No Delay)"
        elif delay_days <= 30:
            return "Minor Delay (1-30 days)"
        elif delay_days <= 60:
            return "Moderate Delay (31-60 days)"
        elif delay_days <= 180:
            return "Major Delay (61-180 days)"
        else:
            return "Critical Delay (>180 days)"
    
    def predict_regression(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Predict total delay days using the regression model.
        
        Args:
            payload: Dictionary of input features
            
        Returns:
            Dictionary with predicted_delay_days and delay_severity
        """
        try:
            logger.info("Running regression prediction...")
            
            # Prepare features
            df = self._prepare_features(payload, self.regression_feature_columns)
            
            # Scale features
            X_scaled = self.regression_scaler.transform(df)
            
            # Run prediction
            prediction = self.regression_model.predict(X_scaled, verbose=0)
            predicted_delay_days = float(prediction[0][0])
            
            # Ensure non-negative
            predicted_delay_days = max(0, predicted_delay_days)
            
            logger.info(f"Predicted delay days: {predicted_delay_days:.2f}")
            
            return {
                "predicted_delay_days": round(predicted_delay_days, 2),
                "delay_severity": self._get_delay_severity(predicted_delay_days)
            }
            
        except Exception as e:
            logger.error(f"Regression prediction failed: {str(e)}", exc_info=True)
            raise
    
    def predict_classification(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Predict delay category using the classification model.
        
        Categories:
        - On-Time: 0 days
        - Minor Delay: 1-60 days
        - Major Delay: 61-180 days
        - Critical Delay: >180 days
        
        Args:
            payload: Dictionary of input features
            
        Returns:
            Dictionary with predicted_category, confidence, and class_probabilities
        """
        try:
            logger.info("Running classification prediction...")
            
            # Prepare features
            df = self._prepare_features(payload, self.classification_feature_columns)
            
            # Scale features
            X_scaled = self.classification_scaler.transform(df)
            
            # Run prediction (softmax output)
            predictions = self.classification_model.predict(X_scaled, verbose=0)
            class_probabilities = predictions[0]
            
            # Get predicted class
            predicted_class_index = int(np.argmax(class_probabilities))
            predicted_category = self.label_encoder.inverse_transform([predicted_class_index])[0]
            confidence = float(class_probabilities[predicted_class_index])
            
            # Build probability dictionary
            prob_dict = {}
            for i, class_name in enumerate(self.label_encoder.classes_):
                prob_dict[class_name] = round(float(class_probabilities[i]), 4)
            
            logger.info(f"Predicted category: {predicted_category} (confidence: {confidence:.4f})")
            
            return {
                "predicted_category": predicted_category,
                "category_index": predicted_class_index,
                "confidence": round(confidence, 4),
                "class_probabilities": prob_dict
            }
            
        except Exception as e:
            logger.error(f"Classification prediction failed: {str(e)}", exc_info=True)
            raise
