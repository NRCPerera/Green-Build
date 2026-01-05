# Cost Prediction Module Integration Guide

## Overview
The Cost Prediction Module has been integrated with your ANN Regression ML model to predict construction cost overruns.

## Model Input Format

Your model expects **25 features** organized as follows:

### Project Basic Information
- `Floors` - Number of floors (integer)
- `Area_SQFT` - Total area in square feet (number)
- `Year_of_Tender` - Year of project tender (integer, e.g., 2022)
- `Type_of_Project` - Type: "Apartment", "Commercial", "Industrial", "Infrastructure"
- `Grade_of_contractor` - Contractor grade: "A1", "A2", "B1", "B2", "C1", "C2"
- `Province` - Location province: "Western", "Central", "Southern", "Eastern", "Northern"
- `District` - District name (string, e.g., "Gampaha")
- `Season_of_Start` - Season: "Monsoon", "Dry", "Wet"

### Financial Parameters
- `Rate_per_SQFT` - Construction rate per square foot (number)
- `Initial_Contract_Value` - Initial contract value in currency units (number)
- `Adjusted_Contract_Sum` - Adjusted contract sum (number)
- `Cost_Overrun_Amount` - Actual cost overrun amount (number)

### Timeline Parameters
- `Initial_period_construction` - Initial planned construction duration in months (number)
- `Construction_Duration_Actual` - Actual construction duration in months (number)
- `Time_overrun_months` - Months of time overrun (number)

### Economic Factors
- `Inflation_Rate` - Inflation rate (decimal, e.g., 0.13 for 13%)
- `Material_Price_Index` - Material price index (number)
- `Exchange_Rate` - Exchange rate if applicable (number)
- `Interest_Rate` - Interest rate (decimal, e.g., 0.16 for 16%)

### Project Complexity & Changes
- `Design_Completeness` - Design completeness percentage (0-1 decimal)
- `Project_Complexity_Score` - Project complexity score (0-1 decimal)
- `Change_Order_Frequency` - Frequency of change orders (0-1 decimal)
- `Amount_Variations` - Total variation amount (number)
- `Amount_S_Change` - Amount of special changes (number)
- `Amount_PF` - Amount of provisional funds (number)

### Contractor Information
- `Contractor_Experience_Years` - Years of contractor experience (integer)
- `Contractor_Previous_Projects` - Number of previous projects by contractor (integer)

## Model Output Format

```json
{
  "success": true,
  "prediction": {
    "predicted_cost_overrun_pct": 6.04,
    "overrun_probability": 0.1146,
    "high_risk_label": false,
    "threshold": 0.5
  },
  "timestamp": "2026-01-04T08:43:55.294Z"
}
```

### Output Fields
- `predicted_cost_overrun_pct` - Predicted cost overrun percentage
- `overrun_probability` - Probability of cost overrun (0-1)
- `high_risk_label` - Boolean indicating if project is high risk
- `threshold` - Classification threshold used (typically 0.5)
- `timestamp` - Prediction timestamp

## Frontend Component Architecture

### Files Modified/Created:

1. **frontend/src/views/modules/CostPrediction/index.jsx**
   - Main UI component
   - Form inputs for 25 model features
   - Results display section
   - Prediction metrics visualization

2. **frontend/src/controllers/useCostController.js**
   - Handles API communication with backend
   - Manages form state and prediction state
   - Direct fetch calls to backend endpoint

### Component Structure

```
CostPredictionView
├── Header Section
├── Model Info Alert
├── 2-Column Layout
│   ├── Input Form (Left)
│   │   ├── Project Type Selection
│   │   ├── Contractor Grade Selection
│   │   ├── Location Selection
│   │   ├── 10+ Input Fields (scrollable)
│   │   └── Predict Button
│   └── Results Section (Right)
│       ├── Key Metrics (3-column grid)
│       ├── Prediction Details (2x2 grid)
│       ├── Model Information
│       └── Clear Results Button
```

## API Integration Flow

```
Frontend Form
    ↓
    POST /api/predict-cost-overrun
    {
      "data": {
        "Floors": 1,
        "Area_SQFT": 4000,
        ...25 features total
      }
    }
    ↓
Backend (Express)
    ↓
    POST http://localhost:8001/predict/raw
    ↓
ML Service (FastAPI)
    ↓
ANN Model Inference
    ↓
Response: {
  "predicted_cost_overrun_pct": 6.04,
  "overrun_probability": 0.1146,
  "high_risk_label": false,
  "threshold": 0.5
}
```

## Setup Instructions

### 1. Start the ML Service
```bash
cd ml-services/cost-overrun-prediction-ml
python run.py
```
Service will be available at: `http://localhost:8001`

### 2. Configure Backend
Ensure `.env` file contains:
```env
COST_ML_SERVICE_URL=http://localhost:8001
```

### 3. Start Backend
```bash
cd backend
npm run dev
```
Backend will be available at: `http://localhost:5000`

### 4. Start Frontend
```bash
cd frontend
npm run dev
```
Frontend will be available at: `http://localhost:3000` (or Vite's configured port)

## Usage

1. **Navigate to Cost Prediction Module**
   - Go to the Cost Prediction tab in the application

2. **Fill in Project Parameters**
   - All 25 fields are required
   - Use the scrollable form on the left
   - Example values are pre-filled

3. **Submit Prediction**
   - Click "Predict Cost Overrun" button
   - Wait for model inference (usually 1-2 seconds)

4. **View Results**
   - Check predicted cost overrun percentage
   - Review risk probability
   - See if project is classified as high risk
   - View model information and timestamp

5. **Clear Results**
   - Click "Clear Results" to reset and start over

## Example Request/Response

### Request
```bash
curl -X POST http://localhost:5000/api/predict-cost-overrun \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "Floors": 1,
      "Area_SQFT": 4,
      "Year_of_Tender": 2022,
      "Rate_per_SQFT": 26000,
      "Initial_Contract_Value": 0,
      "Initial_period_construction": 14,
      "Design_Completeness": 0.55,
      "Project_Complexity_Score": 0.1,
      "Time_overrun_months": 6,
      "Construction_Duration_Actual": 20,
      "Inflation_Rate": 0.13,
      "Material_Price_Index": 125,
      "Exchange_Rate": 390,
      "Interest_Rate": 0.16,
      "Contractor_Experience_Years": 3,
      "Contractor_Previous_Projects": 5,
      "Change_Order_Frequency": 0.35,
      "Amount_Variations": 4200,
      "Amount_S_Change": 21021,
      "Amount_PF": 10000,
      "Adjusted_Contract_Sum": 580,
      "Cost_Overrun_Amount": 320000,
      "Type_of_Project": "Apartment",
      "Province": "Western",
      "District": "Gampaha",
      "Season_of_Start": "Monsoon",
      "Grade_of_contractor": "C1"
    }
  }'
```

### Response
```json
{
  "success": true,
  "prediction": {
    "predicted_cost_overrun_pct": 6.04,
    "overrun_probability": 0.1146,
    "high_risk_label": false,
    "threshold": 0.5
  },
  "timestamp": "2026-01-04T08:43:55.294Z"
}
```

## Error Handling

The system handles various error scenarios:

### ML Service Unavailable
- Status: 503
- Message: "ML service unavailable"
- Action: Ensure FastAPI service is running

### Invalid Input Data
- Status: 400
- Message: "Invalid input"
- Action: Check that all required fields are provided

### Model Inference Error
- Status: 500
- Message: Error details from model
- Action: Check model logs and input data

### Network Error
- Frontend shows error message
- Action: Check backend connectivity and CORS settings

## Performance Notes

- Average prediction time: 1-2 seconds
- Model runs on CPU (TensorFlow)
- Handles batch requests efficiently
- Input validation on backend before forwarding to ML service

## Future Enhancements

1. **SHAP Explanation**: Integrate feature importance explanations
2. **Batch Predictions**: Support for multiple projects at once
3. **Historical Comparison**: Compare with similar past projects
4. **Sensitivity Analysis**: Show impact of changing individual parameters
5. **Model Confidence Intervals**: Display prediction uncertainty ranges
6. **Export Predictions**: Save results as PDF/CSV

## Troubleshooting

### Frontend shows "No Prediction Yet"
- Check that all form fields are filled
- Verify Predict button is not disabled
- Check browser console for errors

### Backend returns 503 error
```bash
# Check if ML service is running
curl http://localhost:8001/

# If not, start it
cd ml-services/cost-overrun-prediction-ml
python run.py
```

### CORS errors
- Ensure `FRONTEND_URL` is set correctly in backend config
- Default allows all origins, modify if needed for production

### Model predictions seem off
- Check that input data matches training data distribution
- Verify feature scaling is consistent
- Compare with model's training metrics

## Support

For issues or questions:
1. Check the logs in backend and ML service
2. Verify all services are running on correct ports
3. Review input data for anomalies
4. Check model accuracy metrics in `ml-services/cost-overrun-prediction-ml/app/models/regression_metrics.joblib`
