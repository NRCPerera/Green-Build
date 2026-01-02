"""
Room Detection Service
======================
Algorithmic room detection from wall masks.
"""

import base64
import logging
from typing import List

import cv2
import numpy as np

from ..config import FLOORING_COST_RATE, MIN_ROOM_AREA_M2, MIN_ROOM_AREA_PIXELS, WALL_COVERAGE_INVERT_THRESHOLD
from ..models import Room, RoomDetectionResult

logger = logging.getLogger(__name__)


def detect_rooms(
    wall_mask: np.ndarray,
    door_boxes: List[np.ndarray],
    window_boxes: List[np.ndarray],
    scale_ppm: float,
    min_room_area_m2: float = MIN_ROOM_AREA_M2
) -> RoomDetectionResult:
    """
    Detect rooms from wall mask by finding enclosed spaces.
    
    Algorithm:
    1. Close gaps in the wall mask where doors are detected
    2. Invert the mask (Walls=0, Space=1)
    3. Use connected components to find distinct room blobs
    4. Calculate area for each blob
    5. Generate a colored visualization with rooms, doors, and windows
    
    Args:
        wall_mask: Binary wall segmentation mask (Walls=1, Space=0)
        door_boxes: List of door bounding boxes [x1, y1, x2, y2]
        window_boxes: List of window bounding boxes [x1, y1, x2, y2]
        scale_ppm: Pixels per meter scale factor (for INFERENCE_SIZE image)
        min_room_area_m2: Minimum room area to consider (filters noise)
        
    Returns:
        RoomDetectionResult with rooms list and visualization
    """
    logger.info("Starting room detection...")
    logger.info(f"Wall mask shape: {wall_mask.shape}, Scale PPM: {scale_ppm}")
    logger.info(f"Number of door boxes: {len(door_boxes)}, window boxes: {len(window_boxes)}")
    
    height, width = wall_mask.shape
    total_pixels = height * width
    
    # Create a copy of the wall mask to modify
    working_mask = wall_mask.copy().astype(np.uint8)
    
    # Log wall mask statistics
    wall_pixels = np.sum(working_mask)
    wall_coverage = wall_pixels / total_pixels
    logger.info(f"Wall pixels in mask: {wall_pixels} ({100*wall_coverage:.1f}%)")
    
    # AUTO-DETECT INVERTED MASK:
    # If "wall" coverage is > 50%, the mask is likely inverted (space=1, walls=0)
    if wall_coverage > WALL_COVERAGE_INVERT_THRESHOLD:
        logger.warning(f"Mask appears inverted (coverage {wall_coverage*100:.1f}% > 50%). Auto-inverting for room detection.")
        inverted_for_rooms = working_mask  # Already space=1
        wall_mask_for_viz = 1 - wall_mask  # Invert for visualization (walls=1)
        
        # For door closing, block the door areas (set to 0 to separate rooms)
        for box in door_boxes:
            x1, y1, x2, y2 = map(int, box)
            x1 = max(0, min(x1, width-1))
            x2 = max(0, min(x2, width-1))
            y1 = max(0, min(y1, height-1))
            y2 = max(0, min(y2, height-1))
            cv2.rectangle(inverted_for_rooms, (x1, y1), (x2, y2), 0, thickness=-1)
            logger.info(f"Blocking door gap at ({x1},{y1})-({x2},{y2})")
        
        # Apply erosion to separate touching rooms
        erode_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        inverted_for_rooms = cv2.erode(inverted_for_rooms, erode_kernel, iterations=1)
        
    else:
        logger.info("Mask appears normal (walls=1, space=0). Proceeding with standard processing.")
        wall_mask_for_viz = working_mask
        
        # Standard processing: dilate walls to ensure connectivity
        dilate_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        working_mask = cv2.dilate(working_mask, dilate_kernel, iterations=2)
        
        # Close door gaps by drawing filled rectangles
        for box in door_boxes:
            x1, y1, x2, y2 = map(int, box)
            x1 = max(0, min(x1, width-1))
            x2 = max(0, min(x2, width-1))
            y1 = max(0, min(y1, height-1))
            y2 = max(0, min(y2, height-1))
            cv2.rectangle(working_mask, (x1, y1), (x2, y2), 1, thickness=-1)
            logger.info(f"Closing door gap at ({x1},{y1})-({x2},{y2})")
        
        # Apply morphological closing to ensure wall continuity
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (7, 7))
        working_mask = cv2.morphologyEx(working_mask, cv2.MORPH_CLOSE, kernel)
        
        # Invert to get space
        inverted_for_rooms = (1 - working_mask).astype(np.uint8)
    
    # Add border to exclude exterior regions
    inverted_for_rooms[0, :] = 0
    inverted_for_rooms[-1, :] = 0
    inverted_for_rooms[:, 0] = 0
    inverted_for_rooms[:, -1] = 0
    
    # Find connected components (distinct room blobs)
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(
        inverted_for_rooms, connectivity=4
    )
    
    logger.info(f"Found {num_labels - 1} potential room blobs")
    
    # Process each component and calculate areas
    rooms = []
    pixels_per_sqm = scale_ppm ** 2
    
    # Create a color map for visualization
    room_map = np.zeros((height, width, 3), dtype=np.uint8)
    room_map[:, :] = (20, 20, 30)  # Dark background
    
    # Define distinct colors for rooms (RGB format)
    room_colors = [
        (52, 199, 89),    # Green
        (0, 122, 255),    # Blue
        (255, 149, 0),    # Orange
        (175, 82, 222),   # Purple
        (255, 45, 85),    # Pink
        (90, 200, 250),   # Teal
        (255, 204, 0),    # Yellow
        (88, 86, 214),    # Indigo
        (255, 59, 48),    # Red
        (162, 132, 94),   # Brown
    ]
    
    room_id_counter = 1
    total_image_area_px = height * width
    
    for i in range(1, num_labels):
        area_px = stats[i, cv2.CC_STAT_AREA]
        area_m2 = area_px / pixels_per_sqm
        x = stats[i, cv2.CC_STAT_LEFT]
        y = stats[i, cv2.CC_STAT_TOP]
        w = stats[i, cv2.CC_STAT_WIDTH]
        h = stats[i, cv2.CC_STAT_HEIGHT]
        
        logger.info(f"Blob {i}: area_px={area_px}, area_m2={area_m2:.2f}, bbox=({x},{y},{w},{h})")
        
        # Filter out very small blobs (noise)
        # Use both pixel-based and area-based thresholds
        min_pixels = max(MIN_ROOM_AREA_PIXELS, int(min_room_area_m2 * pixels_per_sqm))
        if area_px < min_pixels:
            logger.debug(f"Skipping blob {i}: area too small ({area_px} < {min_pixels} px)")
            continue
        
        # Skip if area is larger than 60% of the total image (likely exterior)
        if area_px > total_image_area_px * 0.6:
            logger.debug(f"Skipping blob {i}: likely exterior")
            continue
        
        # Skip if the blob touches all four edges (exterior)
        touches_left = x == 0
        touches_top = y == 0
        touches_right = (x + w) >= width
        touches_bottom = (y + h) >= height
        if touches_left and touches_top and touches_right and touches_bottom:
            logger.debug(f"Skipping blob {i}: touches all edges")
            continue
        
        # Calculate flooring cost estimate
        flooring_cost = area_m2 * FLOORING_COST_RATE
        
        rooms.append(Room(
            room_id=room_id_counter,
            area_m2=round(area_m2, 2),
            flooring_cost_estimate=round(flooring_cost, 2)
        ))
        
        # Color this room in the visualization
        color_idx = (room_id_counter - 1) % len(room_colors)
        room_map[labels == i] = room_colors[color_idx]
        
        logger.info(f"✓ Room {room_id_counter}: {area_m2:.2f} sq.m, Flooring cost: ${flooring_cost:.2f}")
        room_id_counter += 1
    
    # Add wall outlines to the visualization
    wall_color = (255, 255, 255)
    room_map[wall_mask_for_viz == 1] = wall_color
    
    # Draw door boxes in cyan
    door_color = (0, 217, 255)  # Cyan
    for box in door_boxes:
        x1, y1, x2, y2 = map(int, box)
        x1 = max(0, min(x1, width-1))
        x2 = max(0, min(x2, width-1))
        y1 = max(0, min(y1, height-1))
        y2 = max(0, min(y2, height-1))
        cv2.rectangle(room_map, (x1, y1), (x2, y2), door_color, 2)
        # Add "D" label
        cv2.putText(room_map, "D", (x1 + 2, y2 - 2), cv2.FONT_HERSHEY_SIMPLEX, 0.4, door_color, 1)
    
    # Draw window boxes in yellow
    window_color = (255, 204, 0)  # Yellow/Gold
    for box in window_boxes:
        x1, y1, x2, y2 = map(int, box)
        x1 = max(0, min(x1, width-1))
        x2 = max(0, min(x2, width-1))
        y1 = max(0, min(y1, height-1))
        y2 = max(0, min(y2, height-1))
        cv2.rectangle(room_map, (x1, y1), (x2, y2), window_color, 2)
        # Add "W" label
        cv2.putText(room_map, "W", (x1 + 2, y2 - 2), cv2.FONT_HERSHEY_SIMPLEX, 0.4, window_color, 1)
    
    # Add legend to the visualization
    legend_y = 15
    legend_x = 10
    font = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = 0.4
    font_thickness = 1
    
    # Background for legend
    cv2.rectangle(room_map, (5, 5), (130, 75), (40, 40, 50), -1)
    cv2.rectangle(room_map, (5, 5), (130, 75), (100, 100, 100), 1)
    
    # Legend items
    cv2.rectangle(room_map, (legend_x, legend_y), (legend_x + 10, legend_y + 10), wall_color, -1)
    cv2.putText(room_map, "Walls", (legend_x + 15, legend_y + 9), font, font_scale, (200, 200, 200), font_thickness)
    
    cv2.rectangle(room_map, (legend_x, legend_y + 15), (legend_x + 10, legend_y + 25), door_color, -1)
    cv2.putText(room_map, "Doors", (legend_x + 15, legend_y + 24), font, font_scale, (200, 200, 200), font_thickness)
    
    cv2.rectangle(room_map, (legend_x, legend_y + 30), (legend_x + 10, legend_y + 40), window_color, -1)
    cv2.putText(room_map, "Windows", (legend_x + 15, legend_y + 39), font, font_scale, (200, 200, 200), font_thickness)
    
    cv2.rectangle(room_map, (legend_x, legend_y + 45), (legend_x + 10, legend_y + 55), room_colors[0], -1)
    cv2.putText(room_map, "Rooms", (legend_x + 15, legend_y + 54), font, font_scale, (200, 200, 200), font_thickness)
    
    # Encode the visualization as base64
    success, buffer = cv2.imencode('.png', cv2.cvtColor(room_map, cv2.COLOR_RGB2BGR))
    if success:
        room_map_base64 = base64.b64encode(buffer).decode('utf-8')
    else:
        room_map_base64 = None
        logger.warning("Failed to encode room map image")
    
    # Calculate total floor area
    total_floor_area = sum(room.area_m2 for room in rooms)
    
    logger.info(f"=== Room detection complete: {len(rooms)} rooms, total area: {total_floor_area:.2f} sq.m ===")
    
    return RoomDetectionResult(
        rooms=rooms,
        total_floor_area_m2=round(total_floor_area, 2),
        room_map_base64=room_map_base64
    )
