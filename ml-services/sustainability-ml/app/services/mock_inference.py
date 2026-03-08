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
            "interpretation": interpretation,
            "confidence_interval": {
                "lower": round(max(0, score - random.uniform(3, 8)), 2),
                "median": round(score, 2),
                "upper": round(min(100, score + random.uniform(3, 8)), 2),
                "std": round(random.uniform(1, 5), 2)
            },
            "shap_explanation": {
                "available": True,
                "shap_values": {
                    "Energy (kWh/yr)": round(random.uniform(-5, 5), 4),
                    "Embodied CO\u2082 (tons)": round(random.uniform(-3, 3), 4),
                    "Operational CO\u2082 (tons)": round(random.uniform(-4, 2), 4),
                    "Energy Efficiency": round(random.uniform(0, 8), 4),
                    "Efficiency per sqft": round(random.uniform(-2, 2), 4),
                    "Cost/sqft for Sustainability": round(random.uniform(-1, 4), 4),
                    "CO\u2082 Impact vs Cost": round(random.uniform(-3, 1), 4)
                },
                "top_drivers": [
                    {"feature": "Energy Efficiency", "impact": round(random.uniform(2, 8), 2), "direction": "increases", "description": "Energy Efficiency increases the prediction by " + str(round(random.uniform(2, 8), 2))},
                    {"feature": "Energy (kWh/yr)", "impact": round(random.uniform(-5, -1), 2), "direction": "decreases", "description": "Energy (kWh/yr) decreases the prediction by " + str(round(random.uniform(1, 5), 2))},
                    {"feature": "Embodied CO\u2082 (tons)", "impact": round(random.uniform(-3, 3), 2), "direction": "increases", "description": "Embodied CO\u2082 adjusts the prediction by " + str(round(random.uniform(0, 3), 2))}
                ],
                "feature_values": {},
                "model": "sustainability (mock)"
            }
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
            "is_multioutput": True,
            "confidence_interval": {
                "lower_millions": round(max(0, scaled_initial * 0.85), 2),
                "median_millions": round(scaled_initial, 2),
                "upper_millions": round(scaled_initial * 1.15, 2),
                "lower_lkr": round(max(0, scaled_initial * 0.85) * 1_000_000, 2),
                "upper_lkr": round(scaled_initial * 1.15 * 1_000_000, 2),
                "std_millions": round(random.uniform(0.5, 3), 2)
            },
            "shap_explanation": {
                "available": True,
                "shap_values": {
                    "Construction Cost/sqft": round(random.uniform(-3, 6), 4),
                    "Maintenance Cost/yr": round(random.uniform(-2, 4), 4),
                    "Energy (kWh/yr)": round(random.uniform(-1, 2), 4),
                    "Energy Efficiency": round(random.uniform(-3, 1), 4),
                    "Sustainability Score": round(random.uniform(-2, 3), 4),
                    "Efficiency per sqft": round(random.uniform(-1, 1), 4),
                    "Cost/sqft for Sustainability": round(random.uniform(-2, 2), 4),
                    "CO\u2082 Impact vs Cost": round(random.uniform(-1, 1), 4)
                },
                "top_drivers": [
                    {"feature": "Construction Cost/sqft", "impact": round(random.uniform(2, 6), 2), "direction": "increases", "description": "Construction Cost/sqft increases lifecycle cost by " + str(round(random.uniform(2, 6), 2))},
                    {"feature": "Energy Efficiency", "impact": round(random.uniform(-3, -1), 2), "direction": "decreases", "description": "Energy Efficiency reduces lifecycle cost by " + str(round(random.uniform(1, 3), 2))}
                ],
                "feature_values": {},
                "model": "lifecycle (mock)"
            }
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
            "recommendations": recommendations,
            "confidence_interval": {
                "lower": round(max(0, risk_probability - random.uniform(0.05, 0.15)), 3),
                "median": round(risk_probability, 3),
                "upper": round(min(1, risk_probability + random.uniform(0.05, 0.15)), 3),
                "std": round(random.uniform(0.02, 0.08), 3)
            },
            "shap_explanation": {
                "available": True,
                "shap_values": {
                    "Design Completeness": round((100 - design_completeness) * 0.005, 4),
                    "Project Complexity": round(complexity * 0.003, 4),
                    "Change Order Frequency": round(change_orders * 0.02, 4),
                    "Inflation Rate": round(inflation * 0.01, 4),
                    "Interest Rate": round(interest * 0.005, 4),
                    "Contractor Experience (yrs)": round(-experience * 0.01, 4)
                },
                "top_drivers": [
                    {"feature": "Design Completeness", "impact": round((100 - design_completeness) * 0.005, 2), "direction": "increases" if design_completeness < 80 else "decreases", "description": f"Design Completeness ({design_completeness}%) " + ("increases" if design_completeness < 80 else "decreases") + f" risk by {abs((100 - design_completeness) * 0.005):.2f}"},
                    {"feature": "Contractor Experience (yrs)", "impact": round(-experience * 0.01, 2), "direction": "decreases", "description": f"Contractor Experience ({experience} yrs) decreases risk by {abs(experience * 0.01):.2f}"}
                ],
                "feature_values": {},
                "model": "risk (mock)"
            }
        }