import argparse
import json
import logging
import os
import sys
from pathlib import Path
from typing import List, Dict, Any

import cv2
import numpy as np
import shapely.geometry
from shapely.geometry import Polygon, MultiPolygon
from shapely.validation import make_valid
import torch

# Add parent directory to path to allow importing app modules
current_dir = Path(__file__).resolve().parent
project_root = current_dir.parent
sys.path.append(str(project_root))

from app.services.model_loader import load_unet_model, load_rcnn_model
from app.services.inference import run_unet_inference, run_rcnn_inference
from app.config import (
    UNET_MODEL_PATH, 
    RCNN_MODEL_PATH, 
    DEVICE,
    RCNN_CLASSES
)

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

SCALE_METERS_PER_PIXEL = 0.05

def setup_args():
    parser = argparse.ArgumentParser(description="Process 2D floor plan to geometric JSON")
    parser.add_argument("--image", required=True, help="Path to input image")
    parser.add_argument("--output", default="floorplan.json", help="Path to output JSON")
    return parser.parse_args()

def mask_to_polygons(mask: np.ndarray, tolerance: float = 1.0) -> List[Polygon]:
    """Convert binary mask to simplified shapely Polygons."""
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    polygons = []
    for cnt in contours:
        if cv2.contourArea(cnt) < 50:  # Filter small noise
            continue
        # cnt is (N, 1, 2) -> (N, 2)
        points = cnt.squeeze().tolist()
        if len(points) < 3:
            continue
        poly = Polygon(points)
        poly = poly.simplify(tolerance, preserve_topology=True)
        if not poly.is_valid:
            poly = make_valid(poly)
        
        if poly.is_empty:
            continue
            
        if isinstance(poly, MultiPolygon):
            polygons.extend(poly.geoms)
        else:
            polygons.append(poly)
    return polygons

def process_image(image_path: str, output_path: str):
    logger.info(f"Processing {image_path}...")
    
    # Load Image
    if not os.path.exists(image_path):
        logger.error(f"Image not found: {image_path}")
        sys.exit(1)
        
    image = cv2.imread(image_path)
    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    
    # Load Models
    logger.info("Loading models...")
    unet = load_unet_model(UNET_MODEL_PATH, DEVICE)
    rcnn = load_rcnn_model(RCNN_MODEL_PATH, DEVICE)
    
    # Prepare Inputs
    # Normalization for models - assuming models expect 0-1 float or normalized
    # run_unet_inference expects tensor. check inference.py
    # inference.py: image_tensor.unsqueeze(0).to(DEVICE)
    # usually needs ToTensor() which divides by 255.
    
    import albumentations as A
    from albumentations.pytorch import ToTensorV2
    
    # U-Net preprocessing (Resize 800x800 done in inference logic? NO, inference.py for unet doesn't resize)
    # Actually unet was trained on 512x512 or similar? config says INFERENCE_SIZE = (800, 800)
    # Let's resize image to standard size or keep original?
    # R-CNN handles different sizes usually. U-Net needs fixed size often or divisible by 32.
    
    h, w = image.shape[:2]
    
    # Transform for Inference
    transform = A.Compose([
        A.Normalize(),
        ToTensorV2()
    ])
    
    transformed = transform(image=image_rgb)["image"]
    
    # --- Walls (U-Net) ---
    logger.info("Running Wall Segmentation (U-Net)...")
    # For U-Net, we might need resizing if the model expects it.
    # But let's try running on original size (if memory allows) or resize.
    # To be safe and consistent with typical pipelines:
    # Resize to nearest multiple of 32
    new_h = (h // 32) * 32
    new_w = (w // 32) * 32
    if new_h != h or new_w != w:
         image_resized = cv2.resize(image_rgb, (new_w, new_h))
         transformed_unet = transform(image=image_resized)["image"]
    else:
         transformed_unet = transformed
         
    wall_mask = run_unet_inference(unet, transformed_unet)
    # Resize mask back to original if needed
    if wall_mask.shape != (h, w):
        wall_mask = cv2.resize(wall_mask, (w, h), interpolation=cv2.INTER_NEAREST)
        
    # --- Windows/Doors (R-CNN) ---
    logger.info("Running Window/Door Detection (Mask R-CNN)...")
    # R-CNN handles resizing internally usually (GeneralizedRCNNTransform)
    detections = run_rcnn_inference(rcnn, transformed)
    
    # Process Detections
    window_polys = []
    door_polys = []
    
    for det in detections:
        # det: box, label, score, mask
        label = det["label"]
        mask = det["mask"]
        score = det["score"]
        
        # Threshold mask
        bin_mask = (mask > 0.5).astype(np.uint8)
        
        # Convert to Polygon
        # Note: mask from RCNN is usually 28x28 (soft mask) or full size? 
        # inference.py says: masks = output["masks"].cpu().numpy().
        # In torchvision, masks are usually N, 1, H, W.
        # Check inference.py:
        # for i, score in enumerate(scores):
        #    ... "mask": masks[i]
        # masks[i] is likely (1, H, W) or (H, W).
        
        if len(bin_mask.shape) == 3:
            bin_mask = bin_mask[0]
            
        polys = mask_to_polygons(bin_mask)
        
        if label == 1: # Door (based on config RCNN_CLASSES = {1: "door", 2: "window"}) -> Wait, config says 1: door.
            # config.py: RCNN_CLASSES = {1: "door", 2: "window"}
            door_polys.extend(polys)
        elif label == 2: # Window
            window_polys.extend(polys)

    # Process Walls
    logger.info("Processing Geometry...")
    raw_wall_polys = mask_to_polygons(wall_mask, tolerance=2.0)
    
    # Merge MultiPolygons/Lists into a single list of localized polygons
    all_walls = []
    for p in raw_wall_polys:
        # Cut holes
        cut_wall = p
        
        # Difference with Windows
        for wp in window_polys:
            if cut_wall.intersects(wp):
                cut_wall = cut_wall.difference(wp)
        
        # Difference with Doors
        for dp in door_polys:
            if cut_wall.intersects(dp):
                cut_wall = cut_wall.difference(dp)
                
        if not cut_wall.is_empty:
             if isinstance(cut_wall, MultiPolygon):
                 all_walls.extend(cut_wall.geoms)
             else:
                 all_walls.append(cut_wall)
                 
    # Format for JSON
    def format_poly(poly):
        if poly.is_empty: return None
        # Exterior
        try:
            outline = list(poly.exterior.coords)
        except AttributeError:
            return None # Not a polygon
            
        # Holes
        holes = []
        for interior in poly.interiors:
            holes.append(list(interior.coords))
            
        # Scale to meters
        outline_m = [[x * SCALE_METERS_PER_PIXEL, y * SCALE_METERS_PER_PIXEL] for x, y in outline]
        holes_m = [[[x * SCALE_METERS_PER_PIXEL, y * SCALE_METERS_PER_PIXEL] for x, y in h] for h in holes]
        
        return {
            "outline": outline_m,
            "holes": holes_m
        }

    output_data = {
        "walls": [format_poly(p) for p in all_walls if format_poly(p)],
        "windows": [format_poly(p) for p in window_polys if format_poly(p)],
        "doors": [format_poly(p) for p in door_polys if format_poly(p)],
        "metadata": {
            "scale": SCALE_METERS_PER_PIXEL,
            "units": "meters",
            "wall_height": 2.5
        }
    }
    
    with open(output_path, 'w') as f:
        json.dump(output_data, f, indent=2)
        
    logger.info(f"Saved floorplan to {output_path}")

if __name__ == "__main__":
    args = setup_args()
    process_image(args.image, args.output)
