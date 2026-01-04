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
        self.threshold = 0.5
        logger.info("✓ Mock Inference Service initialized (Development Mode)")
    
    def predict(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate mock predictions based on input features
        
        Args:
            data: Dictionary of input features
            
        Returns:
            Dictionary with mock prediction results
        """
        
        logger.info("Running mock prediction (Development Mode)")
        
        # Create deterministic seed from input data (same input = same output)
        data_string = json.dumps(data, sort_keys=True)
        data_hash = hashlib.md5(data_string.encode()).hexdigest()
        seed_value = int(data_hash[:8], 16)
        random.seed(seed_value)
        
        # Calculate risk score based on available features
        risk_factors = 0
        total_factors = 0
        
        # Check various risk indicators if present
        if "Time_overrun_months" in data and data["Time_overrun_months"]:
            total_factors += 1
            if data["Time_overrun_months"] > 10:
                risk_factors += 1
        
        if "Change_Order_Frequency" in data and data["Change_Order_Frequency"]:
            total_factors += 1
            if data["Change_Order_Frequency"] > 0.5:
                risk_factors += 1
        
        if "Design_Completeness" in data and data["Design_Completeness"]:
            total_factors += 1
            if data["Design_Completeness"] < 0.5:
                risk_factors += 1
        
        if "Project_Complexity_Score" in data and data["Project_Complexity_Score"]:
            total_factors += 1
            if data["Project_Complexity_Score"] > 0.5:
                risk_factors += 1
        
        if "Contractor_Experience_Years" in data and data["Contractor_Experience_Years"]:
            total_factors += 1
            if data["Contractor_Experience_Years"] < 5:
                risk_factors += 1
        
        if "Inflation_Rate" in data and data["Inflation_Rate"]:
            total_factors += 1
            if data["Inflation_Rate"] > 0.15:
                risk_factors += 1
        
        # Calculate probability based on risk factors
        if total_factors > 0:
            base_probability = risk_factors / total_factors
        else:
            base_probability = 0.5
        
        # Add some randomness
        overrun_probability = min(max(base_probability + random.uniform(-0.1, 0.1), 0), 1)
        
        # Mock cost overrun percentage (always positive for realistic predictions)
        if overrun_probability > 0.7:
            cost_overrun_pct = random.uniform(20, 40)
        elif overrun_probability > 0.5:
            cost_overrun_pct = random.uniform(10, 20)
        elif overrun_probability > 0.3:
            cost_overrun_pct = random.uniform(5, 12)
        else:
            cost_overrun_pct = random.uniform(2, 8)
        
        # Classification
        high_risk_label = overrun_probability >= self.threshold
        
        result = {
            "predicted_cost_overrun_pct": round(cost_overrun_pct, 2),
            "overrun_probability": round(overrun_probability, 4),
            "high_risk_label": high_risk_label,
            "threshold": self.threshold
        }
        
        logger.info(f"Mock prediction: {result}")
        
        return result
