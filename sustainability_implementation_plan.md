# Sustainability-ML Technical Improvement Plan

Applying the lessons from the [delay_prediction_analysis.md.resolved](file:///c:/Users/Ridma%20Chalana/Desktop/green-build/delay_prediction_analysis.md.resolved) to the sustainability-ml component. The panel's criticism of "no technical challenge" applies equally here — the sustainability service has the same fundamental weaknesses: trivial `.predict()` calls, hardcoded recommendations via `if/else`, no explainability, no uncertainty quantification, and a basic form→display frontend.

## Current State Summary

| Layer | File | Weakness |
|-------|------|----------|
| ML Service | [inference.py](file:///c:/Users/Ridma%20Chalana/Desktop/green-build/ml-services/sustainability-ml/app/services/inference.py) | Simple `model.predict()` → clamp → hardcoded interpretation strings |
| ML Service | [endpoints.py](file:///c:/Users/Ridma%20Chalana/Desktop/green-build/ml-services/sustainability-ml/app/api/endpoints.py) | Smart suggestions are static `if/else` threshold checks (L249-310) |
| ML Service | [mock_inference.py](file:///c:/Users/Ridma%20Chalana/Desktop/green-build/ml-services/sustainability-ml/app/services/mock_inference.py) | Falls back to random values, hiding real failures |
| Backend | [sustainabilityController.js](file:///c:/Users/Ridma%20Chalana/Desktop/green-build/backend/controllers/sustainabilityController.js) | Thin proxy via `axios.post()` — zero business logic |
| Frontend | [index.jsx](file:///c:/Users/Ridma%20Chalana/Desktop/green-build/frontend/src/views/modules/Sustainability/index.jsx) | Static form → API → display. No interactive analysis or visualizations |
| Frontend | [useSustainabilityController.js](file:///c:/Users/Ridma%20Chalana/Desktop/green-build/frontend/src/controllers/useSustainabilityController.js) | Simple state hook, no data transformation |

---

## Proposed Changes

### ML Service — SHAP Explainability

> [!IMPORTANT]
> This is the highest-impact enhancement. SHAP explains **WHY** each prediction was made, transforming the system from a black box to an interpretable decision tool.

#### [NEW] [shap_explainer.py](file:///c:/Users/Ridma%20Chalana/Desktop/green-build/ml-services/sustainability-ml/app/services/shap_explainer.py)

New service class `SHAPExplainer` that:
- Initializes SHAP `DeepExplainer` (for Keras/TF models) for each of the 3 models on startup
- Provides `explain_sustainability(features)`, `explain_lifecycle(features)`, `explain_risk(features)` methods
- Returns per-feature SHAP values, base value, and sorted feature importance ranking
- Example output: `{ "shap_values": {"energy_kwh_year": +12.3, "embodied_co2_tons": -5.1, ...}, "top_drivers": [{"feature": "energy_kwh_year", "impact": +12.3, "direction": "increases score"}] }`

#### [MODIFY] [inference.py](file:///c:/Users/Ridma%20Chalana/Desktop/green-build/ml-services/sustainability-ml/app/services/inference.py)

- Inject `SHAPExplainer` into the [InferenceService](file:///c:/Users/Ridma%20Chalana/Desktop/green-build/ml-services/sustainability-ml/app/services/inference.py#9-197) constructor
- After each `model.predict()`, call `shap_explainer.explain_*()` to compute SHAP values
- Return `shap_values` and `top_drivers` alongside predictions

---

### ML Service — MC Dropout Confidence Intervals

> [!IMPORTANT]
> Replaces the need for hardcoded ±values with real uncertainty quantification from the model itself.

#### [MODIFY] [inference.py](file:///c:/Users/Ridma%20Chalana/Desktop/green-build/ml-services/sustainability-ml/app/services/inference.py)

- Add `predict_with_uncertainty(model, features, n_samples=50)` method
- Runs inference N times with dropout enabled (`training=True` in Keras)
- Computes mean, std, and P10/P50/P90 percentiles from the sampled predictions
- Returns `confidence_interval: { "lower": P10, "median": P50, "upper": P90, "std": std }`
- Apply to all 3 prediction methods (sustainability, lifecycle, risk)

---

### ML Service — Feature Importance Endpoint

#### [MODIFY] [endpoints.py](file:///c:/Users/Ridma%20Chalana/Desktop/green-build/ml-services/sustainability-ml/app/api/endpoints.py)

- Modify the `/predict` response to include `shap_analysis` and `confidence_intervals` from the enhanced inference
- Add a new `GET /feature-importance` endpoint returning global feature importance across all 3 models (precomputed at startup from a background sample)
- Replace the static `if/else` smart suggestions (L249-310) with SHAP-driven recommendations: "Energy consumption (energy_kwh_year) contributed +12.3 points to your sustainability score — reducing it would improve your rating"

---

### ML Service — Dependencies & Config

#### [MODIFY] [requirements.txt](file:///c:/Users/Ridma%20Chalana/Desktop/green-build/ml-services/sustainability-ml/requirements.txt)

- Add `shap>=0.43.0`

#### [MODIFY] [main.py](file:///c:/Users/Ridma%20Chalana/Desktop/green-build/ml-services/sustainability-ml/app/main.py)

- Initialize `SHAPExplainer` with loaded models during startup
- Pass it to the [InferenceService](file:///c:/Users/Ridma%20Chalana/Desktop/green-build/ml-services/sustainability-ml/app/services/inference.py#9-197) constructor

---

### Frontend — Interactive Sensitivity Analysis (What-If Dashboard)

> [!IMPORTANT]
> Elevates the frontend from a basic form→display to an interactive analysis tool. Users can drag sliders and see predictions change in real-time.

#### [MODIFY] [index.jsx](file:///c:/Users/Ridma%20Chalana/Desktop/green-build/frontend/src/views/modules/Sustainability/index.jsx)

Add three new visualization sections after the existing results:

1. **SHAP Waterfall Chart** — Horizontal bar chart showing each feature's contribution to the sustainability score (positive green bars, negative red bars). Uses Chart.js horizontal bar chart with the `shap_analysis` data from the API.

2. **Confidence Interval Display** — For lifecycle cost and sustainability score, show P10/P50/P90 range with a visual gauge/range bar. Replace the single-value display with a range display: "LKR 24M — **32M** — 41M" with the range visually represented.

3. **What-If Sensitivity Panel** — Interactive slider panel (collapsible) where users can adjust key parameters (Area, Floors, Design Completeness, Contractor Experience) and see the prediction update in real-time without full form resubmission. Shows a tornado chart of parameter sensitivity.

---

### Frontend — Enhanced Controller

#### [MODIFY] [useSustainabilityController.js](file:///c:/Users/Ridma%20Chalana/Desktop/green-build/frontend/src/controllers/useSustainabilityController.js)

- Add state for `shapAnalysis`, `confidenceIntervals`
- Parse the new API response fields (`shap_analysis`, `confidence_intervals`) from the backend
- Add `runSensitivityAnalysis(paramKey, values[])` function that makes batch API calls with parameter variations and returns a sensitivity curve
- Add caching for sensitivity results to avoid redundant API calls

---

### Backend Controller

#### [MODIFY] [sustainabilityController.js](file:///c:/Users/Ridma%20Chalana/Desktop/green-build/backend/controllers/sustainabilityController.js)

- Pass through the new `shap_analysis` and `confidence_intervals` fields from the ML service response
- Add a new handler `handleFeatureImportance` that proxies `GET /feature-importance` from the ML service
- Remove hardcoded [generateRiskRecommendations()](file:///c:/Users/Ridma%20Chalana/Desktop/green-build/backend/controllers/sustainabilityController.js#92-120) in favor of SHAP-driven recommendations from the ML service

---

## Verification Plan

### Automated Tests

1. **ML Service Unit Tests** — Create `tests/test_inference.py`:
   - Test `predict_with_uncertainty()` returns valid P10/P50/P90 intervals
   - Test SHAP explainer returns values for all features
   - Test that confidence intervals bracket the point estimate
   - **Run**: `cd ml-services/sustainability-ml && python -m pytest tests/ -v`

2. **API Integration Tests** — Create `tests/test_endpoints.py`:
   - Test `/predict` returns `shap_analysis` and `confidence_intervals` in response
   - Test `/feature-importance` returns data for all 3 models
   - Test SHAP-driven suggestions are included in `smart_suggestions`
   - **Run**: `cd ml-services/sustainability-ml && python -m pytest tests/test_endpoints.py -v`

### Manual Verification

> [!NOTE]
> Since the project has no existing automated test infrastructure, initial verification will be manual API + browser testing.

1. **Start ML service**: `cd ml-services/sustainability-ml && python run.py`
2. **API Test**: Use the FastAPI docs at `http://localhost:8003/docs` to send a POST to `/predict` with default values and verify the response contains:
   - `shap_analysis` with per-feature values for sustainability, lifecycle, and risk predictions
   - `confidence_intervals` with `lower`, `median`, `upper` for each prediction
   - `smart_suggestions` containing SHAP-driven natural language explanations
3. **Feature Importance Test**: GET `http://localhost:8003/feature-importance` and verify it returns global feature importance for all 3 models
4. **Frontend Test**: Start the frontend (`cd frontend && npm run dev`), navigate to Sustainability Analysis, run an analysis, and verify:
   - SHAP waterfall chart renders below the results
   - Confidence interval range bars appear on the score/cost cards
   - What-If sensitivity panel is collapsible and interactive
   - PDF export still works correctly with the new data
