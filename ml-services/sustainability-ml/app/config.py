from pathlib import Path

APP_DIR = Path(__file__).parent
MODELS_DIR = APP_DIR.parent / "models"
SCALER_PATH = MODELS_DIR / "common_scaler.pkl"
LCC_TARGET_SCALER_PATH = MODELS_DIR / "lcc_target_scaler.pkl"
SUSTAIN_TARGET_SCALER_PATH = MODELS_DIR / "sustain_target_scaler.pkl"
LIFECYCLE_MODEL_PATH = MODELS_DIR / "lifecycle_cost_model.keras"
SUSTAINABILITY_MODEL_PATH = MODELS_DIR / "sustainability_model.keras"
RISK_MODEL_PATH = MODELS_DIR / "risk_prediction_model.keras"

MATERIAL_COST_MAP: dict[str, float] = {
    "concrete":     120.0, "steel":        180.0, "wood":          90.0,
    "timber":        90.0, "brick":        100.0, "cement block": 110.0,
    "pre-cast":     135.0, "glass":        160.0, "composite":    150.0,
}

CIDA_BASE_RATE_PER_SQFT = 18_500.0
CIDA_MATERIAL_ADJUSTMENT: dict[str, float] = {
    "brick": 1.08, "cement block": 0.97, "concrete": 1.08,
    "pre-cast": 1.12, "steel": 1.25, "timber": 0.90,
    "wood": 0.90, "glass": 1.30, "composite": 1.15,
}

CIDA_BOQ_ELEMENTS = [
    ("Substructure (Foundation)", 0.15),
    ("Superstructure (Walls/Roof)", 0.45),
    ("Finishes", 0.25),
    ("MEP (Electrical/Plumbing)", 0.15),
]

ENERGY_RATING_MAP: dict[str, float] = {
    "1.0": 1.0, "0.8": 0.8, "0.6": 0.6, "0.4": 0.4,
    "A+": 0.98, "A": 1.0, "B": 0.8, "C": 0.6,
    "D": 0.4, "E": 0.30, "F": 0.20, "G": 0.10,
}

MATERIAL_RISK_FACTOR: dict[str, float] = {
    "concrete": 0.15, "steel": 0.20, "brick": 0.22,
    "cement block": 0.18, "pre-cast": 0.16, "timber": 0.40,
    "wood": 0.40, "glass": 0.50, "composite": 0.30,
}

MATERIAL_CO2_FACTOR: dict[str, float] = {
    "concrete": 0.15, "steel": 0.20, "wood": 0.05,
    "timber": 0.05, "brick": 0.12, "cement block": 0.13,
    "pre-cast": 0.14, "glass": 0.18, "composite": 0.10,
}

FEATURE_ORDER = [
    "Area_SQFT", "Floors", "Initial_period_construction",
    "Project_Complexity_Score", "Inflation_Rate", "Material_Price_Index",
    "Exchange_Rate", "Interest_Rate", "Contractor_Experience_Years",
    "Contractor_Previous_Projects", "construction_cost_per_sqft",
    "maintenance_cost_per_year", "energy_efficiency", "embodied_co2_tons",
    "operational_co2_tons", "maintenance_interval_years"
]

MATERIAL_PRICE_INDEX: dict[str, float] = {
    "cement block": 1.00, "brick": 1.08, "concrete": 1.15,
    "pre-cast": 1.22, "steel": 1.45, "timber": 0.85,
    "wood": 0.85, "glass": 1.55, "composite": 1.30,
}

MATERIAL_MAINTENANCE_INTERVAL: dict[str, float] = {
    "brick": 5.0, "cement block": 7.0, "concrete": 10.0,
    "pre-cast": 10.0, "steel": 15.0, "timber": 3.0,
    "wood": 3.0, "glass": 5.0, "composite": 8.0,
}