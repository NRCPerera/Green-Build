import logging
from contextlib import asynccontextmanager

import joblib
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.endpoints import router, set_models
from .config import (
    LCC_TARGET_SCALER_PATH,
    LIFECYCLE_MODEL_PATH,
    RISK_MODEL_PATH,
    SCALER_PATH,
    SUSTAINABILITY_MODEL_PATH,
    SUSTAIN_TARGET_SCALER_PATH,
)
from .models.schemas import ErrorResponse
from .services.keras_compat import load_keras_model_compat

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

sustainability_artefacts: dict = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.model_status = {
        "scaler_loaded": False,
        "lcc_target_scaler_loaded": False,
        "sustain_target_scaler_loaded": False,
        "lifecycle_model_loaded": False,
        "sustainability_model_loaded": False,
        "risk_model_loaded": False,
        "startup_error": None,
    }

    logger.info("Loading Sustainability ML models...")
    try:
        sustainability_artefacts["scaler"] = joblib.load(SCALER_PATH)
        app.state.model_status["scaler_loaded"] = True

        sustainability_artefacts["scaler_y_lcc"] = joblib.load(LCC_TARGET_SCALER_PATH)
        app.state.model_status["lcc_target_scaler_loaded"] = True

        sustainability_artefacts["scaler_y_sustain"] = joblib.load(SUSTAIN_TARGET_SCALER_PATH)
        app.state.model_status["sustain_target_scaler_loaded"] = True

        sustainability_artefacts["lifecycle"] = load_keras_model_compat(LIFECYCLE_MODEL_PATH)
        app.state.model_status["lifecycle_model_loaded"] = True

        sustainability_artefacts["sustainability"] = load_keras_model_compat(SUSTAINABILITY_MODEL_PATH)
        app.state.model_status["sustainability_model_loaded"] = True

        sustainability_artefacts["risk"] = load_keras_model_compat(RISK_MODEL_PATH)
        app.state.model_status["risk_model_loaded"] = True

        set_models(sustainability_artefacts)
        logger.info("Sustainability models loaded successfully")
    except Exception as exc:
        app.state.model_status["startup_error"] = str(exc)
        logger.warning("Sustainability models not loaded (non-fatal): %s", exc)

    logger.info("All model loading complete; server is ready.")
    yield
    logger.info("Shutting down Sustainability ML Engine...")
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
