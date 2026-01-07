"""Inference service for real model predictions - matches training script features"""

import logging
import numpy as np

logger = logging.getLogger(__name__)


class InferenceService:
    """Handles model inference and prediction logic"""
    
    # Feature order must match training scripts exactly
    SUSTAINABILITY_FEATURES = [
        'energy_kwh_year', 'embodied_co2_tons', 'operational_co2_tons',
        'energy_efficiency', 'energy_efficiency_per_sqft',
        'cost_per_sqft_for_sustainability', 'energy_co2_impact_relative_to_cost'
    ]
    
    LIFECYCLE_COST_FEATURES = [
        'construction_cost_per_sqft', 'maintenance_cost_per_year', 'energy_kwh_year',
        'energy_efficiency', 'sustainability_score', 'energy_efficiency_per_sqft',
        'cost_per_sqft_for_sustainability', 'energy_co2_impact_relative_to_cost'
    ]
    
    RISK_FEATURES = [
        'Design_Completeness', 'Project_Complexity_Score',
        'Change_Order_Frequency', 'Inflation_Rate',
        'Interest_Rate', 'Contractor_Experience_Years'
    ]
    
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
            # Create feature array in correct order
            features = np.array([[
                data.get('energy_kwh_year', 0),
                data.get('embodied_co2_tons', 0),
                data.get('operational_co2_tons', 0),
                data.get('energy_efficiency', 0),
                data.get('energy_efficiency_per_sqft', 0),
                data.get('cost_per_sqft_for_sustainability', 0),
                data.get('energy_co2_impact_relative_to_cost', 0)
            ]])
            
            # Apply scaling if available
            if self.preprocessor and self.preprocessor.sustainability_scaler:
                features = self.preprocessor.sustainability_scaler.transform(features)
            
            # Make prediction
            prediction = self.sustainability_model.predict(features, verbose=0)
            score = float(prediction[0][0])
            
            # Clamp to valid range
            score = max(0, min(100, score))
            
            # Interpret the score
            if score >= 80:
                interpretation = "Excellent sustainability rating"
            elif score >= 60:
                interpretation = "Good sustainability rating"
            elif score >= 40:
                interpretation = "Fair sustainability rating"
            else:
                interpretation = "Poor sustainability rating - improvements recommended"
            
            return {
                "sustainability_score": round(score, 2),
                "interpretation": interpretation
            }
            
        except Exception as e:
            logger.error(f"Sustainability prediction error: {str(e)}", exc_info=True)
            raise
    
    def predict_lifecycle_cost(self, data: dict) -> dict:
        """Predict lifecycle costs (returns millions LKR)"""
        
        try:
            # Create feature array in correct order
            features = np.array([[
                data.get('construction_cost_per_sqft', 0),
                data.get('maintenance_cost_per_year', 0),
                data.get('energy_kwh_year', 0),
                data.get('energy_efficiency', 0),
                data.get('sustainability_score', 50),  # Default to middle if not provided
                data.get('energy_efficiency_per_sqft', 0),
                data.get('cost_per_sqft_for_sustainability', 0),
                data.get('energy_co2_impact_relative_to_cost', 0)
            ]])
            
            # Apply scaling if available
            if self.preprocessor and self.preprocessor.lifecycle_scaler:
                features = self.preprocessor.lifecycle_scaler.transform(features)
            
            # Make prediction (model outputs in millions LKR based on training)
            prediction = self.lifecycle_cost_model.predict(features, verbose=0)
            cost_millions = float(prediction[0][0])
            
            # Ensure positive
            cost_millions = max(0, cost_millions)
            cost_lkr = cost_millions * 1_000_000
            
            # Interpret
            if cost_millions < 20:
                interpretation = "Low lifecycle cost - economical project"
            elif cost_millions < 40:
                interpretation = "Moderate lifecycle cost"
            elif cost_millions < 60:
                interpretation = "Above average lifecycle cost"
            else:
                interpretation = "High lifecycle cost - consider optimizations"
            
            return {
                "lifecycle_cost_millions_lkr": round(cost_millions, 2),
                "lifecycle_cost_lkr": round(cost_lkr, 2),
                "interpretation": interpretation
            }
            
        except Exception as e:
            logger.error(f"Lifecycle cost prediction error: {str(e)}", exc_info=True)
            raise
    
    def predict_risk(self, data: dict) -> dict:
        """Predict project risk (binary classification)"""
        
        try:
            # Create feature array - note the different key names from request
            features = np.array([[
                data.get('design_completeness', 0),
                data.get('project_complexity_score', 0),
                data.get('change_order_frequency', 0),
                data.get('inflation_rate', 0),
                data.get('interest_rate', 0),
                data.get('contractor_experience_years', 0)
            ]])
            
            # Apply scaling if available
            if self.preprocessor and self.preprocessor.risk_scaler:
                features = self.preprocessor.risk_scaler.transform(features)
            
            # Make prediction (sigmoid output = probability)
            prediction = self.risk_prediction_model.predict(features, verbose=0)
            risk_probability = float(prediction[0][0])
            
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
            
            # Generate recommendations
            recommendations = []
            if data.get('design_completeness', 100) < 80:
                recommendations.append(f"Increase design completeness (currently {data.get('design_completeness', 0):.0f}%)")
            if data.get('project_complexity_score', 0) > 60:
                recommendations.append("Consider phased approach to reduce complexity")
            if data.get('change_order_frequency', 0) > 3:
                recommendations.append("Implement stricter change order controls")
            if data.get('inflation_rate', 0) > 8:
                recommendations.append("Include inflation contingency in budget")
            if data.get('contractor_experience_years', 20) < 5:
                recommendations.append("Consider partnering with more experienced contractor")
            
            if not recommendations:
                recommendations.append("Project parameters are within acceptable ranges")
            
            return {
                "is_high_risk": is_high_risk,
                "risk_probability": round(risk_probability, 3),
                "risk_level": risk_level,
                "recommendations": recommendations
            }
            
        except Exception as e:
            logger.error(f"Risk prediction error: {str(e)}", exc_info=True)
            raise