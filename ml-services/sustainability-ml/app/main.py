import logging
import joblib
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from tensorflow.keras.models import load_model # type: ignore

from .config import (
    SCALER_PATH, LCC_TARGET_SCALER_PATH, SUSTAIN_TARGET_SCALER_PATH,
    LIFECYCLE_MODEL_PATH, SUSTAINABILITY_MODEL_PATH, RISK_MODEL_PATH
)
from .api.endpoints import router, set_models
from .models.schemas import ErrorResponse

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

sustainability_artefacts: dict = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Loading Sustainability ML models …")
    try:
        sustainability_artefacts["scaler"] = joblib.load(SCALER_PATH)
        sustainability_artefacts["scaler_y_lcc"] = joblib.load(LCC_TARGET_SCALER_PATH)
        sustainability_artefacts["scaler_y_sustain"] = joblib.load(SUSTAIN_TARGET_SCALER_PATH)
        sustainability_artefacts["lifecycle"] = load_model(str(LIFECYCLE_MODEL_PATH))
        sustainability_artefacts["sustainability"] = load_model(str(SUSTAINABILITY_MODEL_PATH))
        sustainability_artefacts["risk"] = load_model(str(RISK_MODEL_PATH))
        set_models(sustainability_artefacts)
        logger.info("Sustainability models loaded ✓")
    except Exception as e:
        logger.warning(f"Sustainability models not loaded (non-fatal): {e}")

    logger.info("All model loading complete – server is ready.")
    yield
    logger.info("Shutting down Sustainability ML Engine …")
    sustainability_artefacts.clear()
    logger.info("Cleanup complete.")

def create_app() -> FastAPI:
    app = FastAPI(
        title="Green-Build Sustainability ML Engine",
        description="Unified ML service for Sustainability Analysis.",
        version="2.0.0",
        lifespan=lifespan,
        responses={500: {"model": ErrorResponse, "description": "Internal Server Error"}},
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(router)

    return app

app = create_app()
