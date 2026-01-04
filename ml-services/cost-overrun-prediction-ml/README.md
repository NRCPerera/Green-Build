# Cost Overrun Prediction API

Production-ready FastAPI backend for predicting construction project cost overruns using deep learning ANN models.

## Features

- ✅ Dual ANN model inference (regression + classification)
- ✅ Automatic feature preprocessing and validation
- ✅ Missing value imputation
- ✅ Categorical encoding with one-hot encoding
- ✅ Feature scaling and alignment
- ✅ Comprehensive error handling
- ✅ CORS enabled for cross-origin requests
- ✅ Health check endpoints

## Project Structure

```
cost-overrun-prediction-ml/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application
│   ├── config.py            # Configuration settings
│   ├── api/
│   │   ├── __init__.py
│   │   └── endpoints.py     # API routes
│   ├── models/
│   │   ├── __init__.py
│   │   └── schemas.py       # Pydantic models
│   └── services/
│       ├── __init__.py
│       ├── model_loader.py  # Model loading
│       ├── preprocessing.py # Data preprocessing
│       └── inference.py     # Model inference
├── models/                   # Trained models and artifacts
│   ├── ann_regression_model.keras
│   ├── ann_classification_model.keras
│   ├── feature_scaler.joblib
│   ├── feature_names.joblib
│   ├── categorical_mappings.joblib
│   ├── numeric_medians.joblib
│   └── categorical_modes.joblib
├── run.py                   # Application entry point
├── requirements.txt         # Python dependencies
└── README.md               # This file
```

## Installation

1. Create a virtual environment:
```bash
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

The API will be available at `http://localhost:8001`

### Production Mode

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8001 --workers 4
```

## API Endpoints

### Health Check

**GET /** or **GET /health**

Returns API status and model loading state.

**Response:**
```json
{
  "status": "healthy",
  "service": "Cost Overrun Prediction API",
  "version": "1.0.0"
}
```

### Prediction

**POST /predict/raw**

Predicts cost overrun for a construction project.

**Request Body:**
```json
{
  "data": {
    "project_size": 5000000,
    "duration_months": 18,
    "project_type": "Commercial",
    "location": "Urban",
    "contractor_experience": "High",
    "weather_risk": "Medium"
  }
}
```

**Response:**
```json
{
  "predicted_cost_overrun_pct": 15.5,
  "overrun_probability": 0.78,
  "high_risk_label": true,
  "threshold": 0.5
}
```

**Error Responses:**

- `400 Bad Request`: Invalid input (e.g., invalid categorical values)
- `500 Internal Server Error`: Model inference error

## Data Flow

1. **Input Validation**: Validates categorical values against allowed mappings
2. **Missing Value Imputation**: 
   - Numeric features → median values
   - Categorical features → mode values
3. **Categorical Encoding**: One-hot encoding with `drop_first=True`
4. **Feature Alignment**: Aligns features to match training feature names
5. **Feature Scaling**: Applies StandardScaler transformation
6. **Model Inference**:
   - Regression model → cost overrun percentage
   - Classification model → overrun probability
7. **Classification**: Applies threshold (0.5) for high risk label

## Configuration

Edit `app/config.py` to customize:
- Model file paths
- Classification threshold
- API metadata

## Interactive Documentation

Once the server is running, visit:
- Swagger UI: `http://localhost:8001/docs`
- ReDoc: `http://localhost:8001/redoc`

## Logging

The application uses Python's built-in logging with INFO level by default. Logs include:
- Model loading status
- Preprocessing steps
- Prediction results
- Error traces

## Error Handling

- **Validation Errors (400)**: Invalid categorical values, missing required fields
- **Model Errors (500)**: Model loading failures, inference errors, unexpected exceptions

## Models Used

- **ANN Regression Model**: Predicts cost overrun percentage
- **ANN Classification Model**: Predicts probability of cost overrun occurrence
- **Preprocessing Artifacts**:
  - Feature scaler (StandardScaler)
  - Feature names (column order)
  - Categorical mappings (allowed values)
  - Numeric medians (imputation)
  - Categorical modes (imputation)

## License

MIT License
