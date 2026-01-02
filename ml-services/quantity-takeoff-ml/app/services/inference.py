"""
Inference Service
=================
ML model inference functions.
"""

import logging
from typing import Any, Dict, List

import numpy as np
import torch
import torch.nn as nn

from ..config import DEVICE, DETECTION_CONFIDENCE_THRESHOLD

logger = logging.getLogger(__name__)


def run_unet_inference(model: nn.Module, image_tensor: torch.Tensor) -> np.ndarray:
    """
    Run U-Net inference for wall segmentation.
    
    Args:
        model: Loaded U-Net model
        image_tensor: Preprocessed image tensor
        
    Returns:
        Binary wall segmentation mask
    """
    with torch.no_grad():
        input_tensor = image_tensor.unsqueeze(0).to(DEVICE)
        
        output = model(input_tensor)
        
        mask = torch.sigmoid(output).squeeze().cpu().numpy()
        binary_mask = (mask > 0.5).astype(np.uint8)
        
    return binary_mask


def run_rcnn_inference(
    model: nn.Module, 
    image_tensor: torch.Tensor
) -> List[Dict[str, Any]]:
    """
    Run Mask R-CNN inference for door/window detection.
    
    Args:
        model: Loaded Mask R-CNN model
        image_tensor: Preprocessed image tensor
        
    Returns:
        List of detection dictionaries with box, label, score, mask
    """
    with torch.no_grad():
        input_tensor = image_tensor.unsqueeze(0).to(DEVICE)
        
        outputs = model(input_tensor)
        
    detections = []
    if len(outputs) > 0:
        output = outputs[0]
        
        boxes = output["boxes"].cpu().numpy()
        labels = output["labels"].cpu().numpy()
        scores = output["scores"].cpu().numpy()
        masks = output["masks"].cpu().numpy()
        
        for i, score in enumerate(scores):
            if score >= DETECTION_CONFIDENCE_THRESHOLD:
                detections.append({
                    "box": boxes[i],  # [x1, y1, x2, y2]
                    "label": int(labels[i]),
                    "score": float(score),
                    "mask": masks[i]
                })
    
    return detections
