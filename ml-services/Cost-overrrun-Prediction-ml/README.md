# Construction Cost Overrun Prediction ML Service

Production-ready FastAPI service that serves two ML workflows:
- Pre-project cost overrun prediction + high-risk classification
- In-progress cost overrun forecasting

## Project Structure

```text
Cost-overrrun-Prediction-ml/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── config.py
│   └── loaders.py
├── src/
│   ├── __init__.py
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── health.py
│   │   └── predict.py
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── pre_project.py
│   │   └── in_progress.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── pre_project_service.py
│   │   └── in_progress_service.py
│   └── utils/
│       ├── __init__.py
│       └── io.py
├── models/
│   ├── pre_project/
│   └── in_progress/
├── requirements.txt
├── run.py
└── README.md
```

## Required Model Files

`models/pre_project/`
- `pre_project_ann_reg_model.keras`
- `pre_project_ann_clf_model.keras`
- `pre_project_preprocess.joblib`
- `pre_project_scaler.joblib`
- `pre_project_metadata.joblib`

`models/in_progress/`
- `in_progress_ann_reg_model.keras`
- `in_progress_preprocess.joblib`
- `in_progress_scaler.joblib`
- `in_progress_metadata.joblib`

If any file is missing, the API fails at startup with a clear error.

## Setup & Run

From the `Cost-overrrun-Prediction-ml` folder:

```bash
python -m venv venv
```

Activate virtual environment:

Windows (PowerShell):
```powershell
venv\Scripts\Activate.ps1
```

Windows (cmd):
```bat
venv\Scripts\activate.bat
```

Linux/macOS:
```bash
source venv/bin/activate
```

Install dependencies and run:

```bash
pip install -r requirements.txt
python run.py
```

Swagger UI:
- `http://localhost:8003/docs`

## Environment Variables

- `PORT` (default: `8003`)
- `DEV_MODE` (default: `False`)
  - Set `DEV_MODE=true` to enable auto-reload

Optional `.env` example:

```env
PORT=8003
DEV_MODE=true
```

## Endpoints

- `GET /health`
- `POST /predict/pre-project`
- `POST /predict/in-progress`

## Sample cURL Requests

### Health

```bash
curl -X GET "http://localhost:8003/health"
```

### Pre-Project Prediction

Use feature names from `models/pre_project/pre_project_metadata.joblib` under `feature_cols`.

```bash
curl -X POST "http://localhost:8003/predict/pre-project" \
  -H "Content-Type: application/json" \
  -d '{
    "feature_a": 10,
    "feature_b": 5.2,
    "feature_c": "urban"
  }'
```

Response shape:

```json
{
  "predicted_cost_overrun_percentage": 12.37,
  "predicted_high_risk_project": 1,
  "risk_label": "HIGH",
  "model_version": "pre_project_v1"
}
```

### In-Progress Prediction

Use feature names from `models/in_progress/in_progress_metadata.joblib` under `feature_cols`.
If `project_id` is sent, it is ignored.

```bash
curl -X POST "http://localhost:8003/predict/in-progress" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "P-1001",
    "feature_x": 73,
    "feature_y": 0.44,
    "feature_z": "yes"
  }'
```

Response shape:

```json
{
  "forecast_final_cost_overrun_pct_p50": 8.45,
  "risk_label": "MEDIUM",
  "model_version": "in_progress_v1"
}
```

## Error Handling

When required fields are missing, API returns `400`:

```json
{
  "detail": {
    "message": "Missing required fields",
    "missing_fields": ["feature_b", "feature_c"]
  }
}
```

Required fields are dynamically read from metadata (`feature_cols`) during startup.
