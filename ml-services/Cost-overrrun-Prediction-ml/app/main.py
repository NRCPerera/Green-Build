from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.config import get_config
from app.loaders import ArtifactLoadError, load_model_registry
from src.routes.health import router as health_router
from src.routes.predict import router as predict_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    config = get_config()
    app.state.model_registry = None
    app.state.model_status = {
        "pre_project_loaded": False,
        "in_progress_loaded": False,
        "startup_error": None,
    }
    try:
        app.state.model_registry = load_model_registry(config)
        app.state.model_status = {
            "pre_project_loaded": app.state.model_registry.pre_project is not None,
            "in_progress_loaded": app.state.model_registry.in_progress is not None,
            "startup_error": None,
        }
    except ArtifactLoadError as exc:
        app.state.model_status["startup_error"] = str(exc)
        logger.exception("Startup failed: %s", exc)
        # DO NOT RAISE here so the container can still start and listen on the port
        # This allows us to see the exact error in the logs without Cloud Run killing it
    yield


app = FastAPI(
    title="Construction Cost Overrun Prediction API",
    description="FastAPI service for pre-project and in-progress cost overrun predictions.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.include_router(health_router)
app.include_router(predict_router)
