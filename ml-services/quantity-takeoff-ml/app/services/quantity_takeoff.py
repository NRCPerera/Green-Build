import logging
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np
from skimage.morphology import skeletonize

from ..models import ItemCount, QuantityTakeoffResponse
from .room_detection import detect_rooms, detect_rooms_from_ml_mask

logger = logging.getLogger(__name__)


def validate_floor_plan_mask(binary_mask: np.ndarray) -> Tuple[bool, float]:
   
    total_pixels = binary_mask.size
    wall_pixels = binary_mask.sum()
    coverage = (wall_pixels / total_pixels) * 100
    
    if coverage > 50:
        effective_coverage = 100 - coverage
        is_inverted = True
    else:
        effective_coverage = coverage
        is_inverted = False
    
    is_valid = 0.5 <= effective_coverage <= 45.0
    
    if is_inverted:
        logger.info(f"Mask coverage: {coverage:.2f}% (inverted, effective wall coverage: {effective_coverage:.2f}%, valid: {is_valid})")
    else:
        logger.info(f"Mask coverage: {coverage:.2f}% (valid: {is_valid})")
    
    return is_valid, coverage


def calculate_wall_length(binary_mask: np.ndarray, scale_ppm: float, room_mask: np.ndarray = None) -> Tuple[float, bool]:
    """
    Calculate total wall centerline length from binary mask.
    
    If wall detection is poor but room mask is available, derive walls from room boundaries.
    """
    wall_pixels = binary_mask.sum()
    total_pixels = binary_mask.size
    coverage = (wall_pixels / total_pixels) * 100
    
    # Check if we need to invert (more than 50% coverage means walls are inverted)
    working_mask = binary_mask.copy()
    if coverage > 50:
        working_mask = 1 - working_mask
        logger.info(f"Wall mask inverted (original coverage: {coverage:.2f}%)")
        coverage = 100 - coverage
    
    # Validate coverage
    is_valid = 0.5 <= coverage <= 45.0
    logger.info(f"Mask coverage: {coverage:.2f}% (valid: {is_valid})")
    
    # If wall detection is poor and room mask is available, derive walls from room boundaries
    if coverage < 0.5 and room_mask is not None:
        logger.info("Wall detection poor, deriving walls from room boundaries...")
        # Invert room mask to get wall areas
        inverted_room = 1 - room_mask.astype(np.uint8)
        # Apply morphological operations to clean up
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        working_mask = cv2.morphologyEx(inverted_room, cv2.MORPH_CLOSE, kernel, iterations=2)
        working_mask = cv2.morphologyEx(working_mask, cv2.MORPH_OPEN, kernel, iterations=1)
        new_coverage = (working_mask.sum() / total_pixels) * 100
        logger.info(f"Derived wall mask coverage: {new_coverage:.2f}%")
        is_valid = True  # Derived from room detection which worked
    
    if working_mask.sum() == 0:
        logger.warning("Empty wall mask detected - image may not be a floor plan")
        return 0.0, False
    
    if not is_valid and room_mask is None:
        logger.warning(f"Image may not be a valid floor plan (coverage: {coverage:.1f}%)")
    
    # Apply morphological operations to clean the mask before skeletonization
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    cleaned_mask = cv2.morphologyEx(working_mask.astype(np.uint8), cv2.MORPH_CLOSE, kernel, iterations=2)
    
    # Skeletonize the mask to get centerline
    skeleton = skeletonize(cleaned_mask.astype(bool))
    
    # Count skeleton pixels
    skeleton_pixels = np.sum(skeleton)
    
    # Multiply by sqrt(2)/2 factor to account for diagonal pixels
    # (average path factor for skeletons)
    adjusted_pixels = skeleton_pixels * 1.1  # Slight adjustment for connectivity
    
    # Convert to meters
    wall_length_m = adjusted_pixels / scale_ppm
    
    logger.info(f"Wall skeleton pixels: {skeleton_pixels}, Adjusted: {adjusted_pixels:.0f}, Length: {wall_length_m:.2f}m")
    
    return wall_length_m, is_valid


def calculate_detection_areas(
    detections: List[Dict[str, Any]], 
    scale_ppm: float
) -> Tuple[float, ItemCount]:

    total_area_m2 = 0.0
    door_count = 0
    window_count = 0
    
    for det in detections:
        box = det["box"]  
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
    wall_height: float,
    room_mask: Optional[np.ndarray] = None
) -> QuantityTakeoffResponse:
   
    # Calculate wall centerline length and validate if it looks like a floor plan
    # Pass room_mask so walls can be derived from room boundaries if direct detection fails
    wall_length_m, is_valid_floor_plan = calculate_wall_length(wall_mask, scale_ppm, room_mask)
    
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
    
    # Use ML-based room detection if room_mask is provided, otherwise use algorithmic approach
    if room_mask is not None:
        logger.info("Using ML-based room detection")
        room_detection = detect_rooms_from_ml_mask(
            room_mask=room_mask,
            door_boxes=door_boxes,
            window_boxes=window_boxes,
            scale_ppm=scale_ppm
        )
    else:
        logger.info("Using algorithmic room detection (fallback)")
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
