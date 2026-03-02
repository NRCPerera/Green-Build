"""
API Endpoints
=============
FastAPI route handlers for the Quantity Takeoff API.
"""

import logging

import cv2
import numpy as np
from fastapi import APIRouter, File, Form, HTTPException, UploadFile

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
        
        # Run Room Segmentation inference if model is available
        room_mask = None
        if models.get("room") is not None:
            logger.info("Running Room Segmentation inference...")
            # Resize image to inference size for room model
            resized_for_room = cv2.resize(image, INFERENCE_SIZE)
            room_mask = run_room_inference(
                models["room"], 
                resized_for_room,
                target_size=ROOM_MODEL_IMAGE_SIZE
            )
            logger.info(f"Room mask generated: {room_mask.shape}")
        else:
            logger.warning("Room model not available, using algorithmic room detection")
        
        # Create detection overlay visualization on resized image
        from ..services import create_detection_overlay
        resized_for_overlay = cv2.resize(image, INFERENCE_SIZE)
        detection_overlay = create_detection_overlay(resized_for_overlay, detections)
        
        # Compute quantity takeoff with ADJUSTED scale for inference size
        result = compute_quantity_takeoff(
            wall_mask=wall_mask,
            detections=detections,
            scale_ppm=adjusted_scale_ppm,
            wall_height=wall_height,
            room_mask=room_mask  # Pass ML-detected room mask
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


@router.post(
    "/generate-3d-geometry",
    tags=["Visualization"],
    summary="Generate 3D Floor Plan Geometry",
    description="Generates room-based 3D geometry data for Three.js visualization."
)
async def generate_3d_geometry(
    file: UploadFile = File(..., description="Construction drawing image file"),
    scale_ppm: float = Form(..., description="Scale: Pixels Per Meter", gt=0),
    wall_height: float = Form(2.5, description="Wall height in meters", gt=0)
):
    """
    Generate 3D geometry data for floor plan visualization.
    
    Returns JSON with room, window, and door polygons suitable for Three.js ExtrudeGeometry.
    Each room gets a unique color for easy identification.
    """
    logger.info(f"Generating 3D geometry for: {file.filename}")
    
    # Import geometry processing utilities
    try:
        from shapely.geometry import Polygon, MultiPolygon
        from shapely.validation import make_valid
        from scipy import ndimage
    except ImportError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Required library not installed: {e}"
        )
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/jpg", "image/tiff", "image/bmp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type: {file.content_type}. Allowed: {allowed_types}"
        )
    
    try:
        # Read and decode image
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
        
        # Meters per pixel for output coordinates
        meters_per_pixel = 1.0 / adjusted_scale_ppm
        
        # Preprocess for inference
        rcnn_tensor = preprocess_for_rcnn(image)
        
        # Run door/window detection
        logger.info("Running door/window detection...")
        detections = run_rcnn_inference(models["rcnn"], rcnn_tensor)
        
        # Run room segmentation if model is available
        room_mask = None
        if models.get("room") is not None:
            logger.info("Running room segmentation...")
            resized_for_room = cv2.resize(image, INFERENCE_SIZE)
            room_mask = run_room_inference(
                models["room"], 
                resized_for_room,
                target_size=ROOM_MODEL_IMAGE_SIZE
            )
            # Resize room mask to inference size
            if room_mask.shape != (inference_height, inference_width):
                room_mask = cv2.resize(room_mask, (inference_width, inference_height), 
                                       interpolation=cv2.INTER_NEAREST)
        else:
            logger.warning("Room model not available, using wall-based fallback")
            # Fallback to using inverted wall mask as room area
            unet_tensor, _ = preprocess_image(image)
            wall_mask = run_unet_inference(models["unet"], unet_tensor)
            room_mask = (1 - wall_mask).astype(np.uint8)
        
        # Helper function to convert mask to polygons
        def mask_to_polygons(mask, tolerance=2.0, min_area=100):
            contours, _ = cv2.findContours(
                mask.astype(np.uint8), 
                cv2.RETR_EXTERNAL, 
                cv2.CHAIN_APPROX_SIMPLE
            )
            polygons = []
            for cnt in contours:
                if cv2.contourArea(cnt) < min_area:
                    continue
                points = cnt.squeeze().tolist()
                if len(points) < 3:
                    continue
                if isinstance(points[0], (int, float)):
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
        
        # Extract individual rooms using connected components
        labeled_rooms, num_rooms = ndimage.label(room_mask)
        logger.info(f"Found {num_rooms} room regions")
        
        # Room colors - visually distinct palette
        room_colors = [
            "#4A90D9",  # Blue
            "#50C878",  # Green  
            "#FFB347",  # Orange
            "#DDA0DD",  # Plum
            "#87CEEB",  # Sky Blue
            "#F0E68C",  # Khaki
            "#98FB98",  # Pale Green
            "#DEB887",  # Burlywood
            "#B0C4DE",  # Light Steel Blue
            "#FFDAB9",  # Peach
            "#E6E6FA",  # Lavender
            "#F5DEB3",  # Wheat
        ]
        
        # Calculate total image area for filtering
        total_image_area = inference_width * inference_height
        max_room_area = total_image_area * 0.4  # Room can't be more than 40% of image
        
        rooms = []
        valid_room_count = 0
        
        for room_id in range(1, num_rooms + 1):
            room_binary = (labeled_rooms == room_id).astype(np.uint8)
            
            # Check if room touches image boundaries (likely exterior)
            if (room_binary[0, :].any() or room_binary[-1, :].any() or 
                room_binary[:, 0].any() or room_binary[:, -1].any()):
                # Check how much it touches the boundary
                boundary_pixels = (room_binary[0, :].sum() + room_binary[-1, :].sum() + 
                                   room_binary[:, 0].sum() + room_binary[:, -1].sum())
                total_room_pixels = room_binary.sum()
                boundary_ratio = boundary_pixels / max(total_room_pixels, 1)
                
                # If more than 30% of room is on the boundary, skip it (likely exterior)
                if boundary_ratio > 0.3:
                    logger.info(f"Skipping room {room_id}: touches boundary too much ({boundary_ratio:.1%})")
                    continue
            
            # Check room size
            room_pixels = room_binary.sum()
            if room_pixels > max_room_area:
                logger.info(f"Skipping room {room_id}: too large ({room_pixels} pixels, max {max_room_area})")
                continue
            
            room_polys = mask_to_polygons(room_binary, tolerance=3.0, min_area=500)
            
            for poly in room_polys:
                if poly.is_empty:
                    continue
                try:
                    outline = list(poly.exterior.coords)
                    outline_m = [[x * meters_per_pixel, y * meters_per_pixel] for x, y in outline]
                    
                    holes_m = []
                    for interior in poly.interiors:
                        hole = [[x * meters_per_pixel, y * meters_per_pixel] 
                               for x, y in interior.coords]
                        holes_m.append(hole)
                    
                    rooms.append({
                        "id": valid_room_count + 1,
                        "outline": outline_m,
                        "holes": holes_m,
                        "color": room_colors[valid_room_count % len(room_colors)],
                        "area_m2": round(poly.area * meters_per_pixel * meters_per_pixel, 2)
                    })
                    valid_room_count += 1
                except Exception as e:
                    logger.warning(f"Error processing room {room_id}: {e}")
                    continue
        
        # Process R-CNN detections into polygons
        window_polys = []
        door_polys = []
        
        for det in detections:
            label = det["label"]
            mask = det["mask"]
            
            if len(mask.shape) == 3:
                mask = mask[0]
            bin_mask = (mask > 0.5).astype(np.uint8)
            
            if bin_mask.shape != (inference_height, inference_width):
                bin_mask = cv2.resize(bin_mask, (inference_width, inference_height), 
                                     interpolation=cv2.INTER_NEAREST)
            
            polys = mask_to_polygons(bin_mask, tolerance=1.0, min_area=50)
            
            if label == 1:  # Door
                door_polys.extend(polys)
            elif label == 2:  # Window
                window_polys.extend(polys)
        
        # Format polygon for JSON output
        def format_poly(poly):
            if poly.is_empty:
                return None
            try:
                outline = list(poly.exterior.coords)
            except AttributeError:
                return None
            
            outline_m = [[x * meters_per_pixel, y * meters_per_pixel] for x, y in outline]
            
            holes_m = []
            for interior in poly.interiors:
                hole = [[x * meters_per_pixel, y * meters_per_pixel] 
                       for x, y in interior.coords]
                holes_m.append(hole)
            
            return {
                "outline": outline_m,
                "holes": holes_m
            }
        
        # Build output structure
        output = {
            "rooms": rooms,
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
        
        logger.info(f"Generated 3D geometry: {len(output['rooms'])} rooms, "
                   f"{len(output['windows'])} windows, {len(output['doors'])} doors")
        
        return output
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating 3D geometry: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error generating 3D geometry: {str(e)}"
        )

