"""Main FastAPI application"""
# Reload trigger v2

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import (
    API_TITLE,
    API_DESCRIPTION,
    API_VERSION,
    MODELS_DIR
)
from app.dev_config import DEV_MODE
from app.services.predictor import DelayPredictor
from app.services.mock_inference import MockInferenceService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global variables for predictor
predictor = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan handler
    Loads models on startup and cleans up on shutdown
    """
    global predictor
    
    logger.info("=" * 60)
    logger.info("Starting Construction Delay Prediction API")
    logger.info("=" * 60)
    app.state.model_status = {
        "dev_mode": DEV_MODE,
        "real_models_loaded": False,
        "predictor_backend": "mock",
        "startup_error": None,
    }
    
    if DEV_MODE:
        # Development mode - use mock predictions
        logger.warning("RUNNING IN DEVELOPMENT MODE - MOCK PREDICTIONS ONLY")
        predictor = MockInferenceService()
    else:
        # Production mode - try to load real models, fall back to mock if it fails
        logger.info("PRODUCTION MODE - Loading trained models")
        logger.info(f"Models directory: {MODELS_DIR}")
        try:
            predictor = DelayPredictor(models_dir=MODELS_DIR)
            logger.info("Models loaded successfully!")
            app.state.model_status.update({
                "real_models_loaded": True,
                "predictor_backend": "real",
            })
        except Exception as e:
            logger.error(f"Failed to load models: {str(e)}", exc_info=True)
            logger.warning("FALLING BACK TO MOCK PREDICTIONS - real models unavailable")
            app.state.model_status["startup_error"] = str(e)
            predictor = MockInferenceService()
    
    # Always set the predictor so endpoints never get None
    from app.api import endpoints
    endpoints.set_predictor(predictor)
    
    logger.info("=" * 60)
    logger.info("Application startup complete - Ready to serve requests")
    logger.info("=" * 60)
    
    # yield MUST be outside try/except — asynccontextmanager requires exactly one yield
    yield
    
    # Cleanup on shutdown
    logger.info("Shutting down application...")


# Create FastAPI application
app = FastAPI(
    title=API_TITLE,
    description=API_DESCRIPTION,
    version=API_VERSION,
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
from app.api import endpoints
app.include_router(endpoints.router)


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "mode": "development (mock predictions)" if DEV_MODE else "production (real models)",
        "predictor_loaded": predictor is not None,
        "model_status": getattr(app.state, "model_status", {}),
    }
