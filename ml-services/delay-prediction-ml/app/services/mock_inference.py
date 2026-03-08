"""Development mode - Mock predictions without models

Generates deterministic mock predictions using input features
for testing when trained models are not available.

Categories match the training pipeline:
- No Delay: 0 days
- Minor Delay: 1-30 days
- Major Delay: 31-90 days
- Critical Delay: >90 days
"""

import logging
import random
import hashlib
import json
from typing import Dict, Any

logger = logging.getLogger(__name__)


class MockInferenceService:
    """Mock inference service for testing without trained models"""
    
    def __init__(self):
        self.delay_categories = ["No Delay", "Minor Delay", "Major Delay", "Critical Delay"]
        logger.info("✓ Mock Inference Service initialized (Development Mode)")
    
    def _get_deterministic_seed(self, data: Dict[str, Any]) -> int:
        """Create deterministic seed from input data"""
        data_string = json.dumps(data, sort_keys=True, default=str)
        data_hash = hashlib.md5(data_string.encode()).hexdigest()
        return int(data_hash[:8], 16)
    
    def _calculate_risk_score(self, data: Dict[str, Any]) -> float:
        """
        Calculate a risk score based on input features.
        
        Uses the new feature set from the ensemble training scripts:
        - Weather_Impact_Days, Contractor_Experience_Years, Material_Delivery_Delay_Days,
        - Design_Change_Orders, Payment_Delay_Days, Labour_Pool_Size, etc.
        """
        risk_factors = 0
        total_factors = 0
        
        # Weather Impact (higher = more risk)
        if "Weather_Impact_Days" in data:
            total_factors += 1
            if data["Weather_Impact_Days"] > 20:
                risk_factors += 1
        
        # Contractor experience (lower = more risk)
        if "Contractor_Experience_Years" in data:
            total_factors += 1
            if data["Contractor_Experience_Years"] < 5:
                risk_factors += 1
        
        # Material Delivery Delay (higher = more risk)
        if "Material_Delivery_Delay_Days" in data:
            total_factors += 1
            if data["Material_Delivery_Delay_Days"] > 10:
                risk_factors += 1
        
        # Design Change Orders (higher = more risk)
        if "Design_Change_Orders" in data:
            total_factors += 1
            if data["Design_Change_Orders"] > 3:
                risk_factors += 1
        
        # Payment Delay Days (higher = more risk)
        if "Payment_Delay_Days" in data:
            total_factors += 1
            if data["Payment_Delay_Days"] > 15:
                risk_factors += 1
        
        # Labour Pool Size (lower = more risk)
        if "Labour_Pool_Size" in data:
            total_factors += 1
            if data["Labour_Pool_Size"] < 30:
                risk_factors += 1
            
        # Contractor Past Delay Rate (higher = more risk)
        if "Contractor_Past_Delay_Rate" in data:
            total_factors += 1
            if data["Contractor_Past_Delay_Rate"] > 0.3:
                risk_factors += 1
        
        # Planned Duration (longer = more risk)
        if "Planned_Duration_Days" in data:
            total_factors += 1
            if data["Planned_Duration_Days"] > 500:
                risk_factors += 1
        
        if total_factors > 0:
            return risk_factors / total_factors
        return 0.5
    
    def predict_regression(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate mock regression predictions.
        
        Returns predicted delay days, P10/P90 quantiles, severity, and mock SHAP values.
        """
        logger.info("Running mock regression prediction (Development Mode)")
        
        random.seed(self._get_deterministic_seed(data))
        risk_score = self._calculate_risk_score(data)
        
        # Calculate mock delay days based on risk
        if risk_score > 0.7:
            delay_days = random.uniform(90, 200)
        elif risk_score > 0.5:
            delay_days = random.uniform(31, 90)
        elif risk_score > 0.3:
            delay_days = random.uniform(10, 30)
        else:
            delay_days = random.uniform(0, 10)
        
        # P10/P90 quantiles
        p10_delay_days = max(0, delay_days * 0.7)
        p90_delay_days = delay_days * 1.4
        
        # Severity
        if delay_days <= 0:
            severity = "No Delay"
        elif delay_days <= 30:
            severity = "Minor Delay (1-30 days)"
        elif delay_days <= 90:
            severity = "Major Delay (31-90 days)"
        else:
            severity = "Critical Delay (>90 days)"
        
        # Mock SHAP values (top features)
        shap_dict = {}
        if "Weather_Impact_Days" in data:
            shap_dict["Weather_Impact_Days"] = round(random.uniform(0.5, 3.0), 3)
        if "Contractor_Experience_Years" in data:
            shap_dict["Contractor_Experience_Years"] = round(random.uniform(-2.0, -0.5), 3)
        if "Material_Delivery_Delay_Days" in data:
            shap_dict["Material_Delivery_Delay_Days"] = round(random.uniform(0.3, 2.5), 3)
        if "Design_Change_Orders" in data:
            shap_dict["Design_Change_Orders"] = round(random.uniform(0.2, 1.5), 3)
        if "Payment_Delay_Days" in data:
            shap_dict["Payment_Delay_Days"] = round(random.uniform(0.1, 1.0), 3)
        if "Labour_Pool_Size" in data:
            shap_dict["Labour_Pool_Size"] = round(random.uniform(-1.5, -0.2), 3)
        
        result = {
            "predicted_delay_days": round(delay_days, 2),
            "delay_severity": severity,
            "p10_delay_days": round(p10_delay_days, 2),
            "p90_delay_days": round(p90_delay_days, 2),
            "shap_values": shap_dict if shap_dict else None,
        }
        
        logger.info(f"Mock regression result: {result['predicted_delay_days']} days ({severity})")
        return result
    
    def predict_classification(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate mock classification predictions.
        
        Returns predicted category, confidence, class probabilities, and mock SHAP values.
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
        probs = [max(0.01, p + random.uniform(-0.05, 0.05)) for p in probs]
        total = sum(probs)
        probs = [p / total for p in probs]  # Normalize
        
        # Determine predicted category
        category_index = probs.index(max(probs))
        predicted_category = self.delay_categories[category_index]
        confidence = probs[category_index]
        
        will_delay = predicted_category != "No Delay"
        
        # Build probability dictionary
        prob_dict = {cat: round(prob, 4) for cat, prob in zip(self.delay_categories, probs)}
        
        # Mock SHAP values
        shap_dict = {}
        if "Weather_Impact_Days" in data:
            shap_dict["Weather_Impact_Days"] = round(random.uniform(0.02, 0.15), 3)
        if "Contractor_Experience_Years" in data:
            shap_dict["Contractor_Experience_Years"] = round(random.uniform(-0.1, -0.03), 3)
        if "Material_Delivery_Delay_Days" in data:
            shap_dict["Material_Delivery_Delay_Days"] = round(random.uniform(0.02, 0.1), 3)
        
        result = {
            "predicted_category": predicted_category,
            "will_delay": will_delay,
            "confidence": round(confidence, 4),
            "class_probabilities": prob_dict,
            "shap_values": shap_dict if shap_dict else None,
        }
        
        logger.info(f"Mock classification result: {predicted_category} ({confidence:.4f})")
        return result
