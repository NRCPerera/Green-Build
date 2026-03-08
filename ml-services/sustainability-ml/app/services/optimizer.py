"""
Material Optimizer — MILP Solver
================================
Uses PuLP to solve a Mixed-Integer Linear Programming problem that selects
exactly ONE material per building category so that total CO₂ is **minimized**
while keeping total cost ≤ max_budget.

Categories:
  walls   — Brick, Cement Block, Pre-cast
  floors  — Tile, Polished Concrete, Timber
  doors   — Wood, UPVC
  windows — Single-Glazed, Double-Glazed

All costs are in LKR. CO₂ in kg.
"""

import logging
from pulp import (
    LpProblem, LpMinimize, LpVariable, LpBinary,
    lpSum, LpStatus, value as lp_value,
)

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────
# Material Catalogue
# cost_per_unit: LKR per unit (m² for walls/floors, per-item for doors/windows)
# carbon_per_unit: kg CO₂ per unit
# ─────────────────────────────────────────────────────────────
MATERIAL_CATALOG: dict[str, list[dict]] = {
    "walls": [
        {"name": "Brick",         "cost_per_unit": 4_200, "carbon_per_unit": 52.0},
        {"name": "Cement Block",  "cost_per_unit": 3_400, "carbon_per_unit": 45.0},
        {"name": "Pre-cast",      "cost_per_unit": 5_800, "carbon_per_unit": 38.0},
    ],
    "floors": [
        {"name": "Tile",              "cost_per_unit": 3_500, "carbon_per_unit": 28.0},
        {"name": "Polished Concrete", "cost_per_unit": 2_800, "carbon_per_unit": 42.0},
        {"name": "Timber",            "cost_per_unit": 6_200, "carbon_per_unit": 12.0},
    ],
    "doors": [
        {"name": "Wood",  "cost_per_unit": 35_000, "carbon_per_unit": 85.0},
        {"name": "UPVC",  "cost_per_unit": 28_000, "carbon_per_unit": 120.0},
    ],
    "windows": [
        {"name": "Single-Glazed", "cost_per_unit": 18_000, "carbon_per_unit": 95.0},
        {"name": "Double-Glazed", "cost_per_unit": 32_000, "carbon_per_unit": 72.0},
    ],
}


def optimize_materials(
    wall_area: float,
    floor_area: float,
    door_count: int,
    window_count: int,
    max_budget: float,
) -> dict:
    """
    Solve the MILP:
        min  Σ (carbon_per_unit × quantity × x_ij)
        s.t. Σ (cost_per_unit   × quantity × x_ij) ≤ max_budget
             Σ_j x_ij = 1  ∀ category i
             x_ij ∈ {0, 1}

    Returns dict with selected materials, total cost, total carbon,
    and solver status.
    """

    quantities = {
        "walls":   wall_area,
        "floors":  floor_area,
        "doors":   float(door_count),
        "windows": float(window_count),
    }

    # ── Build the LP ────────────────────────────────────
    prob = LpProblem("MinCarbonMaterials", LpMinimize)

    # Decision variables: x[cat][j] ∈ {0,1}
    x: dict[str, list[LpVariable]] = {}
    for cat, options in MATERIAL_CATALOG.items():
        x[cat] = [
            LpVariable(f"x_{cat}_{j}", cat="Binary")
            for j in range(len(options))
        ]

    # Objective: minimise total carbon
    prob += lpSum(
        options[j]["carbon_per_unit"] * quantities[cat] * x[cat][j]
        for cat, options in MATERIAL_CATALOG.items()
        for j in range(len(options))
    ), "TotalCarbon"

    # Budget constraint
    prob += (
        lpSum(
            options[j]["cost_per_unit"] * quantities[cat] * x[cat][j]
            for cat, options in MATERIAL_CATALOG.items()
            for j in range(len(options))
        )
        <= max_budget,
        "BudgetLimit",
    )

    # Exactly-one-per-category constraints
    for cat, options in MATERIAL_CATALOG.items():
        prob += (
            lpSum(x[cat][j] for j in range(len(options))) == 1,
            f"OneChoice_{cat}",
        )

    # ── Solve ───────────────────────────────────────────
    prob.solve()
    status = LpStatus[prob.status]
    logger.info(f"Optimizer status: {status}")

    if status != "Optimal":
        return {
            "status": status,
            "message": (
                "No feasible solution found. "
                "Try increasing the budget or reducing quantities."
            ),
            "selections": [],
            "totalCost": 0,
            "totalCarbon": 0,
        }

    # ── Extract results ─────────────────────────────────
    selections = []
    total_cost = 0.0
    total_carbon = 0.0

    for cat, options in MATERIAL_CATALOG.items():
        for j, opt in enumerate(options):
            if lp_value(x[cat][j]) == 1:
                qty = quantities[cat]
                cost = round(opt["cost_per_unit"] * qty, 2)
                carbon = round(opt["carbon_per_unit"] * qty, 2)
                total_cost += cost
                total_carbon += carbon
                selections.append({
                    "category": cat,
                    "material": opt["name"],
                    "quantity": qty,
                    "unit": "m²" if cat in ("walls", "floors") else "No.",
                    "costPerUnit": opt["cost_per_unit"],
                    "carbonPerUnit": opt["carbon_per_unit"],
                    "totalCost": cost,
                    "totalCarbon": carbon,
                })
                break

    return {
        "status": "Optimal",
        "message": "Optimization complete — minimum carbon solution found.",
        "selections": selections,
        "totalCost": round(total_cost, 2),
        "totalCarbon": round(total_carbon, 2),
        "budgetUsed": round(total_cost, 2),
        "budgetRemaining": round(max_budget - total_cost, 2),
        "budgetUtilization": round((total_cost / max_budget) * 100, 1) if max_budget > 0 else 0,
    }
