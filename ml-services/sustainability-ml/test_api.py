"""
Test script for the Sustainability Prediction API

Run the API first with: python run.py
Then run this script in another terminal: python test_api.py
"""

import requests
import json

BASE_URL = "http://localhost:8003"


def test_health():
    """Test health endpoint"""
    print("\n" + "=" * 60)
    print("Testing Health Endpoint")
    print("=" * 60)
    
    response = requests.get(f"{BASE_URL}/health")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")


def test_sustainability_prediction():
    """Test sustainability prediction"""
    print("\n" + "=" * 60)
    print("Testing Sustainability Prediction")
    print("=" * 60)
    
    data = {
        "material_type": "recycled_steel",
        "energy_efficiency": 85.5,
        "water_usage": 1200.0,
        "carbon_footprint": 450.0,
        "renewable_energy_percentage": 60.0,
        "waste_management_score": 75.0
    }
    
    response = requests.post(f"{BASE_URL}/predict/sustainability", json=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")


def test_lifecycle_cost():
    """Test lifecycle cost prediction"""
    print("\n" + "=" * 60)
    print("Testing Lifecycle Cost Prediction")
    print("=" * 60)
    
    data = {
        "project_size": 5000.0,
        "building_type": "commercial",
        "material_quality": "premium",
        "energy_systems": "solar_hvac",
        "maintenance_plan": "comprehensive"
    }
    
    response = requests.post(f"{BASE_URL}/predict/lifecycle-cost", json=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")


def test_risk_prediction():
    """Test risk prediction"""
    print("\n" + "=" * 60)
    print("Testing Risk Prediction")
    print("=" * 60)
    
    data = {
        "location": "coastal",
        "climate_zone": "tropical",
        "regulatory_compliance": 85.0,
        "environmental_impact": 65.0
    }
    
    response = requests.post(f"{BASE_URL}/predict/risk", json=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")


if __name__ == "__main__":
    try:
        test_health()
        test_sustainability_prediction()
        test_lifecycle_cost()
        test_risk_prediction()
        
        print("\n" + "=" * 60)
        print("All tests completed!")
        print("=" * 60)
        
    except requests.exceptions.ConnectionError:
        print("\n❌ Error: Could not connect to API")
        print("Make sure the API is running with: python run.py")
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
