"""
Model Loader Service
====================
Handles loading and initialization of ML models.
"""

import logging
import torch
import torch.nn as nn
import segmentation_models_pytorch as smp
from torchvision.models.detection import maskrcnn_resnet50_fpn
from torchvision.models.detection.faster_rcnn import FastRCNNPredictor
from torchvision.models.detection.mask_rcnn import MaskRCNNPredictor

from ..config import NUM_RCNN_CLASSES

logger = logging.getLogger(__name__)


def load_unet_model(model_path: str, device: torch.device) -> nn.Module:
    """
    Load the U-Net++ model for wall segmentation.
    
    Args:
        model_path: Path to the pretrained model weights
        device: Torch device (CPU/CUDA)
        
    Returns:
        Loaded U-Net++ model in eval mode
    """
    logger.info(f"Loading U-Net++ model from {model_path}")
    
    # Initialize U-Net++ with EfficientNet-B4 encoder
    model = smp.UnetPlusPlus(
        encoder_name="efficientnet-b4",
        encoder_weights=None, 
        in_channels=3,
        classes=1,  
        activation=None  
    )
    
    try:
        state_dict = torch.load(model_path, map_location=device, weights_only=True)
        
        if list(state_dict.keys())[0].startswith("module."):
            state_dict = {k.replace("module.", ""): v for k, v in state_dict.items()}
        
        model.load_state_dict(state_dict)
        model.to(device)
        model.eval()
        logger.info("U-Net++ model loaded successfully")
        return model
        
    except FileNotFoundError:
        logger.warning(f"U-Net++ model file not found at {model_path}. Using random weights.")
        model.to(device)
        model.eval()
        return model
    except Exception as e:
        logger.error(f"Error loading U-Net++ model: {e}")
        raise


def get_mask_rcnn_model(num_classes: int) -> nn.Module:
    """
    Create a Mask R-CNN model with custom number of classes.
    
    Args:
        num_classes: Number of classes including background
        
    Returns:
        Configured Mask R-CNN model
    """
    model = maskrcnn_resnet50_fpn(pretrained=False)
    
    in_features = model.roi_heads.box_predictor.cls_score.in_features
    model.roi_heads.box_predictor = FastRCNNPredictor(in_features, num_classes)
    
    in_features_mask = model.roi_heads.mask_predictor.conv5_mask.in_channels
    hidden_layer = 256
    model.roi_heads.mask_predictor = MaskRCNNPredictor(
        in_features_mask, 
        hidden_layer, 
        num_classes
    )
    
    return model


def load_rcnn_model(model_path: str, device: torch.device) -> nn.Module:
    """
    Load the Mask R-CNN model for door/window detection.
    
    Args:
        model_path: Path to the pretrained model weights
        device: Torch device (CPU/CUDA)
        
    Returns:
        Loaded Mask R-CNN model in eval mode
    """
    logger.info(f"Loading Mask R-CNN model from {model_path}")
    
    model = get_mask_rcnn_model(NUM_RCNN_CLASSES)
    
    try:
        state_dict = torch.load(model_path, map_location=device, weights_only=True)
        
        if list(state_dict.keys())[0].startswith("module."):
            state_dict = {k.replace("module.", ""): v for k, v in state_dict.items()}
        
        model.load_state_dict(state_dict)
        model.to(device)
        model.eval()
        logger.info("Mask R-CNN model loaded successfully")
        return model
        
    except FileNotFoundError:
        logger.warning(f"Mask R-CNN model file not found at {model_path}. Using random weights.")
        model.to(device)
        model.eval()
        return model
    except Exception as e:
        logger.error(f"Error loading Mask R-CNN model: {e}")
        raise
