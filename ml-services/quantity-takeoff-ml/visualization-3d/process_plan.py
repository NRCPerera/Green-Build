import argparse
import json
import logging
import os
import sys
import math
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
    """Convert binary mask to simplified shapely Polygons (Used for doors/windows)."""
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    polygons = []
    for cnt in contours:
        if cv2.contourArea(cnt) < 50:  # Filter small noise
            continue
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

def extract_wall_polygons_hough(mask: np.ndarray, pixel_thickness: float = 10.0) -> List[Polygon]:
    """
    Convert continuous binary wall mask into distinct, thickened 
    Shapely Polygons using the Hough Line Transform.
    """
    if isinstance(mask, torch.Tensor):
        mask = mask.cpu().numpy()
    if len(mask.shape) > 2:
        mask = mask.squeeze()
    
    if mask.dtype != np.uint8 or mask.max() <= 1.0:
        mask = (mask > 0.5).astype(np.uint8) * 255
        
    _, binary_mask = cv2.threshold(mask, 127, 255, cv2.THRESH_BINARY)
    edges = cv2.Canny(binary_mask, 50, 150, apertureSize=3)

    # LOOSENED PARAMETERS: Much more forgiving line detection
    lines = cv2.HoughLinesP(
        edges, 
        rho=1, 
        theta=np.pi/180, 
        threshold=15,      # Lowered from 30
        minLineLength=10,  # Lowered from 25
        maxLineGap=20      # Increased from 15
    )

    # --- DEBUG VISUALIZATION ---
    # Creates an image to visually verify if walls are being detected
    debug_img = cv2.cvtColor(binary_mask, cv2.COLOR_GRAY2BGR)

    polygons = []
    if lines is not None:
        for line in lines:
            x1, y1, x2, y2 = line[0]
            
            # Draw the detected line in RED for the debug image
            cv2.line(debug_img, (x1, y1), (x2, y2), (0, 0, 255), 2)
            
            # Create 4-point thick polygon
            angle = math.atan2(y2 - y1, x2 - x1)
            dx = (pixel_thickness / 2.0) * math.sin(angle)
            dy = (pixel_thickness / 2.0) * math.cos(angle)
            
            p1 = (x1 - dx, y1 + dy)
            p2 = (x1 + dx, y1 - dy)
            p3 = (x2 + dx, y2 - dy)
            p4 = (x2 - dx, y2 + dy)
            
            poly = Polygon([p1, p2, p3, p4])
            
            if poly.is_valid and not poly.is_empty:
                polygons.append(poly)
                
    # Save the debug image so you can see the results
    cv2.imwrite("debug_hough_lines.png", debug_img)
    logger.info("Saved wall detection debug image to debug_hough_lines.png")

    return polygons

def process_image(image_path: str, output_path: str):
    logger.info(f"Processing {image_path}...")
    
    if not os.path.exists(image_path):
        logger.error(f"Image not found: {image_path}")
        sys.exit(1)
        
    image = cv2.imread(image_path)
    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    
    logger.info("Loading models...")
    unet = load_unet_model(UNET_MODEL_PATH, DEVICE)
    rcnn = load_rcnn_model(RCNN_MODEL_PATH, DEVICE)
    
    import albumentations as A
    from albumentations.pytorch import ToTensorV2
    
    h, w = image.shape[:2]
    
    transform = A.Compose([
        A.Normalize(),
        ToTensorV2()
    ])
    
    transformed = transform(image=image_rgb)["image"]
    
    # --- Walls (U-Net) ---
    logger.info("Running Wall Segmentation (U-Net)...")
    new_h = (h // 32) * 32
    new_w = (w // 32) * 32
    if new_h != h or new_w != w:
         image_resized = cv2.resize(image_rgb, (new_w, new_h))
         transformed_unet = transform(image=image_resized)["image"]
    else:
         transformed_unet = transformed
         
    wall_mask = run_unet_inference(unet, transformed_unet)
    if wall_mask.shape != (h, w):
        wall_mask = cv2.resize(wall_mask, (w, h), interpolation=cv2.INTER_NEAREST)
        
    # --- Windows/Doors (R-CNN) ---
    logger.info("Running Window/Door Detection (Mask R-CNN)...")
    detections = run_rcnn_inference(rcnn, transformed)
    
    window_polys = []
    door_polys = []
    
    for det in detections:
        label = det["label"]
        mask = det["mask"]
        
        bin_mask = (mask > 0.5).astype(np.uint8)
        
        if len(bin_mask.shape) == 3:
            bin_mask = bin_mask[0]
            
        polys = mask_to_polygons(bin_mask)
        
        if label == 1: 
            door_polys.extend(polys)
        elif label == 2: 
            window_polys.extend(polys)

    # --- Process Walls ---
    logger.info("Processing Geometry...")
    raw_wall_polys = extract_wall_polygons_hough(wall_mask, pixel_thickness=6.0)
    
    all_walls = []
    for p in raw_wall_polys:
        cut_wall = p
        
        for wp in window_polys:
            if cut_wall.intersects(wp):
                cut_wall = cut_wall.difference(wp)
        
        for dp in door_polys:
            if cut_wall.intersects(dp):
                cut_wall = cut_wall.difference(dp)
                
        if not cut_wall.is_empty:
             if isinstance(cut_wall, MultiPolygon):
                 all_walls.extend(cut_wall.geoms)
             else:
                 all_walls.append(cut_wall)
                 
    def format_poly(poly):
        if poly.is_empty: return None
        try:
            outline = list(poly.exterior.coords)
        except AttributeError:
            return None 
            
        holes = []
        for interior in poly.interiors:
            holes.append(list(interior.coords))
            
        outline_m = [[round(x * SCALE_METERS_PER_PIXEL, 3), round(y * SCALE_METERS_PER_PIXEL, 3)] for x, y in outline]
        holes_m = [[[round(x * SCALE_METERS_PER_PIXEL, 3), round(y * SCALE_METERS_PER_PIXEL, 3)] for x, y in h] for h in holes]
        
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