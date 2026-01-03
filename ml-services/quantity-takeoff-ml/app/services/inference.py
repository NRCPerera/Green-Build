import logging
from typing import Any, Dict, List

import numpy as np
import torch
import torch.nn as nn

from ..config import DEVICE, DETECTION_CONFIDENCE_THRESHOLD

logger = logging.getLogger(__name__)


def run_unet_inference(model: nn.Module, image_tensor: torch.Tensor) -> np.ndarray:

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


def run_room_inference(
    model: nn.Module, 
    image: np.ndarray,
    target_size: int = 512
) -> np.ndarray:
    """
    Run room segmentation inference.
    
    Args:
        model: Trained room segmentation model (U-Net++ with EfficientNet-B3)
        image: Input image as numpy array (H, W, C) in RGB format
        target_size: Size to resize image for inference (default 512)
    
    Returns:
        Binary room mask as numpy array (H, W) with same size as input
    """
    import cv2
    import albumentations as A
    from albumentations.pytorch import ToTensorV2
    
    original_h, original_w = image.shape[:2]
    
    # Preprocess: same as training
    transform = A.Compose([
        A.Resize(target_size, target_size),
        A.Normalize(),
        ToTensorV2()
    ])
    
    augmented = transform(image=image)
    image_tensor = augmented['image'].unsqueeze(0).to(DEVICE)
    
    # Run inference
    with torch.no_grad():
        output = model(image_tensor)
        pred = torch.sigmoid(output).squeeze().cpu().numpy()
    
    # Threshold to binary
    binary_mask = (pred > 0.5).astype(np.uint8)
    
    # Resize back to original size
    room_mask = cv2.resize(binary_mask, (original_w, original_h), interpolation=cv2.INTER_NEAREST)
    
    logger.info(f"Room inference complete: {room_mask.sum()} room pixels detected")
    
    return room_mask
