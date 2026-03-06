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
    try:
        app.state.model_registry = load_model_registry(config)
    except ArtifactLoadError as exc:
        logger.exception("Startup failed: %s", exc)
        raise RuntimeError(str(exc)) from exc
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
