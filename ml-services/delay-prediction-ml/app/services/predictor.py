"""Construction delay prediction service using XGBoost models"""

import logging
from pathlib import Path
from typing import Dict, Any
from datetime import datetime

import joblib
import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


class DelayPredictor:
    """
    Handles construction delay predictions using trained XGBoost models.
    
    Supports:
    - Regression: Predicts total delay days
    - Classification: Predicts if project will be delayed (binary)
    """
    
    def __init__(self, models_dir: Path):
        """
        Initialize the predictor by loading all required models and artifacts.
        
        Args:
            models_dir: Path to the directory containing model files
        """
        self.models_dir = models_dir
        
        logger.info("Initializing DelayPredictor...")
        
        # Load all artifacts
        self._load_artifacts()
        
        logger.info("DelayPredictor initialized successfully")
    
    def _load_artifacts(self):
        """Load all XGBoost model bundles"""
        
        try:
            # ==========================================
            # Load Regression Model Bundle
            # ==========================================
            regression_bundle_path = self.models_dir / "delay_regression_bundle.joblib"
            regression_bundle = joblib.load(regression_bundle_path)
            self.regression_preprocess = regression_bundle["preprocess"]
            self.regression_model = regression_bundle["model"]
            logger.info(f"Loaded regression bundle from {regression_bundle_path}")
            
            # ==========================================
            # Load Classification Model Bundle
            # ==========================================
            classification_bundle_path = self.models_dir / "delay_classification_bundle.joblib"
            classification_bundle = joblib.load(classification_bundle_path)
            self.classification_preprocess = classification_bundle["preprocess"]
            self.classification_model = classification_bundle["model"]
            self.classification_threshold = classification_bundle.get("threshold", 0.5)
            logger.info(f"Loaded classification bundle from {classification_bundle_path}")
            
        except Exception as e:
            logger.error(f"Failed to load artifacts: {str(e)}", exc_info=True)
            raise
    
    def _prepare_dataframe(self, payload: Dict[str, Any]) -> pd.DataFrame:
        """
        Convert API payload to DataFrame with required features.
        
        The training script expects these columns:
        - District, Project_Type, Contractor_ICTAD_Grade (categorical)
        - Project_Area_SqM, Floors, Contractor_Experience_Years, etc (numeric)
        - Project_Started_date, Planned_End_Date (datetime for derived features)
        
        Args:
            payload: Dictionary of input features from API
            
        Returns:
            DataFrame ready for preprocessing
        """
        # Map API payload to training column names
        data = {
            # Categorical
            "District": payload.get("District", "Colombo"),
            "Project_Type": payload.get("Project_Type", "House"),
            "Contractor_ICTAD_Grade": payload.get("Contractor_ICTAD_Grade", "M1"),
            
            # Numeric features
            "Project_Area_SqM": payload.get("Project_Area_SqM", 500),
            "Floors": payload.get("Floors", 3),
            "Contractor_Experience_Years": payload.get("Contractor_Experience_Years", 10),
            "Contractor_Past_Delay_Rate": payload.get("Contractor_Past_Delay_Rate", 0.15),
            "Contractor_Previous_Projects": payload.get("Contractor_Previous_Projects", 15),
            "Labor_Availability": payload.get("Labor_Availability", 3),
            "Material_Delivery_Delay_Days": payload.get("Material_Delivery_Delay_Days", 5),
            "Payment_Delay_History": payload.get("Payment_Delay_History", 10),
            "Financial_Issues": payload.get("Financial_Issues", 0),
            "Weather_Impact_Days": payload.get("Weather_Impact_Days", 25),
        }
        
        # Handle date features - calculate derived columns
        planned_duration_days = payload.get("Planned_Duration_Days", 360)
        
        # Calculate dates if provided, otherwise use defaults
        if "Project_Started_date" in payload and "Planned_End_Date" in payload:
            start_date = pd.to_datetime(payload["Project_Started_date"])
            end_date = pd.to_datetime(payload["Planned_End_Date"])
        else:
            # Use current date as default start
            start_date = datetime.now()
            end_date = start_date + pd.Timedelta(days=planned_duration_days)
        
        # Add date columns as strings (preprocessor treats them as categorical)
        data["Project_Started_date"] = str(start_date.date())
        data["Planned_End_Date"] = str(end_date.date())
        
        # Add date-derived numeric features (matching training script)
        data["planned_duration_days"] = planned_duration_days
        data["start_year"] = start_date.year
        data["start_month"] = start_date.month
        data["planned_end_year"] = end_date.year
        data["planned_end_month"] = end_date.month
        
        df = pd.DataFrame([data])
        
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
    
    def _get_delay_category(self, delay_days: float) -> str:
        """Get delay category from days"""
        if delay_days <= 0:
            return "On-Time"
        elif delay_days <= 60:
            return "Minor Delay"
        elif delay_days <= 180:
            return "Major Delay"
        else:
            return "Critical Delay"
    
    def predict_regression(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Predict total delay days using the XGBoost regression model.
        
        Args:
            payload: Dictionary of input features
            
        Returns:
            Dictionary with predicted_delay_days and delay_severity
        """
        try:
            logger.info("Running regression prediction...")
            
            # Prepare DataFrame
            df = self._prepare_dataframe(payload)
            
            # Apply preprocessing (handles imputation + one-hot encoding)
            X_transformed = self.regression_preprocess.transform(df)
            
            # Run prediction
            prediction = self.regression_model.predict(X_transformed)
            predicted_delay_days = float(prediction[0])
            
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
        Predict if project will be delayed using XGBoost classification model.
        
        Output:
        - 0: No delay (On-Time)
        - 1: Delayed
        
        Args:
            payload: Dictionary of input features
            
        Returns:
            Dictionary with predicted_category, confidence, and class_probabilities
        """
        try:
            logger.info("Running classification prediction...")
            
            # Prepare DataFrame
            df = self._prepare_dataframe(payload)
            
            # Apply preprocessing
            X_transformed = self.classification_preprocess.transform(df)
            
            # Get probability predictions
            proba = self.classification_model.predict_proba(X_transformed)[0]
            
            # Get predicted class based on threshold
            will_delay = proba[1] >= self.classification_threshold
            predicted_class = 1 if will_delay else 0
            confidence = float(proba[predicted_class])
            
            # Determine category - for binary classification, use regression for more detail
            if predicted_class == 0:
                predicted_category = "On-Time"
            else:
                # Use regression to get actual delay days for better categorization
                reg_result = self.predict_regression(payload)
                delay_days = reg_result["predicted_delay_days"]
                predicted_category = self._get_delay_category(delay_days)
            
            # Build probability dictionary
            prob_dict = {
                "On-Time": round(float(proba[0]), 4),
                "Delayed": round(float(proba[1]), 4)
            }
            
            # Also provide detailed category probabilities (estimated from regression if delayed)
            if predicted_class == 1:
                delay_prob = proba[1]
                # Estimate category probabilities based on delay severity
                prob_dict["Minor Delay"] = round(delay_prob * 0.4, 4)
                prob_dict["Major Delay"] = round(delay_prob * 0.4, 4)
                prob_dict["Critical Delay"] = round(delay_prob * 0.2, 4)
            else:
                prob_dict["Minor Delay"] = 0.0
                prob_dict["Major Delay"] = 0.0
                prob_dict["Critical Delay"] = 0.0
            
            logger.info(f"Predicted category: {predicted_category} (confidence: {confidence:.4f})")
            
            return {
                "predicted_category": predicted_category,
                "will_delay": bool(will_delay),
                "confidence": round(confidence, 4),
                "class_probabilities": prob_dict
            }
            
        except Exception as e:
            logger.error(f"Classification prediction failed: {str(e)}", exc_info=True)
            raise
