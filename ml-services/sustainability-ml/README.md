# Sustainability Prediction ML Service

Machine learning service for predicting sustainability metrics in construction projects.

## Features

This service provides three core prediction capabilities:

1. **Sustainability Score Prediction** - Predicts overall sustainability score (0-100)
2. **Lifecycle Cost Prediction** - Estimates total lifecycle costs and operational expenses
3. **Risk Assessment** - Identifies sustainability risks and provides mitigation recommendations

## Project Structure

```
sustainability-ml/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application
│   ├── config.py            # Configuration settings
│   ├── dev_config.py        # Development mode toggle
│   ├── api/
│   │   ├── __init__.py
│   │   └── endpoints.py     # API endpoints
│   ├── models/
│   │   ├── __init__.py
│   │   └── schemas.py       # Pydantic models
│   └── services/
│       ├── __init__.py
│       ├── model_loader.py      # Model loading
│       ├── preprocessing.py     # Data preprocessing
│       ├── inference.py         # Real predictions
│       └── mock_inference.py    # Mock predictions
├── models/
│   ├── sustainability_model.keras
│   ├── lifecycle_cost_model.keras
│   └── risk_prediction_model.keras
├── run.py                   # Application entry point
├── requirements.txt         # Python dependencies
└── README.md
```

## Setup

### 1. Create Virtual Environment

```bash
python -m venv venv
```

### 2. Activate Virtual Environment

**Windows:**
```bash
venv\Scripts\activate
```

**Linux/Mac:**
```bash
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

## Running the Service

### Development Mode (Mock Predictions)

By default, the service runs in development mode with mock predictions:

```bash
python run.py
```

The API will be available at `http://localhost:8003`

### Production Mode (Real Models)

To use real model predictions:

1. Set `DEV_MODE = False` in `app/dev_config.py`
2. Ensure all required model files are in the `models/` folder
3. Run the service:

```bash
python run.py
```

## API Documentation

Once running, visit:
- **Interactive API docs**: http://localhost:8003/docs
- **Alternative docs**: http://localhost:8003/redoc

## API Endpoints

### Health Check
```
GET /health
```

### Sustainability Prediction
```
POST /predict/sustainability
```

### Lifecycle Cost Prediction
```
POST /predict/lifecycle-cost
```

### Risk Assessment
```
POST /predict/risk
```

## Models

The service uses three TensorFlow/Keras models:

1. `sustainability_model.keras` - Sustainability score prediction
2. `lifecycle_cost_model.keras` - Lifecycle cost estimation
3. `risk_prediction_model.keras` - Risk assessment

## Development

### Adding New Features

1. Update Pydantic schemas in `app/models/schemas.py`
2. Add preprocessing logic in `app/services/preprocessing.py`
3. Implement inference logic in `app/services/inference.py`
4. Create new endpoints in `app/api/endpoints.py`

### Testing

The mock inference service (`app/services/mock_inference.py`) allows testing API functionality without loading actual models.

## Notes

- **Port**: This service runs on port 8003 (8001 and 8002 are used by other ML services)
- **CORS**: Currently configured to allow all origins. Update in production.
- **Logging**: Configured to INFO level by default

## Team Integration

This service follows the same architectural pattern as other ML services in the `ml-services/` directory:
- FastAPI framework
- Uvicorn server
- Structured app layout with services, models, and API layers
- Development mode for testing without models
