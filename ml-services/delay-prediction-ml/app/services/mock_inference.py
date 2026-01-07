"""Development mode - Mock predictions without models"""

import logging
import random
import hashlib
import json
from typing import Dict, Any

logger = logging.getLogger(__name__)


class MockInferenceService:
    """Mock inference service for testing without trained models"""
    
    def __init__(self):
        self.delay_categories = ["On-Time", "Minor Delay", "Major Delay", "Critical Delay"]
        logger.info("✓ Mock Inference Service initialized (Development Mode)")
    
    def _get_deterministic_seed(self, data: Dict[str, Any]) -> int:
        """Create deterministic seed from input data"""
        data_string = json.dumps(data, sort_keys=True, default=str)
        data_hash = hashlib.md5(data_string.encode()).hexdigest()
        return int(data_hash[:8], 16)
    
    def _calculate_risk_score(self, data: Dict[str, Any]) -> float:
        """Calculate a risk score based on input features"""
        risk_factors = 0
        total_factors = 0
        
        # Check various risk indicators
        if "Weather_Impact_Score" in data:
            total_factors += 1
            if data["Weather_Impact_Score"] > 3:
                risk_factors += 1
        
        if "Contractor_Experience_Years" in data:
            total_factors += 1
            if data["Contractor_Experience_Years"] < 5:
                risk_factors += 1
        
        if "Labor_Availability_Score" in data:
            total_factors += 1
            if data["Labor_Availability_Score"] < 3:
                risk_factors += 1
        
        if "Inflation_Rate" in data:
            total_factors += 1
            if data["Inflation_Rate"] > 0.1:
                risk_factors += 1
        
        if "Equipment_Availability_Score" in data:
            total_factors += 1
            if data["Equipment_Availability_Score"] < 3:
                risk_factors += 1
        
        if "Planned_Duration_Days" in data:
            total_factors += 1
            if data["Planned_Duration_Days"] > 500:
                risk_factors += 1
        
        if total_factors > 0:
            return risk_factors / total_factors
        return 0.5
    
    def predict_regression(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate mock regression predictions
        
        Args:
            data: Dictionary of input features
            
        Returns:
            Dictionary with mock prediction results
        """
        logger.info("Running mock regression prediction (Development Mode)")
        
        random.seed(self._get_deterministic_seed(data))
        risk_score = self._calculate_risk_score(data)
        
        # Calculate mock delay days based on risk
        if risk_score > 0.7:
            delay_days = random.uniform(150, 300)
        elif risk_score > 0.5:
            delay_days = random.uniform(60, 150)
        elif risk_score > 0.3:
            delay_days = random.uniform(20, 60)
        else:
            delay_days = random.uniform(0, 30)
        
        # Determine severity
        if delay_days <= 0:
            severity = "On-Time (No Delay)"
        elif delay_days <= 30:
            severity = "Minor Delay (1-30 days)"
        elif delay_days <= 60:
            severity = "Moderate Delay (31-60 days)"
        elif delay_days <= 180:
            severity = "Major Delay (61-180 days)"
        else:
            severity = "Critical Delay (>180 days)"
        
        result = {
            "predicted_delay_days": round(delay_days, 2),
            "delay_severity": severity
        }
        
        logger.info(f"Mock regression result: {result}")
        return result
    
    def predict_classification(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate mock classification predictions
        
        Args:
            data: Dictionary of input features
            
        Returns:
            Dictionary with mock classification results
        """
        logger.info("Running mock classification prediction (Development Mode)")
        
        random.seed(self._get_deterministic_seed(data))
        risk_score = self._calculate_risk_score(data)
        
        # Generate mock probabilities based on risk score
        if risk_score > 0.7:
            probs = [0.05, 0.10, 0.30, 0.55]
        elif risk_score > 0.5:
            probs = [0.10, 0.20, 0.45, 0.25]
        elif risk_score > 0.3:
            probs = [0.20, 0.45, 0.25, 0.10]
        else:
            probs = [0.55, 0.30, 0.10, 0.05]
        
        # Add some randomness
        probs = [max(0, p + random.uniform(-0.05, 0.05)) for p in probs]
        total = sum(probs)
        probs = [p / total for p in probs]  # Normalize
        
        # Determine predicted category
        category_index = probs.index(max(probs))
        predicted_category = self.delay_categories[category_index]
        confidence = probs[category_index]
        
        # Build probability dictionary
        prob_dict = {cat: round(prob, 4) for cat, prob in zip(self.delay_categories, probs)}
        
        result = {
            "predicted_category": predicted_category,
            "category_index": category_index,
            "confidence": round(confidence, 4),
            "class_probabilities": prob_dict
        }
        
        logger.info(f"Mock classification result: {result}")
        return result
