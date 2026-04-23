"""
FastAPI Application
===================
Main application factory and lifespan management.
"""

import logging
import os
import threading
from contextlib import asynccontextmanager
from concurrent.futures import ThreadPoolExecutor, as_completed

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
load_lock = threading.Lock()


def _prepare_model_artifacts(app: FastAPI) -> None:
    artifacts = [
        ("unet", UNET_MODEL_PATH, "QUANTITY_UNET_MODEL_URL"),
        ("rcnn", RCNN_MODEL_PATH, "QUANTITY_RCNN_MODEL_URL"),
        ("room", ROOM_MODEL_PATH, "QUANTITY_ROOM_MODEL_URL"),
    ]

    def prepare_one(label: str, model_path, env_var: str) -> str:
        logger.info("Preparing %s artifact", label)
        ensure_model_file(model_path, env_var)
        return label

    try:
        with ThreadPoolExecutor(max_workers=3, thread_name_prefix="artifact-fetch") as executor:
            future_map = {
                executor.submit(prepare_one, label, model_path, env_var): label
                for label, model_path, env_var in artifacts
            }
            for future in as_completed(future_map):
                label = future_map[future]
                future.result()
                app.state.model_status[f"{label}_artifact_ready"] = True
                logger.info("%s artifact is ready", label)
    except ModelDownloadError as exc:
        app.state.model_status["startup_error"] = str(exc)
        app.state.model_status["phase"] = "artifact_error"
        logger.error("Model artifact preparation failed: %s", exc)
        raise


def _log_model_files() -> None:
    for name, path in [("UNet++", UNET_MODEL_PATH), ("MaskRCNN", RCNN_MODEL_PATH), ("Room", ROOM_MODEL_PATH)]:
        if os.path.exists(path):
            size_mb = os.path.getsize(path) / (1024 * 1024)
            logger.info("Model file %s: %s (%.1f MB)", name, path, size_mb)
            if size_mb < 1.0:
                logger.error("WARNING: %s model file is only %.2f MB - likely not real weights", name, size_mb)
        else:
            logger.error("Model file %s: %s - FILE NOT FOUND", name, path)


def _background_load_models(app: FastAPI) -> None:
    with load_lock:
        logger.info("Starting background model preparation for Quantity Takeoff Engine")
        app.state.model_status["phase"] = "downloading"
        app.state.model_status["loading"] = True
        app.state.model_status["startup_error"] = None

        try:
            _prepare_model_artifacts(app)
            _log_model_files()

            app.state.model_status["phase"] = "loading_models"
            models["unet"] = load_unet_model(str(UNET_MODEL_PATH), DEVICE)
            models["rcnn"] = load_rcnn_model(str(RCNN_MODEL_PATH), DEVICE)
            models["room"] = load_room_model(str(ROOM_MODEL_PATH), DEVICE)
            set_models(models)

            app.state.model_status.update({
                "phase": "ready",
                "loading": False,
                "unet_loaded": "unet" in models,
                "rcnn_loaded": "rcnn" in models,
                "room_loaded": models.get("room") is not None,
            })
            logger.info("All models loaded successfully!")
        except Exception as exc:
            app.state.model_status["startup_error"] = str(exc)
            app.state.model_status["phase"] = "load_error"
            app.state.model_status["loading"] = False
            logger.error("Failed to load models: %s", exc, exc_info=True)
            logger.warning("Server is up, but inference will return 503 until model loading succeeds")


def _start_background_loader(app: FastAPI) -> None:
    loader = threading.Thread(
        target=_background_load_models,
        args=(app,),
        daemon=True,
        name="quantity-model-loader",
    )
    loader.start()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager for loading/unloading models.
    """
    logger.info("Starting Quantity Takeoff Engine on %s", DEVICE)
    app.state.model_status = {
        "loading": True,
        "phase": "starting",
        "unet_artifact_ready": False,
        "rcnn_artifact_ready": False,
        "room_artifact_ready": False,
        "unet_loaded": False,
        "rcnn_loaded": False,
        "room_loaded": False,
        "startup_error": None,
    }
    _start_background_loader(app)
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
