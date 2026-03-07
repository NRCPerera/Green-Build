"""
API Endpoints
=============
FastAPI route handlers for the Quantity Takeoff API.
"""

import logging
import math
import torch

import cv2
import numpy as np
from fastapi import APIRouter, File, Form, HTTPException, UploadFile

import shapely.geometry
from shapely.geometry import Polygon, MultiPolygon
from shapely.validation import make_valid
from shapely.ops import unary_union
from scipy import ndimage

from ..config import INFERENCE_SIZE, ROOM_MODEL_IMAGE_SIZE
from ..models import QuantityTakeoffResponse, ErrorResponse
from ..services import (
    preprocess_image,
    preprocess_for_rcnn,
    run_unet_inference,
    run_rcnn_inference,
    run_room_inference,
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
    """Calculate quantity takeoff from a construction drawing."""
    logger.info(f"Processing image: {file.filename}")
    
    allowed_types = ["image/jpeg", "image/png", "image/jpg", "image/tiff", "image/bmp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type: {file.content_type}. Allowed: {allowed_types}"
        )
    
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            raise HTTPException(status_code=400, detail="Failed to decode image.")
        
        original_height, original_width = image.shape[:2]
        inference_height, inference_width = INFERENCE_SIZE
        scale_x = inference_width / original_width
        scale_y = inference_height / original_height
        avg_scale_factor = (scale_x + scale_y) / 2
        adjusted_scale_ppm = scale_ppm * avg_scale_factor
        
        unet_tensor, resized_image = preprocess_image(image)
        rcnn_tensor = preprocess_for_rcnn(image)
        
        wall_mask = run_unet_inference(models["unet"], unet_tensor)
        detections = run_rcnn_inference(models["rcnn"], rcnn_tensor)
        
        room_mask = None
        if models.get("room") is not None:
            resized_for_room = cv2.resize(image, INFERENCE_SIZE)
            room_mask = run_room_inference(
                models["room"], 
                resized_for_room,
                target_size=ROOM_MODEL_IMAGE_SIZE
            )
            
        from ..services import create_detection_overlay
        resized_for_overlay = cv2.resize(image, INFERENCE_SIZE)
        detection_overlay = create_detection_overlay(resized_for_overlay, detections)
        
        result = compute_quantity_takeoff(
            wall_mask=wall_mask,
            detections=detections,
            scale_ppm=adjusted_scale_ppm,
            wall_height=wall_height,
            room_mask=room_mask
        )
        
        result.detection_overlay_base64 = detection_overlay
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing image: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")


@router.post(
    "/generate-3d-geometry",
    tags=["Visualization"],
    summary="Generate 3D Floor Plan Geometry"
)
async def generate_3d_geometry(
    file: UploadFile = File(..., description="Construction drawing image file"),
    scale_ppm: float = Form(..., description="Scale: Pixels Per Meter", gt=0),
    wall_height: float = Form(2.5, description="Wall height in meters", gt=0)
):
    logger.info(f"Generating 3D geometry for: {file.filename}")
    
    allowed_types = ["image/jpeg", "image/png", "image/jpg", "image/tiff", "image/bmp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type.")
    
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            raise HTTPException(status_code=400, detail="Failed to decode image.")
        
        original_height, original_width = image.shape[:2]
        inference_height, inference_width = INFERENCE_SIZE
        scale_x = inference_width / original_width
        scale_y = inference_height / original_height
        avg_scale_factor = (scale_x + scale_y) / 2
        adjusted_scale_ppm = scale_ppm * avg_scale_factor
        meters_per_pixel = 1.0 / adjusted_scale_ppm
        
        # --- 1. Run Inferences ---
        logger.info("Running wall segmentation...")
        unet_tensor, _ = preprocess_image(image)
        wall_mask = run_unet_inference(models["unet"], unet_tensor)
        
        if wall_mask.shape != (inference_height, inference_width):
            wall_mask = cv2.resize(wall_mask, (inference_width, inference_height), interpolation=cv2.INTER_NEAREST)

        logger.info("Running door/window detection...")
        rcnn_tensor = preprocess_for_rcnn(image)
        detections = run_rcnn_inference(models["rcnn"], rcnn_tensor)
        
        room_mask = None
        if models.get("room") is not None:
            logger.info("Running room segmentation...")
            resized_for_room = cv2.resize(image, INFERENCE_SIZE)
            room_mask = run_room_inference(
                models["room"], 
                resized_for_room,
                target_size=ROOM_MODEL_IMAGE_SIZE
            )
            if room_mask.shape != (inference_height, inference_width):
                room_mask = cv2.resize(room_mask, (inference_width, inference_height), interpolation=cv2.INTER_NEAREST)
        else:
            room_mask = (1 - wall_mask).astype(np.uint8)
        
        # --- UPGRADED: Hole-Aware Polygon Extraction ---
        # This prevents the "Giant Block" bug by ensuring shapes are extracted with hollow centers
        def mask_to_polygons(mask, tolerance=2.0, min_area=100):
            contours, hierarchy = cv2.findContours(
                mask.astype(np.uint8), 
                cv2.RETR_CCOMP,  # Captures internal holes
                cv2.CHAIN_APPROX_SIMPLE
            )
            
            if hierarchy is None:
                return []
                
            polygons = []
            for i, cnt in enumerate(contours):
                # If it has no parent, it's an outer boundary
                if hierarchy[0][i][3] == -1:
                    if cv2.contourArea(cnt) < min_area:
                        continue
                    points = cnt.squeeze().tolist()
                    if len(points) < 3 or isinstance(points[0], (int, float)):
                        continue
                    
                    # Find all children (holes inside the wall/room)
                    holes = []
                    child_idx = hierarchy[0][i][2]
                    while child_idx != -1:
                        child_cnt = contours[child_idx]
                        if cv2.contourArea(child_cnt) >= min_area:
                            c_pts = child_cnt.squeeze().tolist()
                            if len(c_pts) >= 3 and not isinstance(c_pts[0], (int, float)):
                                holes.append(c_pts)
                        child_idx = hierarchy[0][child_idx][0] # Move to next sibling
                        
                    poly = Polygon(points, holes).simplify(tolerance, preserve_topology=True)
                    if not poly.is_valid:
                        poly = make_valid(poly)
                    if not poly.is_empty:
                        if isinstance(poly, MultiPolygon):
                            polygons.extend(poly.geoms)
                        else:
                            polygons.append(poly)
            return polygons

        # --- 2. Process Rooms ---
        labeled_rooms, num_rooms = ndimage.label(room_mask)
        logger.info(f"Found {num_rooms} room regions")
        
        room_colors = ["#4A90D9", "#50C878", "#FFB347", "#DDA0DD", "#87CEEB", "#F0E68C", 
                       "#98FB98", "#DEB887", "#B0C4DE", "#FFDAB9", "#E6E6FA", "#F5DEB3"]
        
        max_room_area = inference_width * inference_height * 0.4
        rooms = []
        valid_room_polys = []
        valid_room_count = 0
        
        for room_id in range(1, num_rooms + 1):
            room_binary = (labeled_rooms == room_id).astype(np.uint8)
            
            # Boundary checks
            if (room_binary[0, :].any() or room_binary[-1, :].any() or 
                room_binary[:, 0].any() or room_binary[:, -1].any()):
                boundary_pixels = (room_binary[0, :].sum() + room_binary[-1, :].sum() + 
                                   room_binary[:, 0].sum() + room_binary[:, -1].sum())
                if boundary_pixels / max(room_binary.sum(), 1) > 0.3:
                    continue
            
            if room_binary.sum() > max_room_area:
                continue
            
            room_polys = mask_to_polygons(room_binary, tolerance=3.0, min_area=500)
            
            for poly in room_polys:
                valid_room_polys.append(poly)
                
                outline = list(poly.exterior.coords)
                outline_m = [[x * meters_per_pixel, y * meters_per_pixel] for x, y in outline]
                holes_m = [[[x * meters_per_pixel, y * meters_per_pixel] for x, y in h.coords] for h in poly.interiors]
                
                rooms.append({
                    "id": valid_room_count + 1,
                    "outline": outline_m,
                    "holes": holes_m,
                    "color": room_colors[valid_room_count % len(room_colors)],
                    "area_m2": round(poly.area * meters_per_pixel * meters_per_pixel, 2)
                })
                valid_room_count += 1
        
        # --- 3. Process R-CNN Windows and Doors ---
        window_polys = []
        door_polys = []
        
        for det in detections:
            label, mask, box = det["label"], det["mask"], det.get("box", None)
            mask = mask[0] if len(mask.shape) == 3 else mask
            bin_mask = (mask > 0.5).astype(np.uint8)
            
            if bin_mask.shape != (inference_height, inference_width):
                bin_mask = cv2.resize(bin_mask, (inference_width, inference_height), interpolation=cv2.INTER_NEAREST)
            
            if bin_mask.sum() < 50 and box is not None:
                x1, y1, x2, y2 = [int(c) for c in box]
                bin_mask = np.zeros((inference_height, inference_width), dtype=np.uint8)
                bin_mask[y1:y2, x1:x2] = 1
            
            polys = mask_to_polygons(bin_mask, tolerance=1.0, min_area=50)
            door_polys.extend(polys) if label == 1 else window_polys.extend(polys)
                
       # --- 4. NEW: Construct Perfect Walls via Boolean Geometry ---
        logger.info("Extracting wall geometry using Boolean logic...")
        all_walls = []
        if valid_room_polys:
            from shapely.geometry import GeometryCollection
            
            # A. Union all rooms together into one continuous inner space
            all_rooms_poly = make_valid(unary_union(valid_room_polys))
            
            # B. The "Morphological Closing" trick to fuse gaps between rooms
            # We expand the rooms by a large amount (60cm) to force adjacent rooms to fuse together.
            # Then we shrink it back by 45cm. 
            # Net result: A solid building block with a 15cm outer border, and all internal gaps filled!
            merge_radius = 0.60 / meters_per_pixel if meters_per_pixel > 0 else 20.0
            shrink_radius = 0.45 / meters_per_pixel if meters_per_pixel > 0 else 15.0
            
            # Expand to swallow gaps (join_style=2 keeps corners sharp/square)
            expanded_mass = make_valid(all_rooms_poly.buffer(merge_radius, join_style=2))
            
            # Shrink back to create the exact footprint
            building_footprint = make_valid(expanded_mass.buffer(-shrink_radius, join_style=2))
            
            # C. Hollow out the rooms from the solid footprint
            # Buffer the cut slightly (0.5 px) to prevent microscopic floating-point artifacts
            rooms_for_cut = make_valid(all_rooms_poly.buffer(0.5, join_style=2))
            raw_walls = make_valid(building_footprint.difference(rooms_for_cut))
            
            # D. Carve perfectly sized holes for doors and windows
            if window_polys or door_polys:
                fixtures = [make_valid(p.buffer(2.0, join_style=2)) for p in window_polys + door_polys]
                final_walls = make_valid(raw_walls.difference(make_valid(unary_union(fixtures))))
            else:
                final_walls = raw_walls
                
            # E. Safely extract Polygons (Handles any weird math fragments)
            def extract_polygons_from_geom(geom):
                polys = []
                if geom.is_empty: return polys
                if isinstance(geom, Polygon): polys.append(geom)
                elif isinstance(geom, MultiPolygon): polys.extend(geom.geoms)
                elif isinstance(geom, GeometryCollection):
                    for g in geom.geoms:
                        if isinstance(g, Polygon): polys.append(g)
                        elif isinstance(g, MultiPolygon): polys.extend(g.geoms)
                return polys

            # Extract and filter out tiny stray pixel artifacts
            extracted_polys = extract_polygons_from_geom(final_walls)
            all_walls = [p for p in extracted_polys if p.area > 50]
        
        # Format helper
        def format_poly(poly):
            if poly.is_empty: return None
            try: outline = list(poly.exterior.coords)
            except AttributeError: return None
            
            return {
                "outline": [[x * meters_per_pixel, y * meters_per_pixel] for x, y in outline],
                "holes": [[[x * meters_per_pixel, y * meters_per_pixel] for x, y in h.coords] for h in poly.interiors]
            }
        
        # --- 5. Build Output ---
        output = {
            "rooms": rooms,
            "walls": [format_poly(p) for p in all_walls if format_poly(p)],
            "windows": [format_poly(p) for p in window_polys if format_poly(p)],
            "doors": [format_poly(p) for p in door_polys if format_poly(p)],
            "metadata": {
                "scale": meters_per_pixel,
                "units": "meters",
                "wall_height": wall_height,
                "original_size": {"width": original_width, "height": original_height},
                "inference_size": {"width": inference_width, "height": inference_height}
            }
        }
        
        logger.info(f"Generated 3D geometry: {len(output['rooms'])} rooms, {len(output['walls'])} walls, "
                   f"{len(output['windows'])} windows, {len(output['doors'])} doors")
        
        return output
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating 3D geometry: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error generating 3D geometry: {str(e)}")