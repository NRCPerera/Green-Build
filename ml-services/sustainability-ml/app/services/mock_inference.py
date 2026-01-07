"""Mock inference service for development mode - matches actual model features"""

import logging
import random

logger = logging.getLogger(__name__)


class MockInferenceService:
    """Provides mock predictions for development and testing"""
    
    def predict_sustainability(self, data: dict) -> dict:
        """
        Mock sustainability score prediction.
        
        Features: energy_kwh_year, embodied_co2_tons, operational_co2_tons,
                  energy_efficiency, energy_efficiency_per_sqft,
                  cost_per_sqft_for_sustainability, energy_co2_impact_relative_to_cost
        """
        logger.info("Using MOCK sustainability prediction")
        
        # Generate realistic score based on input features
        energy_efficiency = data.get("energy_efficiency", 50)
        co2_impact = data.get("energy_co2_impact_relative_to_cost", 0.5)
        
        # Higher energy efficiency and lower CO2 impact = better score
        base_score = (energy_efficiency * 0.6) + ((1 - min(co2_impact, 1)) * 40)
        score = max(0, min(100, base_score + random.uniform(-5, 5)))
        
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
    
    def predict_lifecycle_cost(self, data: dict) -> dict:
        """
        Mock lifecycle cost prediction - Multi-Output Model.
        
        Returns 3 scaled predictions:
        - Initial Cost (scaled by 1,000,000)
        - Annual Maintenance Cost (scaled by 100,000)
        - Sustainability Cost Factor (scaled by 10,000)
        """
        logger.info("Using MOCK lifecycle cost prediction (Multi-Output)")
        
        # Get input features
        construction_cost_sqft = data.get("construction_cost_per_sqft", 13000)
        maintenance_cost_year = data.get("maintenance_cost_per_year", 520000)
        energy_efficiency = data.get("energy_efficiency", 72)
        sustainability_score = data.get("sustainability_score", 65)
        area_sqft = data.get("area_sqft", 2000)
        
        # Generate realistic scaled predictions (as if from multi-output model)
        # Simulating model output that's been scaled down during training
        
        # Initial cost typically 20-80 million LKR, so scaled value 20-80
        base_initial = construction_cost_sqft * area_sqft / 1_000_000
        scaled_initial = base_initial * random.uniform(0.95, 1.05)
        
        # Annual maintenance 300k-1M LKR, so scaled value 3-10
        scaled_maintenance = (maintenance_cost_year / 100_000) * random.uniform(0.9, 1.1)
        
        # Sustainability cost factor 100-500 LKR/sqft, so scaled value 0.01-0.05
        base_sust = construction_cost_sqft * 0.15 / 10_000
        scaled_sust = base_sust * (1 + (sustainability_score / 100) * 0.3) * random.uniform(0.95, 1.05)
        
        # Return in multi-output format (scaled values as model would return)
        return {
            "multi_output_predictions": [scaled_initial, scaled_maintenance, scaled_sust],
            "is_multioutput": True
        }
    
    def predict_risk(self, data: dict) -> dict:
        """
        Mock risk prediction.
        
        Features: design_completeness, project_complexity_score, change_order_frequency,
                  inflation_rate, interest_rate, contractor_experience_years
        """
        logger.info("Using MOCK risk prediction")
        
        # Calculate risk based on input factors
        design_completeness = data.get("design_completeness", 80)
        complexity = data.get("project_complexity_score", 50)
        change_orders = data.get("change_order_frequency", 2)
        inflation = data.get("inflation_rate", 5)
        interest = data.get("interest_rate", 10)
        experience = data.get("contractor_experience_years", 10)
        
        # Risk factors (higher = more risk)
        risk_score = 0
        risk_score += (100 - design_completeness) * 0.25  # Low completeness = high risk
        risk_score += complexity * 0.2  # High complexity = high risk
        risk_score += change_orders * 5  # More change orders = high risk
        risk_score += inflation * 2  # High inflation = moderate risk
        risk_score += interest * 1  # High interest = some risk
        risk_score -= experience * 1.5  # More experience = lower risk
        
        # Normalize to 0-1 probability
        risk_probability = max(0, min(1, risk_score / 100))
        
        is_high_risk = risk_probability > 0.5
        
        if risk_probability < 0.3:
            risk_level = "low"
        elif risk_probability < 0.6:
            risk_level = "medium"
        else:
            risk_level = "high"
        
        # Generate recommendations based on factors
        recommendations = []
        if design_completeness < 80:
            recommendations.append(f"Increase design completeness (currently {design_completeness}%)")
        if complexity > 60:
            recommendations.append("Consider phased approach to reduce complexity")
        if change_orders > 3:
            recommendations.append("Implement stricter change order controls")
        if inflation > 8:
            recommendations.append("Include inflation contingency in budget")
        if experience < 5:
            recommendations.append("Consider partnering with more experienced contractor")
        
        if not recommendations:
            recommendations.append("Project parameters are within acceptable ranges")
        
        return {
            "is_high_risk": is_high_risk,
            "risk_probability": round(risk_probability, 3),
            "risk_level": risk_level,
            "recommendations": recommendations
        }