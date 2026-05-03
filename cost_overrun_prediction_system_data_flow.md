# Cost Overrun Prediction System - Data Flow and Outputs

## Scope

This document describes how cost overrun prediction data moves through:

- Frontend (React)
- Backend (Node.js/Express)
- ML service (FastAPI in ml-services/Cost-overrrun-Prediction-ml)

It focuses on:

- What data is passed at each step
- What output is returned at each step
- What is persisted in the database

## 1) End-to-End Flow (Pre-Project Prediction)

1. User fills the Cost Prediction form in frontend.
2. Frontend whitelists fields to 26 ML-expected inputs.
3. Frontend sends POST request to backend:
   - /api/cost-prediction/pre-project
4. Backend forwards request body to ML API:
   - /predict/pre-project
5. ML API validates input with Pydantic schema and predicts:
   - cost overrun percent
   - high-risk class and probability
   - top SHAP risk factors
   - risk scorecard
6. Backend sanitizes response keys and sends normalized payload to frontend.
7. Frontend stores normalized prediction in state and renders UI (risk badge, overrun %, charts, scorecard).

## 2) Frontend -> Backend Data Passed

### Frontend source

- frontend/src/controllers/useCostController.js
- frontend/src/models/api.js
- frontend/src/views/modules/CostPrediction/index.jsx

### Input payload sent to backend pre-project endpoint

POST /api/cost-prediction/pre-project

Only these 26 fields are sent:

1. Project_Type (string)
2. Province (string)
3. District (string)
4. CIDA_Grade (string)
5. Season (string)
6. Floors (integer)
7. Area_SQFT (integer)
8. Year_of_Tender (integer)
9. Contractor_Experience_Years (integer)
10. Complexity_Score (integer)
11. Change_Order_Freq (integer)
12. Start_Month (integer)
13. Start_Quarter (integer)
14. Start_Weekday (integer)
15. Initial_Period_Months (float)
16. Inflation_Rate (float)
17. Exchange_Rate_LKR (float)
18. Material_Index (float)
19. Design_Completeness (float)
20. Project_Size_Index (float)
21. Economic_Risk_Index (float)
22. Design_Risk_Score (float)
23. Contractor_Risk_Score (float)
24. Weather_Risk_Score (float)
25. Rate_per_SQFT (float)
26. Initial_Value (float)

### Notes on frontend preprocessing

- The UI derives some values from project/start date before submit:
  - Start_Month, Start_Quarter, Start_Weekday, Year_of_Tender, Season
- Initial_Value can be auto-computed from Area_SQFT * Rate_per_SQFT.
- Economic indicators can be fetched from /api/economic-indicators and injected:
  - Inflation_Rate, Exchange_Rate_LKR, Material_Index

## 3) Backend -> ML Data Passed (Pre-Project)

### Backend source

- backend/controllers/costPredictionController.js
- backend/routes/costPredictionRoutes.js

### Forwarding behavior

Backend receives req.body from frontend and forwards it directly to:

- POST {COST_ML_SERVICE_URL}/predict/pre-project

No backend feature transformation is done for pre-project prediction.

### ML pre-project validation schema

ML validates all 26 fields using:

- ml-services/Cost-overrrun-Prediction-ml/src/schemas/pre_project.py

If validation fails, ML returns HTTP 400 with error detail.

## 4) ML Output Returned (Pre-Project)

### ML response structure

From ML service (FastAPI):

1. predicted_cost_overrun_pct (float)
2. predicted_high_risk_class (integer, 0 or 1)
3. predicted_high_risk_probability (float, 0.0 to 1.0)
4. top_risk_factors (array)
   - item: { feature: string, impact: float }
5. risk_scorecard (array)
   - item: { feature, feature_value, impact: High|Medium|Low, status }
6. model_version (string)

### Backend response to frontend (normalized)

Backend sanitizes and returns:

{
  success: true,
  data: {
    predicted_cost_overrun_pct,
    predicted_high_risk_class,
    predicted_high_risk_probability,
    top_risk_factors,
    risk_scorecard,
    model_version
  },
  timestamp
}

Frontend also accepts legacy key aliases if present.

## 5) Monte Carlo Data Passed and Output

### Frontend -> Backend request

POST /api/cost-prediction/monte-carlo

Payload:

{
  fixed_inputs: { same 26 pre-project fields },
  uncertain_ranges: {
    FeatureName: { min: number, max: number },
    ...
  },
  num_simulations: number
}

### Backend Monte Carlo execution

- backend/controllers/costPredictionController.js
- For each simulation, backend samples uncertain fields uniformly.
- Integer fields are rounded for strict Pydantic compatibility.
- Backend repeatedly calls ML endpoint /predict/pre-project.
- Backend aggregates successful predictions.

### Monte Carlo output returned to frontend

{
  success: true,
  data: {
    mean,
    median,
    min,
    max,
    stdDev,
    p10,
    p50,
    p90,
    confidence_interval: [low, high],
    sensitivities: { featureName: correlation },
    histogram: { counts: number[], bins: number[] },
    cost_summary: {
      initial_contract_value,
      expected_overrun_percent,
      expected_overrun_amount,
      expected_final_cost,
      confidence_range_cost: [minCost, maxCost]
    },
    prediction_summary: {
      expected_overrun,
      confidence_range,
      risk_level
    },
    scenario_analysis: {
      best_case,
      most_likely,
      worst_case
    },
    risk_drivers: string[],
    recommendations: string[],
    explanation,
    raw_predictions: number[],
    num_successful_simulations
  },
  timestamp
}

## 6) In-Progress Prediction Path (Current State)

### Backend expectation

Backend exposes and forwards:

- POST /api/cost-prediction/in-progress
- Forward target: POST {COST_ML_SERVICE_URL}/predict/in-progress

### ML implementation status

In-progress schema/service files exist:

- ml-services/Cost-overrrun-Prediction-ml/src/schemas/in_progress.py
- ml-services/Cost-overrrun-Prediction-ml/src/services/in_progress_service.py

Expected in-progress output shape is:

1. forecast_final_cost_overrun_pct_p50 (float)
2. risk_label (LOW|MEDIUM|HIGH)
3. model_version (string)

However, current route file only exposes /predict/pre-project:

- ml-services/Cost-overrrun-Prediction-ml/src/routes/predict.py

So unless another in-progress route is added elsewhere, backend calls to /predict/in-progress may fail with 404.

## 7) Data Stored in Database (After Save)

### Save endpoint

- POST /api/cost-prediction/save

### Persisted model

- backend/models/CostPrediction.js

Stored groups:

1. input
   - Full ML input feature object (26 fields)
2. prediction
   - predicted_cost_overrun_pct
   - predicted_high_risk_class
   - predicted_high_risk_probability
   - model_version
3. explainability
   - topRiskFactors[]
   - riskScorecard[]
4. derived + metadata
   - riskLevel (auto-calculated)
   - scenarioName, notes, tags, isBaseline, usedForBudget
5. actual outcome tracking
   - actualCostOverrunPct, actualFinalCost, recordedAt, notes

## 8) Practical Example (What Is Passed, What Is Output)

### Example request passed to pre-project endpoint

{
  "Project_Type": "Commercial-Building",
  "Province": "Western",
  "District": "Colombo",
  "CIDA_Grade": "C1",
  "Season": "Southwest-Monsoon",
  "Floors": 8,
  "Area_SQFT": 24000,
  "Year_of_Tender": 2026,
  "Contractor_Experience_Years": 12,
  "Complexity_Score": 7,
  "Change_Order_Freq": 5,
  "Start_Month": 6,
  "Start_Quarter": 2,
  "Start_Weekday": 1,
  "Initial_Period_Months": 18,
  "Inflation_Rate": 6.1,
  "Exchange_Rate_LKR": 318.5,
  "Material_Index": 141.2,
  "Design_Completeness": 72,
  "Project_Size_Index": 6.4,
  "Economic_Risk_Index": 5.3,
  "Design_Risk_Score": 6,
  "Contractor_Risk_Score": 4,
  "Weather_Risk_Score": 3,
  "Rate_per_SQFT": 14500,
  "Initial_Value": 348000000
}

### Example output returned

{
  "success": true,
  "data": {
    "predicted_cost_overrun_pct": 11.84,
    "predicted_high_risk_class": 1,
    "predicted_high_risk_probability": 0.73,
    "top_risk_factors": [
      { "feature": "Change_Order_Freq", "impact": 0.121 },
      { "feature": "Design_Completeness", "impact": 0.089 }
    ],
    "risk_scorecard": [
      {
        "feature": "Change_Order_Freq",
        "feature_value": 5,
        "impact": "High",
        "status": "🟡 Reduce Change Orders"
      }
    ],
    "model_version": "pre_project_v2_sklearn"
  },
  "timestamp": "2026-04-19T10:22:11.000Z"
}

## 9) Key Files Reviewed

Frontend:

- frontend/src/controllers/useCostController.js
- frontend/src/models/api.js
- frontend/src/views/modules/CostPrediction/index.jsx

Backend:

- backend/routes/costPredictionRoutes.js
- backend/controllers/costPredictionController.js
- backend/models/CostPrediction.js

ML service:

- ml-services/Cost-overrrun-Prediction-ml/app/main.py
- ml-services/Cost-overrrun-Prediction-ml/src/routes/predict.py
- ml-services/Cost-overrrun-Prediction-ml/src/schemas/pre_project.py
- ml-services/Cost-overrrun-Prediction-ml/src/schemas/in_progress.py
- ml-services/Cost-overrrun-Prediction-ml/src/services/pre_project_service.py
- ml-services/Cost-overrrun-Prediction-ml/src/services/in_progress_service.py
