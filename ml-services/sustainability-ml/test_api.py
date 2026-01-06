"""
Test script for Sustainability ML API

Tests all endpoints with sample data matching actual model features.
"""

import requests
import json

BASE_URL = "http://localhost:8003"


def test_health():
    """Test health endpoint"""
    print("\n" + "="*60)
    print("Testing Health Endpoint")
    print("="*60)
    
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False


def test_sustainability_prediction():
    """Test sustainability score prediction"""
    print("\n" + "="*60)
    print("Testing Sustainability Score Prediction")
    print("="*60)
    
    data = {
        "energy_kwh_year": 15000.0,
        "embodied_co2_tons": 45.0,
        "operational_co2_tons": 12.0,
        "energy_efficiency": 75.0,
        "energy_efficiency_per_sqft": 0.85,
        "cost_per_sqft_for_sustainability": 250.0,
        "energy_co2_impact_relative_to_cost": 0.15
    }
    
    print(f"Request: {json.dumps(data, indent=2)}")
    
    try:
        response = requests.post(
            f"{BASE_URL}/predict/sustainability",
            json=data,
            timeout=30
        )
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False


def test_lifecycle_cost_prediction():
    """Test lifecycle cost prediction"""
    print("\n" + "="*60)
    print("Testing Lifecycle Cost Prediction")
    print("="*60)
    
    data = {
        "construction_cost_per_sqft": 12000.0,
        "maintenance_cost_per_year": 150000.0,
        "energy_kwh_year": 15000.0,
        "energy_efficiency": 75.0,
        "sustainability_score": 72.0,
        "energy_efficiency_per_sqft": 0.85,
        "cost_per_sqft_for_sustainability": 250.0,
        "energy_co2_impact_relative_to_cost": 0.15
    }
    
    print(f"Request: {json.dumps(data, indent=2)}")
    
    try:
        response = requests.post(
            f"{BASE_URL}/predict/lifecycle-cost",
            json=data,
            timeout=30
        )
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False


def test_risk_prediction():
    """Test risk prediction"""
    print("\n" + "="*60)
    print("Testing Risk Prediction")
    print("="*60)
    
    data = {
        "design_completeness": 85.0,
        "project_complexity_score": 65.0,
        "change_order_frequency": 3.5,
        "inflation_rate": 6.5,
        "interest_rate": 12.0,
        "contractor_experience_years": 15.0
    }
    
    print(f"Request: {json.dumps(data, indent=2)}")
    
    try:
        response = requests.post(
            f"{BASE_URL}/predict/risk",
            json=data,
            timeout=30
        )
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False


def test_full_analysis():
    """Test full analysis (all 3 models)"""
    print("\n" + "="*60)
    print("Testing Full Analysis (All 3 Models)")
    print("="*60)
    
    data = {
        # Sustainability features
        "energy_kwh_year": 15000.0,
        "embodied_co2_tons": 45.0,
        "operational_co2_tons": 12.0,
        "energy_efficiency": 75.0,
        "energy_efficiency_per_sqft": 0.85,
        "cost_per_sqft_for_sustainability": 250.0,
        "energy_co2_impact_relative_to_cost": 0.15,
        
        # Lifecycle cost features
        "construction_cost_per_sqft": 12000.0,
        "maintenance_cost_per_year": 150000.0,
        
        # Risk features
        "design_completeness": 85.0,
        "project_complexity_score": 65.0,
        "change_order_frequency": 3.5,
        "inflation_rate": 6.5,
        "interest_rate": 12.0,
        "contractor_experience_years": 15.0
    }
    
    print(f"Request: {json.dumps(data, indent=2)}")
    
    try:
        response = requests.post(
            f"{BASE_URL}/predict/full-analysis",
            json=data,
            timeout=30
        )
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False


def main():
    """Run all tests"""
    print("\n" + "#"*60)
    print("# Sustainability ML API Test Suite")
    print("#"*60)
    
    results = {
        "Health": test_health(),
        "Sustainability Score": test_sustainability_prediction(),
        "Lifecycle Cost": test_lifecycle_cost_prediction(),
        "Risk Prediction": test_risk_prediction(),
        "Full Analysis": test_full_analysis()
    }
    
    print("\n" + "="*60)
    print("Test Results Summary")
    print("="*60)
    
    for test_name, passed in results.items():
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"  {test_name}: {status}")
    
    all_passed = all(results.values())
    print("\n" + "="*60)
    if all_passed:
        print("🎉 All tests passed!")
    else:
        print("⚠️ Some tests failed. Check the output above.")
    print("="*60 + "\n")
    
    return all_passed


if __name__ == "__main__":
    main()
