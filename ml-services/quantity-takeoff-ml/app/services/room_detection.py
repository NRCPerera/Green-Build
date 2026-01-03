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
        
        # When inverted: working_mask has space=1 (high coverage), walls=0 (thin lines)
        # Extract the wall structure (the 0 pixels, which are ~2% of image)
        wall_structure = (1 - working_mask).astype(np.uint8)
        wall_mask_for_viz = wall_structure.copy()
        
        logger.info(f"Wall structure pixels after inversion: {np.sum(wall_structure)} ({100*np.sum(wall_structure)/total_pixels:.1f}%)")
        
        # CRITICAL: Dilate the wall structure to make walls thick enough to separate rooms
        # The walls in floor plans are often very thin (1-3 pixels), we need them thicker
        dilate_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (7, 7))
        thick_walls = cv2.dilate(wall_structure, dilate_kernel, iterations=3)
        
        logger.info(f"Thick wall pixels after dilation: {np.sum(thick_walls)} ({100*np.sum(thick_walls)/total_pixels:.1f}%)")
        
        # Close gaps in walls to ensure room boundaries are complete
        close_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
        thick_walls = cv2.morphologyEx(thick_walls, cv2.MORPH_CLOSE, close_kernel)
        
        # Block door gaps by adding wall pixels at door locations
        for box in door_boxes:
            x1, y1, x2, y2 = map(int, box)
            x1 = max(0, min(x1, width-1))
            x2 = max(0, min(x2, width-1))
            y1 = max(0, min(y1, height-1))
            y2 = max(0, min(y2, height-1))
            cv2.rectangle(thick_walls, (x1, y1), (x2, y2), 1, thickness=-1)
            logger.info(f"Blocking door gap at ({x1},{y1})-({x2},{y2})")
        
        # Now invert the thick walls to get room space (space=1, walls=0)
        inverted_for_rooms = (1 - thick_walls).astype(np.uint8)
        
        logger.info(f"Room space after processing: {np.sum(inverted_for_rooms)} pixels ({100*np.sum(inverted_for_rooms)/total_pixels:.1f}%)")
        
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
    
    # =======================================================================
    # EXTERIOR REGION REMOVAL using flood-fill from edges
    # =======================================================================
    # Any region connected to the image border is considered exterior
    # We use flood-fill from a border pixel to identify and mask out exterior
    
    # Create a padded version to ensure flood-fill can reach all edge-connected regions
    padded = np.pad(inverted_for_rooms, pad_width=1, mode='constant', constant_values=1)
    
    # Flood-fill from the corner (0,0) of the padded image
    # This will fill all exterior regions (connected to the border)
    exterior_mask = padded.copy()
    cv2.floodFill(exterior_mask, None, (0, 0), 0)
    
    # Remove padding and invert: exterior_mask now has exterior=0, interior=original
    exterior_mask = exterior_mask[1:-1, 1:-1]
    
    # The flood-fill turned exterior to 0. Combine with original:
    # Keep only pixels that were 1 in original AND weren't part of exterior
    # Actually, after flood-fill from padded corner, exterior connected regions become 0
    # So we just use the result directly
    interior_only = exterior_mask
    
    # Count what we filtered
    exterior_pixels = np.sum(inverted_for_rooms) - np.sum(interior_only)
    logger.info(f"Exterior region removed: {exterior_pixels} pixels ({100*exterior_pixels/(height*width):.1f}%)")
    logger.info(f"Interior space remaining: {np.sum(interior_only)} pixels ({100*np.sum(interior_only)/(height*width):.1f}%)")
    
    # Find connected components (distinct room blobs) on interior-only mask
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(
        interior_only, connectivity=4
    )
    
    logger.info(f"Found {num_labels - 1} potential room blobs (after exterior removal)")
    
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
            logger.info(f"  → Skipping: too small ({area_px} < {min_pixels} px)")
            continue
        
        # Skip if area is larger than 40% of the total image (safety check for missed exterior)
        if area_px > total_image_area_px * 0.4:
            logger.info(f"  → Skipping: too large, likely exterior ({area_px} > 40% of image)")
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
