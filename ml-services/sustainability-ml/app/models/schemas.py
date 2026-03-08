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

class OptimizeInput(BaseModel):
    """Input schema for the material optimization endpoint."""
    wall_area: float = Field(..., gt=0, description="Net wall area in m²")
    floor_area: float = Field(..., gt=0, description="Floor area in m²")
    door_count: int = Field(..., ge=0, description="Number of doors")
    window_count: int = Field(..., ge=0, description="Number of windows")
    max_budget: float = Field(..., gt=0, description="Maximum budget in LKR")

class MaterialSelection(BaseModel):
    """A single material selection from the optimizer."""
    category: str
    material: str
    quantity: float
    unit: str
    costPerUnit: float
    carbonPerUnit: float
    totalCost: float
    totalCarbon: float

class OptimizeOutput(BaseModel):
    """Output schema for the material optimization endpoint."""
    status: str
    message: str
    selections: List[MaterialSelection]
    totalCost: float
    totalCarbon: float
    budgetUsed: Optional[float] = None
    budgetRemaining: Optional[float] = None
    budgetUtilization: Optional[float] = None

class HealthResponse(BaseModel):
    status: str
    service: str
    models_loaded: List[str]