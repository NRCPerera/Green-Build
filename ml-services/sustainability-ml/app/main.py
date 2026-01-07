"""Main FastAPI application - API Only (UI served by React)"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import (
    API_TITLE,
    API_DESCRIPTION,
    API_VERSION,
    SUSTAINABILITY_MODEL_PATH,
    LIFECYCLE_COST_MODEL_PATH,
    RISK_PREDICTION_MODEL_PATH,
    FEATURE_SCALER_PATH,
    FEATURE_NAMES_PATH,
    CATEGORICAL_MAPPINGS_PATH,
    NUMERIC_MEDIANS_PATH,
    CATEGORICAL_MODES_PATH
)
from app.dev_config import DEV_MODE
from app.services import ModelLoader, Preprocessor, InferenceService
from app.services.mock_inference import MockInferenceService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global variables for models and services
model_loader = None
inference_service = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan handler
    Loads models on startup and cleans up on shutdown
    """
    global model_loader, inference_service
    
    logger.info("=" * 60)
    logger.info("Starting Sustainability Prediction API")
    logger.info("(API Only - UI served by React frontend)")
    logger.info("=" * 60)
    
    try:
        if DEV_MODE:
            # Development mode - use mock predictions
            logger.warning("⚠️  RUNNING IN DEVELOPMENT MODE - MOCK PREDICTIONS ONLY")
            logger.warning("⚠️  To use real models, set DEV_MODE=False in app/dev_config.py")
            logger.warning("⚠️  and ensure all model files are in the models/ folder")
            logger.info("=" * 60)
            
            # Use mock inference service
            inference_service = MockInferenceService()
            
        else:
            # Production mode - load real models
            logger.info("PRODUCTION MODE - Loading trained models")
            
            # Initialize model loader
            model_loader = ModelLoader()
            
            # Load all models and artifacts
            model_loader.load_all(
                sustainability_path=SUSTAINABILITY_MODEL_PATH,
                lifecycle_cost_path=LIFECYCLE_COST_MODEL_PATH,
                risk_prediction_path=RISK_PREDICTION_MODEL_PATH,
                scaler_path=FEATURE_SCALER_PATH,
                feature_names_path=FEATURE_NAMES_PATH,
                categorical_mappings_path=CATEGORICAL_MAPPINGS_PATH,
                numeric_medians_path=NUMERIC_MEDIANS_PATH,
                categorical_modes_path=CATEGORICAL_MODES_PATH
            )
            
            # Initialize preprocessor
            preprocessor = Preprocessor(
                categorical_mappings=model_loader.categorical_mappings,
                numeric_medians=model_loader.numeric_medians,
                categorical_modes=model_loader.categorical_modes,
                feature_names=model_loader.feature_names,
                feature_scaler=model_loader.feature_scaler
            )
            
            # Initialize inference service
            inference_service = InferenceService(
                sustainability_model=model_loader.sustainability_model,
                lifecycle_cost_model=model_loader.lifecycle_cost_model,
                risk_prediction_model=model_loader.risk_prediction_model,
                preprocessor=preprocessor
            )
        
        # Set the inference service in endpoints module
        from app.api import endpoints
        endpoints.set_inference_service(inference_service)
        
        logger.info("=" * 60)
        logger.info("API startup complete - Ready to serve requests")
        logger.info("API Docs:  http://localhost:8003/docs")
        logger.info("Health:    http://localhost:8003/health")
        logger.info("Predict:   POST http://localhost:8003/predict")
        logger.info("=" * 60)
        
        yield
        
    except Exception as e:
        logger.error(f"Failed to initialize application: {str(e)}", exc_info=True)
        raise
    
    finally:
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

# Include API routers
from app.api import endpoints
app.include_router(endpoints.router)


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "mode": "development (mock predictions)" if DEV_MODE else "production (real models)",
        "models_loaded": model_loader.is_loaded() if (not DEV_MODE and model_loader) else False,
        "version": "3.0-api-only"
    }
