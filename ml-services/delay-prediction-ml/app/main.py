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
    
    try:
        if DEV_MODE:
            # Development mode - use mock predictions
            logger.warning("RUNNING IN DEVELOPMENT MODE - MOCK PREDICTIONS ONLY")
            logger.warning("To use real models, set DEV_MODE=False in app/dev_config.py")
            logger.warning("and ensure all model files are in the models/ folder")
            logger.info("=" * 60)
            
            # Use mock inference service
            predictor = MockInferenceService()
            
        else:
            # Production mode - load real models
            logger.info("PRODUCTION MODE - Loading trained ANN models")
            logger.info(f"Models directory: {MODELS_DIR}")
            
            # Initialize the DelayPredictor
            predictor = DelayPredictor(models_dir=MODELS_DIR)
        
        # Set the predictor in endpoints module
        from app.api import endpoints
        endpoints.set_predictor(predictor)
        
        logger.info("=" * 60)
        logger.info("Application startup complete - Ready to serve requests")
        logger.info("=" * 60)
        
    except Exception as e:
        logger.error(f"Failed to initialize application: {str(e)}", exc_info=True)
        logger.warning("Server will start but predictions will fail until models are loaded")
    
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
        "predictor_loaded": predictor is not None
    }
