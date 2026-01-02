"""
Quantity Takeoff Service
========================
Core business logic for quantity takeoff calculations.
"""

import logging
from typing import Any, Dict, List, Tuple

import numpy as np
from skimage.morphology import skeletonize

from ..models import ItemCount, QuantityTakeoffResponse
from .room_detection import detect_rooms

logger = logging.getLogger(__name__)


def validate_floor_plan_mask(binary_mask: np.ndarray) -> Tuple[bool, float]:
    """
    Validate if the detected mask looks like a valid floor plan.
    
    A valid floor plan typically has wall pixels covering 2-30% of the image.
    Note: The U-Net model may output inverted masks (space=1, walls=0) for some images.
    
    Args:
        binary_mask: Binary wall segmentation mask
        
    Returns:
        Tuple of (is_valid, coverage_percentage)
    """
    total_pixels = binary_mask.size
    wall_pixels = binary_mask.sum()
    coverage = (wall_pixels / total_pixels) * 100
    
    # Check if mask appears to be inverted (coverage > 50%)
    # In this case, use the inverted coverage for validation
    if coverage > 50:
        # Mask is likely inverted (space=1, walls=0)
        effective_coverage = 100 - coverage
        is_inverted = True
    else:
        effective_coverage = coverage
        is_inverted = False
    
    # Valid floor plans typically have walls covering 1-40% of the image
    is_valid = 0.5 <= effective_coverage <= 45.0
    
    if is_inverted:
        logger.info(f"Mask coverage: {coverage:.2f}% (inverted, effective wall coverage: {effective_coverage:.2f}%, valid: {is_valid})")
    else:
        logger.info(f"Mask coverage: {coverage:.2f}% (valid: {is_valid})")
    
    return is_valid, coverage


def calculate_wall_length(binary_mask: np.ndarray, scale_ppm: float) -> Tuple[float, bool]:
    """
    Calculate wall centerline length from binary mask.
    
    Args:
        binary_mask: Binary wall segmentation mask
        scale_ppm: Pixels per meter scale factor
        
    Returns:
        Tuple of (wall length in meters, is_valid_floor_plan)
    """
    if binary_mask.sum() == 0:
        logger.warning("Empty wall mask detected - image may not be a floor plan")
        return 0.0, False
    
    # Validate if this looks like a floor plan
    is_valid, coverage = validate_floor_plan_mask(binary_mask)
    
    if not is_valid:
        logger.warning(f"Image may not be a valid floor plan (coverage: {coverage:.1f}%)")
    
    # Skeletonize the mask to get centerline
    skeleton = skeletonize(binary_mask.astype(bool))
    
    # Count skeleton pixels (this gives approximate length in pixels)
    skeleton_pixels = np.sum(skeleton)
    
    # Convert to meters
    wall_length_m = skeleton_pixels / scale_ppm
    
    logger.info(f"Wall skeleton pixels: {skeleton_pixels}, Length: {wall_length_m:.2f}m")
    
    return wall_length_m, is_valid


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
        Tuple of (total deduction area in square meters, item counts)
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
            logger.info(f"Door detected: {width_m:.2f}m x {height_m:.2f}m = {area_m2:.2f} sq.m")
        elif label == 2:  # Window
            window_count += 1
            logger.info(f"Window detected: {width_m:.2f}m x {height_m:.2f}m = {area_m2:.2f} sq.m")
    
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
    # Calculate wall centerline length and validate if it looks like a floor plan
    wall_length_m, is_valid_floor_plan = calculate_wall_length(wall_mask, scale_ppm)
    
    # Generate warning if image doesn't look like a floor plan
    warning_message = None
    if not is_valid_floor_plan:
        warning_message = "The uploaded image may not be a valid floor plan. Results may be inaccurate."
    
    # Calculate gross wall surface area
    wall_gross_area_m2 = wall_length_m * wall_height
    
    # Calculate deductions (doors/windows)
    deductions_area_m2, item_counts = calculate_detection_areas(detections, scale_ppm)
    
    # Calculate net wall surface area
    wall_net_area_m2 = max(0.0, wall_gross_area_m2 - deductions_area_m2)
    
    # Extract door bounding boxes for room detection
    door_boxes = [
        det["box"] for det in detections 
        if det["label"] == 1  # Label 1 = Door
    ]
    
    # Extract window bounding boxes for visualization
    window_boxes = [
        det["box"] for det in detections 
        if det["label"] == 2  # Label 2 = Window
    ]
    
    # Detect rooms from wall mask
    room_detection = detect_rooms(
        wall_mask=wall_mask,
        door_boxes=door_boxes,
        window_boxes=window_boxes,
        scale_ppm=scale_ppm
    )
    
    logger.info(f"Quantity Takeoff Summary:")
    logger.info(f"  - Wall Length: {wall_length_m:.2f}m")
    logger.info(f"  - Wall Height: {wall_height:.2f}m")
    logger.info(f"  - Gross Area: {wall_gross_area_m2:.2f} sq.m")
    logger.info(f"  - Deductions: {deductions_area_m2:.2f} sq.m")
    logger.info(f"  - Net Area: {wall_net_area_m2:.2f} sq.m")
    logger.info(f"  - Doors: {item_counts.doors}, Windows: {item_counts.windows}")
    logger.info(f"  - Rooms Detected: {len(room_detection.rooms)}")
    logger.info(f"  - Total Floor Area: {room_detection.total_floor_area_m2:.2f} sq.m")
    if warning_message:
        logger.warning(f"  - Warning: {warning_message}")
    
    return QuantityTakeoffResponse(
        wall_total_length_m=round(wall_length_m, 3),
        wall_gross_surface_area_m2=round(wall_gross_area_m2, 3),
        deductions_area_m2=round(deductions_area_m2, 3),
        wall_net_surface_area_m2=round(wall_net_area_m2, 3),
        item_counts=item_counts,
        room_detection=room_detection,
        warning=warning_message
    )
