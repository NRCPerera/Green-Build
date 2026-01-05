"""Mock inference service for development mode"""

import logging
import random

logger = logging.getLogger(__name__)


class MockInferenceService:
    """Provides mock predictions for development and testing"""
    
    def predict_sustainability(self, data: dict) -> dict:
        """Mock sustainability score prediction"""
        
        logger.info("Using MOCK sustainability prediction")
        
        # Generate realistic mock data
        score = random.uniform(40, 95)
        confidence = random.uniform(0.75, 0.95)
        
        if score >= 80:
            interpretation = "Excellent sustainability rating"
        elif score >= 60:
            interpretation = "Good sustainability rating"
        elif score >= 40:
            interpretation = "Fair sustainability rating"
        else:
            interpretation = "Poor sustainability rating"
        
        return {
            "sustainability_score": round(score, 2),
            "confidence": round(confidence, 2),
            "interpretation": interpretation
        }
    
    def predict_lifecycle_cost(self, data: dict) -> dict:
        """Mock lifecycle cost prediction"""
        
        logger.info("Using MOCK lifecycle cost prediction")
        
        # Generate realistic mock costs
        total_cost = random.uniform(1000000, 5000000)
        annual_cost = total_cost * random.uniform(0.04, 0.06)
        maintenance_cost = total_cost * random.uniform(0.25, 0.35)
        
        return {
            "total_lifecycle_cost": round(total_cost, 2),
            "annual_operating_cost": round(annual_cost, 2),
            "maintenance_cost": round(maintenance_cost, 2),
            "currency": "USD"
        }
    
    def predict_risk(self, data: dict) -> dict:
        """Mock risk prediction"""
        
        logger.info("Using MOCK risk prediction")
        
        # Generate mock risk assessment
        risk_score = random.uniform(0, 100)
        
        if risk_score < 30:
            risk_level = "low"
            risk_factors = [
                "Minimal environmental concerns",
                "Good regulatory compliance"
            ]
            recommendations = [
                "Continue current practices",
                "Monitor regularly",
                "Maintain documentation"
            ]
        elif risk_score < 70:
            risk_level = "medium"
            risk_factors = [
                "Moderate environmental impact",
                "Regulatory compliance needed",
                "Climate considerations"
            ]
            recommendations = [
                "Implement sustainability measures",
                "Regular compliance audits",
                "Update environmental policies"
            ]
        else:
            risk_level = "high"
            risk_factors = [
                "High environmental impact",
                "Compliance risks identified",
                "Climate vulnerability",
                "Resource depletion concerns"
            ]
            recommendations = [
                "Immediate action required",
                "Comprehensive mitigation plan",
                "Expert consultation needed",
                "Consider project redesign"
            ]
        
        return {
            "risk_level": risk_level,
            "risk_score": round(risk_score, 2),
            "risk_factors": risk_factors,
            "recommendations": recommendations
        }
