"""Inference service for model predictions"""

import logging
import numpy as np

logger = logging.getLogger(__name__)


class InferenceService:
    """Handles model inference and prediction logic"""
    
    def __init__(
        self,
        sustainability_model,
        lifecycle_cost_model,
        risk_prediction_model,
        preprocessor
    ):
        self.sustainability_model = sustainability_model
        self.lifecycle_cost_model = lifecycle_cost_model
        self.risk_prediction_model = risk_prediction_model
        self.preprocessor = preprocessor
    
    def predict_sustainability(self, data: dict) -> dict:
        """Predict sustainability score"""
        
        try:
            # Preprocess input data
            processed_data = self.preprocessor.preprocess(data)
            
            # Make prediction
            prediction = self.sustainability_model.predict(processed_data, verbose=0)
            score = float(prediction[0][0])
            
            # Calculate confidence (you can adjust this based on your model)
            confidence = 0.85  # Placeholder - implement based on your needs
            
            # Interpret the score
            if score >= 80:
                interpretation = "Excellent sustainability rating"
            elif score >= 60:
                interpretation = "Good sustainability rating"
            elif score >= 40:
                interpretation = "Fair sustainability rating"
            else:
                interpretation = "Poor sustainability rating"
            
            return {
                "sustainability_score": score,
                "confidence": confidence,
                "interpretation": interpretation
            }
            
        except Exception as e:
            logger.error(f"Sustainability prediction error: {str(e)}", exc_info=True)
            raise
    
    def predict_lifecycle_cost(self, data: dict) -> dict:
        """Predict lifecycle costs"""
        
        try:
            # Preprocess input data
            processed_data = self.preprocessor.preprocess(data)
            
            # Make prediction
            prediction = self.lifecycle_cost_model.predict(processed_data, verbose=0)
            total_cost = float(prediction[0][0])
            
            # Calculate component costs (adjust based on your model)
            annual_cost = total_cost * 0.05  # 5% per year
            maintenance_cost = total_cost * 0.30  # 30% for maintenance
            
            return {
                "total_lifecycle_cost": total_cost,
                "annual_operating_cost": annual_cost,
                "maintenance_cost": maintenance_cost,
                "currency": "USD"
            }
            
        except Exception as e:
            logger.error(f"Lifecycle cost prediction error: {str(e)}", exc_info=True)
            raise
    
    def predict_risk(self, data: dict) -> dict:
        """Predict sustainability risks"""
        
        try:
            # Preprocess input data
            processed_data = self.preprocessor.preprocess(data)
            
            # Make prediction
            prediction = self.risk_prediction_model.predict(processed_data, verbose=0)
            risk_score = float(prediction[0][0])
            
            # Determine risk level
            if risk_score < 30:
                risk_level = "low"
                risk_factors = ["Minimal environmental concerns"]
                recommendations = ["Continue current practices", "Monitor regularly"]
            elif risk_score < 70:
                risk_level = "medium"
                risk_factors = ["Moderate environmental impact", "Regulatory compliance needed"]
                recommendations = ["Implement sustainability measures", "Regular audits"]
            else:
                risk_level = "high"
                risk_factors = ["High environmental impact", "Compliance risks", "Climate vulnerability"]
                recommendations = ["Immediate action required", "Comprehensive mitigation plan", "Expert consultation"]
            
            return {
                "risk_level": risk_level,
                "risk_score": risk_score,
                "risk_factors": risk_factors,
                "recommendations": recommendations
            }
            
        except Exception as e:
            logger.error(f"Risk prediction error: {str(e)}", exc_info=True)
            raise
