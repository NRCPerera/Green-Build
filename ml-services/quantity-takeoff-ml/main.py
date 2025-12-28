"""
Quantity Takeoff Computation Engine
====================================
A single-file FastAPI application for calculating wall surface areas,
detecting doors/windows, and computing deductions from construction drawings.

Author: Senior Python ML Engineer
"""

import io
import logging
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Tuple

import albumentations as A
import cv2
import numpy as np
import torch
import torch.nn as nn
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from skimage.morphology import skeletonize

# Import model architectures
import segmentation_models_pytorch as smp
from torchvision.models.detection import maskrcnn_resnet50_fpn
from torchvision.models.detection.faster_rcnn import FastRCNNPredictor
from torchvision.models.detection.mask_rcnn import MaskRCNNPredictor

# ============================================================================
# Configuration
# ============================================================================

# Model paths
UNET_MODEL_PATH = "./models/best_unet_cubicasa.pth"
RCNN_MODEL_PATH = "./models/final_maskrcnn_optimized.pth"

# Inference settings
INFERENCE_SIZE = (800, 800)
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Class labels for Mask R-CNN (0 = background)
RCNN_CLASSES = {
    1: "door",
    2: "window"
}
NUM_RCNN_CLASSES = len(RCNN_CLASSES) + 1  # +1 for background

# Confidence threshold for detections
DETECTION_CONFIDENCE_THRESHOLD = 0.5

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# ============================================================================
# Global Model Storage
# ============================================================================

models: Dict[str, nn.Module] = {}

# ============================================================================
# Response Schemas
# ============================================================================

class ItemCount(BaseModel):
    """Count of detected items by type."""
    doors: int = Field(default=0, description="Number of doors detected")
    windows: int = Field(default=0, description="Number of windows detected")


class QuantityTakeoffResponse(BaseModel):
    """Response schema for quantity takeoff calculations."""
    wall_total_length_m: float = Field(
        ..., 
        description="Total wall centerline length in meters"
    )
    wall_gross_surface_area_m2: float = Field(
        ..., 
        description="Gross wall surface area in square meters"
    )
    deductions_area_m2: float = Field(
        ..., 
        description="Total area of doors and windows in square meters"
    )
    wall_net_surface_area_m2: float = Field(
        ..., 
        description="Net wall surface area after deductions in square meters"
    )
    item_counts: ItemCount = Field(
        ..., 
        description="Count of detected doors and windows"
    )


class ErrorResponse(BaseModel):
    """Error response schema."""
    detail: str
    error_code: str


# ============================================================================
# Model Loading Utilities
# ============================================================================

def load_unet_model(model_path: str, device: torch.device) -> nn.Module:
    """
    Load the U-Net++ model for wall segmentation.
    
    Args:
        model_path: Path to the pretrained model weights
        device: Torch device (CPU/CUDA)
        
    Returns:
        Loaded U-Net++ model in eval mode
    """
    logger.info(f"Loading U-Net++ model from {model_path}")
    
    # Initialize U-Net++ with EfficientNet-B4 encoder
    model = smp.UnetPlusPlus(
        encoder_name="efficientnet-b4",
        encoder_weights=None,  # We're loading pretrained weights
        in_channels=3,
        classes=1,  # Binary segmentation for walls
        activation=None  # Raw logits for flexibility
    )
    
    try:
        state_dict = torch.load(model_path, map_location=device, weights_only=True)
        
        # Handle potential DataParallel wrapper
        if list(state_dict.keys())[0].startswith("module."):
            state_dict = {k.replace("module.", ""): v for k, v in state_dict.items()}
        
        model.load_state_dict(state_dict)
        model.to(device)
        model.eval()
        logger.info("U-Net++ model loaded successfully")
        return model
        
    except FileNotFoundError:
        logger.warning(f"U-Net++ model file not found at {model_path}. Using random weights.")
        model.to(device)
        model.eval()
        return model
    except Exception as e:
        logger.error(f"Error loading U-Net++ model: {e}")
        raise


def get_mask_rcnn_model(num_classes: int) -> nn.Module:
    """
    Create a Mask R-CNN model with custom number of classes.
    
    Args:
        num_classes: Number of classes (including background)
        
    Returns:
        Mask R-CNN model architecture
    """
    # Load pretrained Mask R-CNN
    model = maskrcnn_resnet50_fpn(pretrained=False)
    
    # Replace the box predictor
    in_features = model.roi_heads.box_predictor.cls_score.in_features
    model.roi_heads.box_predictor = FastRCNNPredictor(in_features, num_classes)
    
    # Replace the mask predictor
    in_features_mask = model.roi_heads.mask_predictor.conv5_mask.in_channels
    hidden_layer = 256
    model.roi_heads.mask_predictor = MaskRCNNPredictor(
        in_features_mask, 
        hidden_layer, 
        num_classes
    )
    
    return model


def load_rcnn_model(model_path: str, device: torch.device) -> nn.Module:
    """
    Load the Mask R-CNN model for door/window detection.
    
    Args:
        model_path: Path to the pretrained model weights
        device: Torch device (CPU/CUDA)
        
    Returns:
        Loaded Mask R-CNN model in eval mode
    """
    logger.info(f"Loading Mask R-CNN model from {model_path}")
    
    model = get_mask_rcnn_model(NUM_RCNN_CLASSES)
    
    try:
        state_dict = torch.load(model_path, map_location=device, weights_only=True)
        
        # Handle potential DataParallel wrapper
        if list(state_dict.keys())[0].startswith("module."):
            state_dict = {k.replace("module.", ""): v for k, v in state_dict.items()}
        
        model.load_state_dict(state_dict)
        model.to(device)
        model.eval()
        logger.info("Mask R-CNN model loaded successfully")
        return model
        
    except FileNotFoundError:
        logger.warning(f"Mask R-CNN model file not found at {model_path}. Using random weights.")
        model.to(device)
        model.eval()
        return model
    except Exception as e:
        logger.error(f"Error loading Mask R-CNN model: {e}")
        raise


# ============================================================================
# Image Preprocessing
# ============================================================================

def get_preprocessing_transform() -> A.Compose:
    """
    Create albumentations preprocessing pipeline.
    
    Returns:
        Albumentations Compose transform
    """
    return A.Compose([
        A.Resize(height=INFERENCE_SIZE[0], width=INFERENCE_SIZE[1]),
        A.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225],
            max_pixel_value=255.0
        ),
    ])


def preprocess_image(image: np.ndarray) -> Tuple[torch.Tensor, np.ndarray]:
    """
    Preprocess image for model inference.
    
    Args:
        image: Input BGR image from OpenCV
        
    Returns:
        Tuple of (preprocessed tensor, resized original image)
    """
    # Convert BGR to RGB
    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    
    # Apply albumentations transforms
    transform = get_preprocessing_transform()
    transformed = transform(image=image_rgb)
    image_transformed = transformed["image"]
    
    # Also get resized image without normalization for visualization
    resize_transform = A.Resize(height=INFERENCE_SIZE[0], width=INFERENCE_SIZE[1])
    resized = resize_transform(image=image_rgb)["image"]
    
    # Convert to tensor: HWC -> CHW
    image_tensor = torch.from_numpy(image_transformed).permute(2, 0, 1).float()
    
    return image_tensor, resized


def preprocess_for_rcnn(image: np.ndarray) -> torch.Tensor:
    """
    Preprocess image specifically for Mask R-CNN.
    Mask R-CNN expects images in [0, 1] range, not normalized.
    
    Args:
        image: Input BGR image from OpenCV
        
    Returns:
        Preprocessed tensor for Mask R-CNN
    """
    # Convert BGR to RGB
    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    
    # Resize
    image_resized = cv2.resize(image_rgb, INFERENCE_SIZE)
    
    # Convert to tensor and normalize to [0, 1]
    image_tensor = torch.from_numpy(image_resized).permute(2, 0, 1).float() / 255.0
    
    return image_tensor


# ============================================================================
# Inference Functions
# ============================================================================

def run_unet_inference(model: nn.Module, image_tensor: torch.Tensor) -> np.ndarray:
    """
    Run U-Net++ inference to get wall segmentation mask.
    
    Args:
        model: Loaded U-Net++ model
        image_tensor: Preprocessed image tensor
        
    Returns:
        Binary wall segmentation mask
    """
    with torch.no_grad():
        # Add batch dimension
        input_tensor = image_tensor.unsqueeze(0).to(DEVICE)
        
        # Forward pass
        output = model(input_tensor)
        
        # Apply sigmoid and threshold
        mask = torch.sigmoid(output).squeeze().cpu().numpy()
        binary_mask = (mask > 0.5).astype(np.uint8)
        
    return binary_mask


def run_rcnn_inference(
    model: nn.Module, 
    image_tensor: torch.Tensor
) -> List[Dict[str, Any]]:
    """
    Run Mask R-CNN inference to detect doors and windows.
    
    Args:
        model: Loaded Mask R-CNN model
        image_tensor: Preprocessed image tensor
        
    Returns:
        List of detection dictionaries with boxes, labels, scores, and masks
    """
    with torch.no_grad():
        # Add batch dimension and move to device
        input_tensor = image_tensor.unsqueeze(0).to(DEVICE)
        
        # Forward pass
        outputs = model(input_tensor)
        
    # Process detections
    detections = []
    if len(outputs) > 0:
        output = outputs[0]
        
        boxes = output["boxes"].cpu().numpy()
        labels = output["labels"].cpu().numpy()
        scores = output["scores"].cpu().numpy()
        masks = output["masks"].cpu().numpy()
        
        # Filter by confidence threshold
        for i, score in enumerate(scores):
            if score >= DETECTION_CONFIDENCE_THRESHOLD:
                detections.append({
                    "box": boxes[i],  # [x1, y1, x2, y2]
                    "label": int(labels[i]),
                    "score": float(score),
                    "mask": masks[i]
                })
    
    return detections


# ============================================================================
# Quantity Calculation Functions
# ============================================================================

def calculate_wall_length(binary_mask: np.ndarray, scale_ppm: float) -> float:
    """
    Calculate wall centerline length using skeletonization.
    
    Args:
        binary_mask: Binary segmentation mask of walls
        scale_ppm: Pixels per meter scale factor
        
    Returns:
        Wall length in meters
    """
    if binary_mask.sum() == 0:
        logger.warning("Empty wall mask detected")
        return 0.0
    
    # Skeletonize the mask to get centerline
    skeleton = skeletonize(binary_mask.astype(bool))
    
    # Count skeleton pixels (this gives approximate length in pixels)
    skeleton_pixels = np.sum(skeleton)
    
    # Convert to meters
    wall_length_m = skeleton_pixels / scale_ppm
    
    logger.info(f"Wall skeleton pixels: {skeleton_pixels}, Length: {wall_length_m:.2f}m")
    
    return wall_length_m


def calculate_detection_areas(
    detections: List[Dict[str, Any]], 
    scale_ppm: float
) -> Tuple[float, ItemCount]:
    """
    Calculate total area of detected doors and windows.
    
    Args:
        detections: List of detection dictionaries from Mask R-CNN
        scale_ppm: Pixels per meter scale factor
        
    Returns:
        Tuple of (total deduction area in m², item counts)
    """
    total_area_m2 = 0.0
    door_count = 0
    window_count = 0
    
    for det in detections:
        box = det["box"]  # [x1, y1, x2, y2]
        label = det["label"]
        
        # Calculate bounding box dimensions in pixels
        width_px = box[2] - box[0]
        height_px = box[3] - box[1]
        
        # Convert to meters
        width_m = width_px / scale_ppm
        height_m = height_px / scale_ppm
        
        # Calculate area
        area_m2 = width_m * height_m
        total_area_m2 += area_m2
        
        # Count by type
        if label == 1:  # Door
            door_count += 1
            logger.info(f"Door detected: {width_m:.2f}m x {height_m:.2f}m = {area_m2:.2f}m²")
        elif label == 2:  # Window
            window_count += 1
            logger.info(f"Window detected: {width_m:.2f}m x {height_m:.2f}m = {area_m2:.2f}m²")
    
    item_counts = ItemCount(doors=door_count, windows=window_count)
    
    return total_area_m2, item_counts


def compute_quantity_takeoff(
    wall_mask: np.ndarray,
    detections: List[Dict[str, Any]],
    scale_ppm: float,
    wall_height: float
) -> QuantityTakeoffResponse:
    """
    Compute full quantity takeoff calculations.
    
    Args:
        wall_mask: Binary wall segmentation mask
        detections: List of door/window detections
        scale_ppm: Pixels per meter scale factor
        wall_height: Wall height in meters
        
    Returns:
        QuantityTakeoffResponse with all calculated values
    """
    # Calculate wall centerline length
    wall_length_m = calculate_wall_length(wall_mask, scale_ppm)
    
    # Calculate gross wall surface area
    wall_gross_area_m2 = wall_length_m * wall_height
    
    # Calculate deductions (doors/windows)
    deductions_area_m2, item_counts = calculate_detection_areas(detections, scale_ppm)
    
    # Calculate net wall surface area
    wall_net_area_m2 = max(0.0, wall_gross_area_m2 - deductions_area_m2)
    
    logger.info(f"Quantity Takeoff Summary:")
    logger.info(f"  - Wall Length: {wall_length_m:.2f}m")
    logger.info(f"  - Wall Height: {wall_height:.2f}m")
    logger.info(f"  - Gross Area: {wall_gross_area_m2:.2f}m²")
    logger.info(f"  - Deductions: {deductions_area_m2:.2f}m²")
    logger.info(f"  - Net Area: {wall_net_area_m2:.2f}m²")
    logger.info(f"  - Doors: {item_counts.doors}, Windows: {item_counts.windows}")
    
    return QuantityTakeoffResponse(
        wall_total_length_m=round(wall_length_m, 3),
        wall_gross_surface_area_m2=round(wall_gross_area_m2, 3),
        deductions_area_m2=round(deductions_area_m2, 3),
        wall_net_surface_area_m2=round(wall_net_area_m2, 3),
        item_counts=item_counts
    )


# ============================================================================
# FastAPI Application
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager for loading/unloading models.
    """
    # Startup: Load models
    logger.info(f"Starting Quantity Takeoff Engine on {DEVICE}")
    logger.info("Loading ML models...")
    
    try:
        models["unet"] = load_unet_model(UNET_MODEL_PATH, DEVICE)
        models["rcnn"] = load_rcnn_model(RCNN_MODEL_PATH, DEVICE)
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


# Initialize FastAPI app
app = FastAPI(
    title="Quantity Takeoff Computation Engine",
    description="AI-powered quantity takeoff calculations for construction drawings",
    version="1.0.0",
    lifespan=lifespan,
    responses={
        500: {"model": ErrorResponse, "description": "Internal Server Error"}
    }
)


@app.get("/", tags=["Health"])
async def root():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "Quantity Takeoff Engine",
        "device": str(DEVICE),
        "models_loaded": list(models.keys())
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Detailed health check."""
    return {
        "status": "healthy",
        "cuda_available": torch.cuda.is_available(),
        "device": str(DEVICE),
        "unet_loaded": "unet" in models,
        "rcnn_loaded": "rcnn" in models
    }


@app.post(
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
    6. Returns net wall surface area
    
    Args:
        file: Image file upload (PNG, JPG, etc.)
        scale_ppm: Scale factor in pixels per meter
        wall_height: Wall height in meters (for surface area calculation)
        
    Returns:
        QuantityTakeoffResponse with calculated values
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
        
        # Compute quantity takeoff
        result = compute_quantity_takeoff(
            wall_mask=wall_mask,
            detections=detections,
            scale_ppm=scale_ppm,
            wall_height=wall_height
        )
        
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


# ============================================================================
# Entry Point
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
