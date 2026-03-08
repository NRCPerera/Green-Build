import logging
from fastapi import APIRouter, HTTPException
from ..models.schemas import (
    SustainabilityInput, SustainabilityOutput, ParetoPoint, GBCSLBreakdown, 
    CIDABoqItem, AiOptimization, ErrorResponse,
    OptimizeInput, OptimizeOutput,
)
from ..services.inference import build_feature_vector, generate_recommendations, resolve_efficiency
from ..services.optimizer import optimize_materials, MATERIAL_CATALOG
from ..config import (
    FEATURE_ORDER, CIDA_MATERIAL_ADJUSTMENT, CIDA_BASE_RATE_PER_SQFT, 
    CIDA_BOQ_ELEMENTS, MATERIAL_PRICE_INDEX
)

router = APIRouter()
logger = logging.getLogger(__name__)

sustainability_artefacts: dict = {}

def set_models(model_dict: dict):
    global sustainability_artefacts
    sustainability_artefacts = model_dict

@router.get("/", tags=["Health"])
@router.get("/health", tags=["Health"])
async def root():
    return {
        "status": "healthy",
        "service": "Sustainability Engine",
        "models_loaded": list(sustainability_artefacts.keys())
    }

@router.post(
    "/api/sustainability/calculate",
    response_model=SustainabilityOutput,
    tags=["Sustainability"],
    summary="Calculate Sustainability Metrics",
)
async def calculate_sustainability(payload: SustainabilityInput):
    print(f"\n[SUSTAINABILITY-ML] ====> Request Received: {payload.model_dump()}\n", flush=True)
    logger.info(f"====> Received calculation request from Node Backend! Payload: {payload.model_dump()}")
    required = {"scaler", "scaler_y_lcc", "scaler_y_sustain",
                "lifecycle", "sustainability", "risk"}
    missing = required - sustainability_artefacts.keys()
    if missing:
        raise HTTPException(
            status_code=503,
            detail=f"Sustainability models not loaded: {missing}",
        )

    scaler = sustainability_artefacts["scaler"]
    scaler_y_lcc = sustainability_artefacts["scaler_y_lcc"]
    scaler_y_sustain = sustainability_artefacts["scaler_y_sustain"]
    lifecycle_model = sustainability_artefacts["lifecycle"]
    sustain_model = sustainability_artefacts["sustainability"]
    risk_model = sustainability_artefacts["risk"]

    features = build_feature_vector(payload)
    features_scaled = scaler.transform(features)

    area = payload.area
    lifespan = payload.lifespan
    mat = payload.material.lower()
    efficiency = resolve_efficiency(payload.energyRating)
    renewable = payload.renewablePercent

    lcc_pred_scaled = lifecycle_model.predict(features_scaled, verbose=0)
    nominal_lcc = float(scaler_y_lcc.inverse_transform(lcc_pred_scaled)[0][0])
    nominal_lcc_lkr = round(max(nominal_lcc, 0.0), 2)

    DISCOUNT_RATE = 0.10
    ANALYSIS_PERIOD = 60
    capex = nominal_lcc_lkr * 0.40
    opex_total = nominal_lcc_lkr * 0.60
    opex_yearly = opex_total / ANALYSIS_PERIOD
    
    npv_future_costs = sum(opex_yearly / ((1 + DISCOUNT_RATE) ** t) for t in range(1, ANALYSIS_PERIOD + 1))
    standard_compliant_lcc_lkr = round(capex + npv_future_costs, 2)
    lifecycle_cost = standard_compliant_lcc_lkr

    sustain_pred_scaled = sustain_model.predict(features_scaled, verbose=0)
    sustainability_score = round(float(sustain_pred_scaled[0][0]) * 100.0, 2)

    risk_raw = float(risk_model.predict(features_scaled, verbose=0)[0][0])
    risk_probability = round(max(0.0, min(risk_raw * 100.0, 100.0)), 2)

    embodied = float(features[0][FEATURE_ORDER.index("embodied_co2_tons")])
    operational = float(features[0][FEATURE_ORDER.index("operational_co2_tons")])
    carbon_footprint = round(embodied + operational, 2)

    pareto_frontier = [
        ParetoPoint(name="Low Cost", cost=round(lifecycle_cost * 0.75, 2), carbon=round(carbon_footprint * 1.30, 2)),
        ParetoPoint(name="Balanced", cost=round(lifecycle_cost, 2), carbon=round(carbon_footprint, 2)),
        ParetoPoint(name="Green", cost=round(lifecycle_cost * 1.20, 2), carbon=round(carbon_footprint * 0.60, 2)),
    ]

    recommendations = generate_recommendations(payload.material, payload.renewablePercent)

    gbcsl_energy = round({1.0: 30.0, 0.8: 22.0, 0.6: 14.0, 0.4: 8.0}.get(round(efficiency, 1), 14.0), 1)
    gbcsl_materials = round({"concrete": 16.0, "pre-cast": 18.0, "cement block": 14.0, "brick": 12.0, "steel": 10.0, "timber": 8.0, "wood": 8.0, "glass": 6.0, "composite": 11.0}.get(mat, 10.0), 1)
    gbcsl_renewable = round(min(renewable / 100.0 * 10.0, 10.0), 1)
    gbcsl_water = 6.0
    gbcsl_innovation = round(min(3.0 + efficiency * 4.0 + renewable / 100.0 * 3.0, 10.0), 1)
    gbcsl_site = 5.0
    gbcsl_ieq = round(min(4.0 + efficiency * 6.0, 10.0), 1)

    gbcsl_total = round(gbcsl_energy + gbcsl_materials + gbcsl_renewable + gbcsl_water + gbcsl_innovation + gbcsl_site + gbcsl_ieq, 1)
    gbcsl_total = min(gbcsl_total, 100.0)

    if gbcsl_total >= 70: gbcsl_grade = "Platinum"
    elif gbcsl_total >= 60: gbcsl_grade = "Gold"
    elif gbcsl_total >= 50: gbcsl_grade = "Silver"
    elif gbcsl_total >= 40: gbcsl_grade = "Certified"
    else: gbcsl_grade = "Not Rated"

    gbcsl_breakdown = GBCSLBreakdown(energy=gbcsl_energy, materials=gbcsl_materials, renewable=gbcsl_renewable, water=gbcsl_water, innovation=gbcsl_innovation, site=gbcsl_site, ieq=gbcsl_ieq)

    area_sqft = area * 10.764
    cida_adj = CIDA_MATERIAL_ADJUSTMENT.get(mat, 1.0)
    cida_total_lkr = round(area_sqft * CIDA_BASE_RATE_PER_SQFT * cida_adj, 2)

    cida_boq = [CIDABoqItem(element=name, percentage=round(pct * 100, 1), amount=round(cida_total_lkr * pct, 2)) for name, pct in CIDA_BOQ_ELEMENTS]

    best_lcc = standard_compliant_lcc_lkr
    best_mat = mat
    best_sustain = sustainability_score

    for alt_mat in MATERIAL_PRICE_INDEX.keys():
        if alt_mat == mat: continue
        alt_inp = SustainabilityInput(area=payload.area, lifespan=payload.lifespan, material=alt_mat.title(), energyRating=payload.energyRating, renewablePercent=payload.renewablePercent)
        alt_features = build_feature_vector(alt_inp)
        alt_scaled = scaler.transform(alt_features)
        
        alt_lcc_pred = lifecycle_model.predict(alt_scaled, verbose=0)
        alt_nom = float(scaler_y_lcc.inverse_transform(alt_lcc_pred)[0][0])
        alt_nom = max(alt_nom, 0.0)
        
        alt_capex = alt_nom * 0.40
        alt_opex_total = alt_nom * 0.60
        alt_opex_yearly = alt_opex_total / ANALYSIS_PERIOD
        alt_npv = sum(alt_opex_yearly / ((1 + DISCOUNT_RATE) ** t) for t in range(1, ANALYSIS_PERIOD + 1))
        alt_std_lcc = round(alt_capex + alt_npv, 2)
        
        if alt_std_lcc < best_lcc:
            best_lcc = alt_std_lcc
            best_mat = alt_mat
            alt_sus_pred = sustain_model.predict(alt_scaled, verbose=0)
            best_sustain = round(float(alt_sus_pred[0][0]) * 100.0, 2)
            
    ai_optimization = None
    if best_mat != mat:
        savings = round(standard_compliant_lcc_lkr - best_lcc, 2)
        savings_pct = round((savings / standard_compliant_lcc_lkr) * 100, 1) if standard_compliant_lcc_lkr > 0 else 0.0
        sustain_boost = round(best_sustain - sustainability_score, 1)
        
        alt_cida_adj = CIDA_MATERIAL_ADJUSTMENT.get(best_mat, 1.0)
        alt_cida_total_lkr = round(area_sqft * CIDA_BASE_RATE_PER_SQFT * alt_cida_adj, 2)
        alt_cida_boq = [CIDABoqItem(element=name, percentage=round(pct * 100, 1), amount=round(alt_cida_total_lkr * pct, 2)) for name, pct in CIDA_BOQ_ELEMENTS]
        
        ai_optimization = AiOptimization(recommendedMaterial=best_mat.title(), potentialSavingsLkr=savings, savingsPercentage=savings_pct, sustainabilityBoost=sustain_boost, optimizedLccLkr=best_lcc, optimizedSustainScore=best_sustain, optimizedCidaBoq=alt_cida_boq)

    return SustainabilityOutput(
        lifecycleCost=round(lifecycle_cost, 2),
        nominal_lcc_lkr=nominal_lcc_lkr,
        standard_compliant_lcc_lkr=standard_compliant_lcc_lkr,
        currency="LKR",
        calculation_standard="ISO 15686-5:2017",
        carbonFootprint=carbon_footprint,
        sustainabilityScore=sustainability_score,
        riskProbability=risk_probability,
        paretoFrontier=pareto_frontier,
        recommendations=recommendations,
        gbcslScore=gbcsl_total,
        gbcslGrade=gbcsl_grade,
        gbcslBreakdown=gbcsl_breakdown,
        cidaBoq=cida_boq,
        cidaTotalLKR=cida_total_lkr,
        aiOptimization=ai_optimization,
    )


@router.post(
    "/api/sustainability/optimize-materials",
    response_model=OptimizeOutput,
    tags=["Optimizer"],
    summary="Inverse Optimization — Auto-prescribe materials to minimise CO₂",
)
async def run_material_optimization(payload: OptimizeInput):
    """
    Solves a MILP to select exactly one material per building category
    (walls, floors, doors, windows) that **minimises total carbon**
    while keeping total cost ≤ max_budget.
    """
    logger.info(f"[Optimizer] Request: {payload.model_dump()}")

    try:
        result = optimize_materials(
            wall_area=payload.wall_area,
            floor_area=payload.floor_area,
            door_count=payload.door_count,
            window_count=payload.window_count,
            max_budget=payload.max_budget,
        )
    except Exception as exc:
        logger.error(f"[Optimizer] Solver error: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))

    if result["status"] != "Optimal":
        raise HTTPException(status_code=422, detail=result["message"])

    return OptimizeOutput(**result)


@router.get(
    "/api/sustainability/material-catalog",
    tags=["Optimizer"],
    summary="Return the available material options and their unit costs/carbon",
)
async def get_material_catalog():
    return {"catalog": MATERIAL_CATALOG}
