"""
FastAPI Application
===================
Main application factory and lifespan management.
"""

import logging
from contextlib import asynccontextmanager

import torch
from fastapi import FastAPI

from .config import DEVICE, UNET_MODEL_PATH, RCNN_MODEL_PATH, ROOM_MODEL_PATH
from .models import ErrorResponse
from .services import load_unet_model, load_rcnn_model, load_room_model
from .api.endpoints import router, set_models

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Global models dictionary
models = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager for loading/unloading models.
    """
    # Startup: Load models
    logger.info(f"Starting Quantity Takeoff Engine on {DEVICE}")
    logger.info("Loading ML models...")
    
    # Log model file sizes to detect Git LFS pointer files vs real weights
    import os
    for name, path in [("UNet++", UNET_MODEL_PATH), ("MaskRCNN", RCNN_MODEL_PATH), ("Room", ROOM_MODEL_PATH)]:
        if os.path.exists(path):
            size_mb = os.path.getsize(path) / (1024 * 1024)
            logger.info(f"Model file {name}: {path} ({size_mb:.1f} MB)")
            if size_mb < 1.0:
                logger.error(f"WARNING: {name} model file is only {size_mb:.2f} MB — likely a Git LFS pointer, not real weights!")
        else:
            logger.error(f"Model file {name}: {path} — FILE NOT FOUND")
    
    try:
        models["unet"] = load_unet_model(str(UNET_MODEL_PATH), DEVICE)
        models["rcnn"] = load_rcnn_model(str(RCNN_MODEL_PATH), DEVICE)
        models["room"] = load_room_model(str(ROOM_MODEL_PATH), DEVICE)
        
        # Share models with the API endpoints
        set_models(models)
        
        logger.info("All models loaded successfully!")
    except Exception as e:
        logger.error(f"Failed to load models: {e}", exc_info=True)
        raise
    
    yield  # Application runs here
    
    # Shutdown: Cleanup
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
        }
    )
    
    # Include API routes
    app.include_router(router)
    
    return app


# Create the application instance
app = create_app()
