# Construction Delay Prediction API

Production-ready FastAPI backend for predicting construction project delays using deep learning ANN models trained for Sri Lanka construction projects.

## Features

- ✅ **Dual ANN Model Inference**
  - Regression model: Predicts total delay days
  - Classification model: Categorizes delay severity
- ✅ Automatic feature preprocessing with one-hot encoding
- ✅ Support for District, Project Type, and Contractor ICTAD Grade
- ✅ StandardScaler normalization
- ✅ Comprehensive error handling
- ✅ CORS enabled for cross-origin requests
- ✅ Health check endpoints
- ✅ Development mode with mock predictions

## Delay Categories

The classification model predicts one of four delay categories:

| Category | Delay Days | Description |
|----------|------------|-------------|
| On-Time | 0 days | Project completed on schedule |
| Minor Delay | 1-60 days | Slight delays, manageable |
| Major Delay | 61-180 days | Significant delays requiring attention |
| Critical Delay | >180 days | Severe delays, major intervention needed |

## Project Structure

```
delay-prediction-ml/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application
│   ├── config.py            # Configuration settings
│   ├── dev_config.py        # Development mode toggle
│   ├── schemas.py           # Pydantic models
│   ├── api/
│   │   ├── __init__.py
│   │   └── endpoints.py     # API routes
│   └── services/
│       ├── __init__.py
│       ├── predictor.py     # Model inference service
│       └── mock_inference.py # Mock predictions for dev
├── models/                   # Trained models and artifacts
│   ├── ann_delay_model.h5           # Regression model
│   ├── ann_classifier_model.h5      # Classification model
│   ├── ann_scaler.pkl               # Regression feature scaler
│   ├── ann_class_scaler.pkl         # Classification feature scaler
│   ├── ann_feature_columns.pkl      # Regression feature columns
│   ├── ann_class_feature_columns.pkl # Classification feature columns
│   └── ann_label_encoder.pkl        # Label encoder
├── run.py                   # Application entry point
├── requirements.txt         # Python dependencies
└── README.md               # This file
```

## Installation

1. Create a virtual environment:
```bash
cd ml-services/delay-prediction-ml
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

## Running the API

### Development Mode

```bash
python run.py
```

The API will be available at `http://localhost:8081`

### Production Mode

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8081 --workers 4
```

## API Endpoints

### Health Check

**GET /** or **GET /health**

Returns API status and model loading state.

**Response:**
```json
{
  "status": "healthy",
  "mode": "production (real models)",
  "predictor_loaded": true
}
```

### Regression Prediction

**POST /predict/regression**

Predicts total delay days for a construction project.

**Request Body:**
```json
{
  "data": {
    "District": "Colombo",
    "Project_Type": "Commercial Building",
    "Contractor_ICTAD_Grade": "CIDA 1",
    "Contract_Value_LKR": 500000000,
    "Land_Area_Sqft": 15000,
    "Planned_Duration_Days": 365,
    "Weather_Impact_Score": 2.5,
    "Contractor_Experience_Years": 10,
    "Labor_Availability_Score": 3.0,
    "Material_Cost_Index": 105,
    "Inflation_Rate": 0.08,
    "Rainfall_mm": 150,
    "Equipment_Availability_Score": 3.5
  }
}
```

**Response:**
```json
{
  "success": true,
  "prediction_type": "regression",
  "regression_result": {
    "predicted_delay_days": 45.5,
    "delay_severity": "Moderate Delay (31-60 days)"
  },
  "classification_result": null
}
```

### Classification Prediction

**POST /predict/classification**

Predicts delay category for a construction project.

**Response:**
```json
{
  "success": true,
  "prediction_type": "classification",
  "regression_result": null,
  "classification_result": {
    "predicted_category": "Minor Delay",
    "category_index": 1,
    "confidence": 0.6234,
    "class_probabilities": {
      "On-Time": 0.2123,
      "Minor Delay": 0.6234,
      "Major Delay": 0.1234,
      "Critical Delay": 0.0409
    }
  }
}
```

### Full Prediction

**POST /predict**

Combines both regression and classification predictions.

**Response:**
```json
{
  "success": true,
  "prediction_type": "full",
  "regression_result": {
    "predicted_delay_days": 45.5,
    "delay_severity": "Moderate Delay (31-60 days)"
  },
  "classification_result": {
    "predicted_category": "Minor Delay",
    "category_index": 1,
    "confidence": 0.6234,
    "class_probabilities": {
      "On-Time": 0.2123,
      "Minor Delay": 0.6234,
      "Major Delay": 0.1234,
      "Critical Delay": 0.0409
    }
  }
}
```

## Error Responses

- `400 Bad Request`: Invalid input (e.g., missing features, invalid categorical values)
- `500 Internal Server Error`: Model inference error

## Configuration

### Development Mode

To run without trained models (for testing), edit `app/dev_config.py`:
```python
DEV_MODE = True  # Uses mock predictions
```

### Model Paths

Edit `app/config.py` to customize model file paths.

## Interactive Documentation

Once the server is running, visit:
- **Swagger UI**: `http://localhost:8081/docs`
- **ReDoc**: `http://localhost:8081/redoc`

## Input Features

The API expects the following features (based on Sri Lanka construction data):

| Feature | Type | Description |
|---------|------|-------------|
| District | Categorical | Sri Lanka district (e.g., "Colombo", "Gampaha") |
| Project_Type | Categorical | Type of construction project |
| Contractor_ICTAD_Grade | Categorical | ICTAD/CIDA contractor grade |
| Contract_Value_LKR | Numeric | Contract value in Sri Lankan Rupees |
| Land_Area_Sqft | Numeric | Land area in square feet |
| Planned_Duration_Days | Numeric | Planned project duration |
| Weather_Impact_Score | Numeric | Weather impact score (1-5) |
| Contractor_Experience_Years | Numeric | Years of contractor experience |
| Labor_Availability_Score | Numeric | Labor availability score (1-5) |
| Material_Cost_Index | Numeric | Material cost index |
| Inflation_Rate | Numeric | Current inflation rate |
| Rainfall_mm | Numeric | Average rainfall in mm |
| Equipment_Availability_Score | Numeric | Equipment availability score (1-5) |

## Models Used

- **ANN Regression Model** (`ann_delay_model.h5`): Predicts total delay days
  - Architecture: 64 → 32 → 16 → 1
  - Activation: ReLU (hidden), Linear (output)
  - Loss: MSE

- **ANN Classification Model** (`ann_classifier_model.h5`): Predicts delay category
  - Architecture: 64 → 32 → 16 → 4
  - Activation: ReLU (hidden), Softmax (output)
  - Loss: Sparse Categorical Crossentropy

## License

MIT License
