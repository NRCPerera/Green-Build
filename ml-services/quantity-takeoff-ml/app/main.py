"""
FastAPI Application
===================
Main application factory and lifespan management.
"""

import logging
from contextlib import asynccontextmanager

import torch
from fastapi import FastAPI

from .config import DEVICE, UNET_MODEL_PATH, RCNN_MODEL_PATH
from .models import ErrorResponse
from .services import load_unet_model, load_rcnn_model
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
    
    try:
        models["unet"] = load_unet_model(str(UNET_MODEL_PATH), DEVICE)
        models["rcnn"] = load_rcnn_model(str(RCNN_MODEL_PATH), DEVICE)
        
        # Share models with the API endpoints
        set_models(models)
        
        logger.info("All models loaded successfully!")
    except Exception as e:
        logger.error(f"Failed to load models: {e}")
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
