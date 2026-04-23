"""
FastAPI Application
===================
Main application factory and lifespan management.
"""

import logging
import os
from contextlib import asynccontextmanager

import torch
from fastapi import FastAPI

from .api.endpoints import router, set_models
from .config import DEVICE, RCNN_MODEL_PATH, ROOM_MODEL_PATH, UNET_MODEL_PATH
from .models import ErrorResponse
from .services import (
    ModelDownloadError,
    ensure_model_file,
    load_rcnn_model,
    load_room_model,
    load_unet_model,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

models = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager for loading/unloading models.
    """
    logger.info("Starting Quantity Takeoff Engine on %s", DEVICE)
    logger.info("Loading ML models...")
    app.state.model_status = {
        "unet_ready": False,
        "rcnn_ready": False,
        "room_ready": False,
        "startup_error": None,
    }

    try:
        ensure_model_file(UNET_MODEL_PATH, "QUANTITY_UNET_MODEL_URL")
        ensure_model_file(RCNN_MODEL_PATH, "QUANTITY_RCNN_MODEL_URL")
        ensure_model_file(ROOM_MODEL_PATH, "QUANTITY_ROOM_MODEL_URL")
        app.state.model_status.update({
            "unet_ready": True,
            "rcnn_ready": True,
            "room_ready": True,
        })
    except ModelDownloadError as exc:
        app.state.model_status["startup_error"] = str(exc)
        logger.error("Model artifact preparation failed: %s", exc)

    for name, path in [("UNet++", UNET_MODEL_PATH), ("MaskRCNN", RCNN_MODEL_PATH), ("Room", ROOM_MODEL_PATH)]:
        if os.path.exists(path):
            size_mb = os.path.getsize(path) / (1024 * 1024)
            logger.info("Model file %s: %s (%.1f MB)", name, path, size_mb)
            if size_mb < 1.0:
                logger.error("WARNING: %s model file is only %.2f MB - likely not real weights", name, size_mb)
        else:
            logger.error("Model file %s: %s - FILE NOT FOUND", name, path)

    try:
        models["unet"] = load_unet_model(str(UNET_MODEL_PATH), DEVICE)
        models["rcnn"] = load_rcnn_model(str(RCNN_MODEL_PATH), DEVICE)
        models["room"] = load_room_model(str(ROOM_MODEL_PATH), DEVICE)
        set_models(models)
        logger.info("All models loaded successfully!")
    except Exception as exc:
        app.state.model_status["startup_error"] = str(exc)
        logger.error("Failed to load models: %s", exc, exc_info=True)
        logger.warning("Server will start but inference will fail until models are loaded")

    yield

    logger.info("Shutting down Quantity Takeoff Engine...")
    models.clear()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
    logger.info("Cleanup complete.")


def create_app() -> FastAPI:
    """
    Application factory function.

    Returns:
        Configured FastAPI application instance
    """
    app = FastAPI(
        title="Quantity Takeoff Computation Engine",
        description="AI-powered quantity takeoff calculations for construction drawings",
        version="1.0.0",
        lifespan=lifespan,
        responses={
            500: {"model": ErrorResponse, "description": "Internal Server Error"}
        },
    )

    app.include_router(router)
    return app


app = create_app()
