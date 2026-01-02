"""
Visualization Service
=====================
Image visualization utilities for detection results.
"""

import base64
import logging
from typing import Any, Dict, List

import cv2
import numpy as np

from ..config import RCNN_CLASSES

logger = logging.getLogger(__name__)


def create_detection_overlay(
    original_image: np.ndarray,
    detections: List[Dict[str, Any]]
) -> str:
    """
    Create a visualization overlay showing all detected objects with labels.
    
    Args:
        original_image: Original BGR image from OpenCV
        detections: List of detection dictionaries with box, label, score
        
    Returns:
        Base64 encoded PNG image string
    """
    # Create a copy to draw on
    overlay = original_image.copy()
    
    # Define colors for each class (BGR format for OpenCV)
    colors = {
        1: (0, 255, 0),    # Door - Green
        2: (0, 0, 255),    # Window - Red
    }
    
    # Define class names
    class_names = {
        1: "Door",
        2: "Window"
    }
    
    for det in detections:
        box = det["box"]  # [x1, y1, x2, y2]
        label = det["label"]
        score = det["score"]
        
        x1, y1, x2, y2 = map(int, box)
        
        # Get color and class name
        color = colors.get(label, (255, 255, 255))
        class_name = class_names.get(label, f"Class {label}")
        
        # Draw bounding box
        cv2.rectangle(overlay, (x1, y1), (x2, y2), color, 2)
        
        # Create label text with confidence
        label_text = f"{class_name}: {score:.2f}"
        
        # Calculate text size for background
        font = cv2.FONT_HERSHEY_SIMPLEX
        font_scale = 0.5
        font_thickness = 1
        (text_width, text_height), baseline = cv2.getTextSize(
            label_text, font, font_scale, font_thickness
        )
        
        # Draw background rectangle for label
        cv2.rectangle(
            overlay,
            (x1, y1 - text_height - 5),
            (x1 + text_width + 5, y1),
            color,
            -1
        )
        
        # Draw label text
        cv2.putText(
            overlay,
            label_text,
            (x1 + 2, y1 - 3),
            font,
            font_scale,
            (255, 255, 255),  # White text
            font_thickness
        )
    
    # Add summary text at the bottom
    door_count = sum(1 for d in detections if d["label"] == 1)
    window_count = sum(1 for d in detections if d["label"] == 2)
    
    summary_text = f"Detected: {door_count} Doors, {window_count} Windows"
    
    # Draw summary background
    img_height, img_width = overlay.shape[:2]
    cv2.rectangle(
        overlay,
        (0, img_height - 30),
        (img_width, img_height),
        (50, 50, 50),
        -1
    )
    
    # Draw summary text
    cv2.putText(
        overlay,
        summary_text,
        (10, img_height - 10),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.6,
        (255, 255, 255),
        1
    )
    
    # Add legend
    legend_x = img_width - 150
    legend_y = 20
    
    cv2.rectangle(overlay, (legend_x - 5, 5), (img_width - 5, 55), (50, 50, 50), -1)
    
    # Door legend
    cv2.rectangle(overlay, (legend_x, legend_y - 10), (legend_x + 15, legend_y), (0, 255, 0), -1)
    cv2.putText(overlay, "Door", (legend_x + 20, legend_y - 2), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)
    
    # Window legend
    cv2.rectangle(overlay, (legend_x, legend_y + 10), (legend_x + 15, legend_y + 20), (0, 0, 255), -1)
    cv2.putText(overlay, "Window", (legend_x + 20, legend_y + 18), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)
    
    # Encode to base64
    success, buffer = cv2.imencode('.png', overlay)
    if success:
        return base64.b64encode(buffer).decode('utf-8')
    else:
        logger.warning("Failed to encode detection overlay image")
        return None
