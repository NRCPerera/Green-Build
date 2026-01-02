"""
API Endpoints
=============
FastAPI route handlers for the Quantity Takeoff API.
"""

import logging

import cv2
import numpy as np
from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from ..config import INFERENCE_SIZE
from ..models import QuantityTakeoffResponse, ErrorResponse
from ..services import (
    preprocess_image,
    preprocess_for_rcnn,
    run_unet_inference,
    run_rcnn_inference,
    compute_quantity_takeoff
)

logger = logging.getLogger(__name__)

router = APIRouter()

# Global reference to loaded models (set by main app)
models = {}


def set_models(model_dict: dict):
    """Set the loaded models for use in endpoints."""
    global models
    models = model_dict


@router.get("/", tags=["Health"])
async def root():
    """Health check endpoint."""
    from ..config import DEVICE
    return {
        "status": "healthy",
        "service": "Quantity Takeoff Engine",
        "device": str(DEVICE),
        "models_loaded": list(models.keys())
    }


@router.get("/health", tags=["Health"])
async def health_check():
    """Detailed health check."""
    import torch
    from ..config import DEVICE
    return {
        "status": "healthy",
        "cuda_available": torch.cuda.is_available(),
        "device": str(DEVICE),
        "unet_loaded": "unet" in models,
        "rcnn_loaded": "rcnn" in models
    }


@router.post(
    "/calculate-quantities",
    response_model=QuantityTakeoffResponse,
    tags=["Inference"],
    summary="Calculate Quantity Takeoff",
    description="Upload a construction drawing image to calculate wall areas and deductions."
)
async def calculate_quantities(
    file: UploadFile = File(..., description="Construction drawing image file"),
    scale_ppm: float = Form(..., description="Scale: Pixels Per Meter", gt=0),
    wall_height: float = Form(..., description="Wall height in meters", gt=0)
):
    """
    Calculate quantity takeoff from a construction drawing.
    
    This endpoint performs the following:
    1. Runs U-Net++ inference to detect walls
    2. Skeletonizes the wall mask to compute centerline length
    3. Runs Mask R-CNN inference to detect doors and windows
    4. Calculates gross wall surface area
    5. Calculates deductions from doors/windows
    6. Detects rooms and calculates floor areas
    7. Returns net wall surface area and room data
    """
    logger.info(f"Processing image: {file.filename}")
    logger.info(f"Scale: {scale_ppm} ppm, Wall Height: {wall_height}m")
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/jpg", "image/tiff", "image/bmp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type: {file.content_type}. Allowed: {allowed_types}"
        )
    
    try:
        # Read image bytes
        contents = await file.read()
        
        # Decode image using OpenCV
        nparr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            raise HTTPException(
                status_code=400,
                detail="Failed to decode image. Please upload a valid image file."
            )
        
        logger.info(f"Image shape: {image.shape}")
        
        # Get original image dimensions before resizing
        original_height, original_width = image.shape[:2]
        
        # Calculate scale adjustment factor for inference size
        inference_height, inference_width = INFERENCE_SIZE
        scale_x = inference_width / original_width
        scale_y = inference_height / original_height
        avg_scale_factor = (scale_x + scale_y) / 2
        
        # Adjusted scale in pixels per meter for the inference-sized image
        adjusted_scale_ppm = scale_ppm * avg_scale_factor
        
        logger.info(f"Original size: {original_width}x{original_height}")
        logger.info(f"Inference size: {inference_width}x{inference_height}")
        logger.info(f"Scale adjustment factor: {avg_scale_factor:.4f}")
        logger.info(f"Original scale_ppm: {scale_ppm}, Adjusted scale_ppm: {adjusted_scale_ppm:.2f}")
        
        # Preprocess for U-Net
        unet_tensor, resized_image = preprocess_image(image)
        
        # Preprocess for Mask R-CNN
        rcnn_tensor = preprocess_for_rcnn(image)
        
        # Run U-Net inference for wall segmentation
        logger.info("Running U-Net++ inference...")
        wall_mask = run_unet_inference(models["unet"], unet_tensor)
        
        # Run Mask R-CNN inference for door/window detection
        logger.info("Running Mask R-CNN inference...")
        detections = run_rcnn_inference(models["rcnn"], rcnn_tensor)
        logger.info(f"Detected {len(detections)} objects")
        
        # Create detection overlay visualization on resized image
        from ..services import create_detection_overlay
        resized_for_overlay = cv2.resize(image, INFERENCE_SIZE)
        detection_overlay = create_detection_overlay(resized_for_overlay, detections)
        
        # Compute quantity takeoff with ADJUSTED scale for inference size
        result = compute_quantity_takeoff(
            wall_mask=wall_mask,
            detections=detections,
            scale_ppm=adjusted_scale_ppm,
            wall_height=wall_height
        )
        
        # Add detection overlay to result
        result.detection_overlay_base64 = detection_overlay
        
        logger.info("Quantity takeoff calculation complete!")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing image: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error processing image: {str(e)}"
        )
