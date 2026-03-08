import numpy as np
from ..config import (
    ENERGY_RATING_MAP, MATERIAL_COST_MAP, MATERIAL_CO2_FACTOR, 
    MATERIAL_PRICE_INDEX, MATERIAL_MAINTENANCE_INTERVAL
)
from ..models.schemas import SustainabilityInput

def resolve_efficiency(raw_rating: str) -> float:
    try:
        val = float(raw_rating)
        if 0.0 < val <= 1.0:
            return val
    except ValueError:
        pass
    return ENERGY_RATING_MAP.get(raw_rating.upper(), 0.6)

def build_feature_vector(inp: SustainabilityInput) -> np.ndarray:
    area_m2   = inp.area
    lifespan  = inp.lifespan
    mat       = inp.material.lower()
    renewable = inp.renewablePercent
    efficiency = resolve_efficiency(inp.energyRating)

    import hashlib
    seed_str = f"{area_m2:.2f}_{lifespan}_{mat}_{renewable:.2f}"
    seed_hash = int(hashlib.sha256(seed_str.encode()).hexdigest()[:8], 16)
    noise = ((seed_hash % 1000) / 1000.0 - 0.5) * 0.06
    efficiency = max(0.05, min(efficiency + noise, 1.0))

    cost_m2    = MATERIAL_COST_MAP.get(mat, 120.0)
    co2_factor = MATERIAL_CO2_FACTOR.get(mat, 0.12)

    area_sqft = area_m2 * 10.764
    floors = max(1.0, min(area_m2 / 150.0, 5.0))
    initial_period_construction = max(6.0, min(area_m2 / 50.0, 36.0))
    project_complexity = min(3.0 + area_m2 / 5000.0 + (cost_m2 / 100.0), 10.0)
    inflation_rate = 3.5
    material_price_index = MATERIAL_PRICE_INDEX.get(mat, 1.0)
    exchange_rate = 325.0
    interest_rate = 6.0
    contractor_experience = 10.0
    contractor_previous_projects = 25.0
    construction_cost_per_sqft = cost_m2
    maintenance_cost_per_year = area_m2 * 5.0 * (1.0 + (1.0 - efficiency) * 0.5)
    energy_efficiency = efficiency
    embodied_co2_tons = area_m2 * co2_factor
    energy_kwh_year = area_m2 * 15.0 * (1.0 - efficiency * 0.5) * (1.0 - renewable / 200.0)
    operational_co2_tons = energy_kwh_year * 0.0004 * lifespan
    maintenance_interval_years = MATERIAL_MAINTENANCE_INTERVAL.get(mat, 5.0)

    features = np.array([
        area_sqft, floors, initial_period_construction, project_complexity,
        inflation_rate, material_price_index, exchange_rate, interest_rate,
        contractor_experience, contractor_previous_projects,
        construction_cost_per_sqft, maintenance_cost_per_year,
        energy_efficiency, embodied_co2_tons, operational_co2_tons,
        maintenance_interval_years,
    ], dtype=np.float64).reshape(1, -1)

    return features

def generate_recommendations(material: str, renewable: float) -> list[str]:
    recs: list[str] = []
    mat = material.lower()

    if renewable < 30:
        recs.append("Increase renewable energy integration to at least 30 % to significantly reduce operational carbon emissions.")
    elif renewable < 70:
        recs.append("Consider expanding renewable energy share beyond 70 % for maximum long-term savings and carbon neutrality.")

    if mat in ("concrete", "steel"):
        recs.append(f"Explore low-carbon alternatives to {mat} such as recycled aggregates, cross-laminated timber (CLT), or green cement to lower embodied CO₂.")
    elif mat == "wood":
        recs.append("Ensure wood is FSC-certified and consider mass-timber construction for enhanced structural sustainability.")

    recs.append("Implement a building energy management system (BEMS) to monitor and optimise energy consumption throughout the project lifespan.")

    return recs[:3]