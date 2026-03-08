from typing import List, Optional
from pydantic import BaseModel, Field

class SustainabilityInput(BaseModel):
    area: float
    lifespan: int
    material: str
    energyRating: str
    renewablePercent: float

class ParetoPoint(BaseModel):
    name: str
    cost: float
    carbon: float

class GBCSLBreakdown(BaseModel):
    energy: float
    materials: float
    renewable: float
    water: float
    innovation: float
    site: float
    ieq: float

class CIDABoqItem(BaseModel):
    element: str
    percentage: float
    amount: float

class AiOptimization(BaseModel):
    recommendedMaterial: str
    potentialSavingsLkr: float
    savingsPercentage: float
    sustainabilityBoost: float
    optimizedLccLkr: float
    optimizedSustainScore: float
    optimizedCidaBoq: List[CIDABoqItem]

class SustainabilityOutput(BaseModel):
    lifecycleCost: float
    nominal_lcc_lkr: float
    standard_compliant_lcc_lkr: float
    currency: str
    calculation_standard: str
    carbonFootprint: float
    sustainabilityScore: float
    riskProbability: float
    paretoFrontier: List[ParetoPoint]
    recommendations: List[str]
    gbcslScore: float
    gbcslGrade: str
    gbcslBreakdown: GBCSLBreakdown
    cidaBoq: List[CIDABoqItem]
    cidaTotalLKR: float
    aiOptimization: Optional[AiOptimization] = None

class ErrorResponse(BaseModel):
    detail: str

class HealthResponse(BaseModel):
    status: str
    service: str
    models_loaded: List[str]