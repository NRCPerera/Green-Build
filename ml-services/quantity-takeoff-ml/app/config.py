import torch
from pathlib import Path

# Base paths
BASE_DIR = Path(__file__).parent.parent
MODELS_DIR = BASE_DIR / "models"

# Model paths
UNET_MODEL_PATH = MODELS_DIR / "best_unet_cubicasa.pth"
RCNN_MODEL_PATH = MODELS_DIR / "final_maskrcnn_optimized.pth"
ROOM_MODEL_PATH = MODELS_DIR / "room_segmentation.pth"

# Room segmentation model settings
ROOM_MODEL_IMAGE_SIZE = 512  # Size the room model was trained on

# Inference settings
INFERENCE_SIZE = (800, 800)
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Class labels for Mask R-CNN (0 = background)
RCNN_CLASSES = {
    1: "door",
    2: "window"
}
NUM_RCNN_CLASSES = len(RCNN_CLASSES) + 1  # +1 for background

# Detection thresholds
DETECTION_CONFIDENCE_THRESHOLD = 0.5

# Cost rates (in LKR - Sri Lankan Rupees)
FLOORING_COST_RATE = 20000.0  # LKR per square meter

# Room detection settings
MIN_ROOM_AREA_M2 = 4.0  # Minimum room area (filters noise, typical bathroom is ~4-5 sq.m)
MIN_ROOM_AREA_PIXELS = 2000  # Minimum pixels for a room (filters small artifacts)
WALL_COVERAGE_INVERT_THRESHOLD = 0.50  # If wall coverage > 50%, mask is likely inverted

