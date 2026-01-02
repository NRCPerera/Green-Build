"""
Preprocessing Service
=====================
Image preprocessing utilities for ML model inference.
"""

from typing import Tuple

import albumentations as A
import cv2
import numpy as np
import torch

from ..config import INFERENCE_SIZE


def get_preprocessing_transform() -> A.Compose:
    """
    Get the preprocessing transform pipeline for U-Net.
    
    Returns:
        Albumentations compose transform
    """
    return A.Compose([
        A.Resize(height=INFERENCE_SIZE[0], width=INFERENCE_SIZE[1]),
        A.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225],
            max_pixel_value=255.0
        ),
    ])


def preprocess_image(image: np.ndarray) -> Tuple[torch.Tensor, np.ndarray]:
    """
    Preprocess image for U-Net inference.
    
    Args:
        image: OpenCV BGR image
        
    Returns:
        Tuple of (preprocessed tensor, resized image)
    """
    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    
    transform = get_preprocessing_transform()
    transformed = transform(image=image_rgb)
    image_transformed = transformed["image"]
    
    resize_transform = A.Resize(height=INFERENCE_SIZE[0], width=INFERENCE_SIZE[1])
    resized = resize_transform(image=image_rgb)["image"]
    
    image_tensor = torch.from_numpy(image_transformed).permute(2, 0, 1).float()
    
    return image_tensor, resized


def preprocess_for_rcnn(image: np.ndarray) -> torch.Tensor:
    """
    Preprocess image for Mask R-CNN inference.
    
    Args:
        image: OpenCV BGR image
        
    Returns:
        Preprocessed tensor
    """
    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    
    image_resized = cv2.resize(image_rgb, INFERENCE_SIZE)
    
    image_tensor = torch.from_numpy(image_resized).permute(2, 0, 1).float() / 255.0
    
    return image_tensor
