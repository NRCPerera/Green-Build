import torch
import torchvision
import segmentation_models_pytorch as smp
import cv2
import numpy as np
import matplotlib.pyplot as plt
from torchvision.models.detection.faster_rcnn import FastRCNNPredictor
from torchvision.models.detection.mask_rcnn import MaskRCNNPredictor
import albumentations as A
from albumentations.pytorch import ToTensorV2

# --- CONFIGURATION ---
UNET_MODEL_PATH = "outputs/weights/best_unetpp_cubicasa.pth"     
MASKRCNN_MODEL_PATH = "outputs/maskrcnn/final_maskrcnn_optimized.pth"
IMAGE_PATH = "data/cubicasa/images/7941.png"

# Device config (Automatically uses GPU if available, else CPU)
DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"Running on: {DEVICE}")

# --- MODEL DEFINITION 1: U-Net++ (Walls & Rooms) ---
# Must match the definition from your first script exactly
def get_unet_model(num_classes=5):
    model = smp.UnetPlusPlus(
        encoder_name="resnet34",
        encoder_weights=None, # We load our own weights
        in_channels=3,
        classes=num_classes,
    )
    return model

# --- MODEL DEFINITION 2: Mask R-CNN (Doors & Windows) ---
# Must match the definition we used for training
def get_maskrcnn_model(num_classes=3):
    model = torchvision.models.detection.maskrcnn_resnet50_fpn(weights=None)
    in_features = model.roi_heads.box_predictor.cls_score.in_features
    model.roi_heads.box_predictor = FastRCNNPredictor(in_features, num_classes)
    in_features_mask = model.roi_heads.mask_predictor.conv5_mask.in_channels
    hidden_layer = 256
    model.roi_heads.mask_predictor = MaskRCNNPredictor(in_features_mask, hidden_layer, num_classes)
    return model

# --- PREPROCESSING ---
def get_preprocessing():
    # Standard normalization matching your training
    return A.Compose([
        A.Resize(512, 512), # Resize for U-Net (Mask R-CNN handles size internally, but U-Net needs fixed)
        A.Normalize(),
        ToTensorV2()
    ])

# --- MAIN LOADING & INFERENCE ---
def run_dual_inference():
    # 1. Load U-Net
    print("Loading U-Net...")
    unet_model = get_unet_model(num_classes=5) # Ensure this matches your training
    try:
        unet_model.load_state_dict(torch.load(UNET_MODEL_PATH, map_location=DEVICE))
        unet_model.to(DEVICE)
        unet_model.eval()
        print("U-Net loaded successfully.")
    except FileNotFoundError:
        print(f"Error: Could not find {UNET_MODEL_PATH}")
        return

    # 2. Load Mask R-CNN
    print("Loading Mask R-CNN...")
    rcnn_model = get_maskrcnn_model(num_classes=3)
    try:
        rcnn_model.load_state_dict(torch.load(MASKRCNN_MODEL_PATH, map_location=DEVICE))
        rcnn_model.to(DEVICE)
        rcnn_model.eval()
        print("Mask R-CNN loaded successfully.")
    except FileNotFoundError:
        print(f"Error: Could not find {MASKRCNN_MODEL_PATH}")
        return

    # 3. Load & Preprocess Image
    original_img = cv2.imread(IMAGE_PATH)
    if original_img is None:
        print(f"Error: Could not read image at {IMAGE_PATH}")
        return
    original_img = cv2.cvtColor(original_img, cv2.COLOR_BGR2RGB)

    # Transform for U-Net
    preprocess = get_preprocessing()
    unet_input = preprocess(image=original_img)["image"].unsqueeze(0).to(DEVICE)

    # Transform for Mask R-CNN (Simple Tensor conversion)
    rcnn_input = torchvision.transforms.functional.to_tensor(original_img).to(DEVICE).unsqueeze(0)

    # 4. Inference
    print("Running Inference...")
    with torch.no_grad():
        # U-Net Prediction
        unet_output = unet_model(unet_input)
        unet_mask = torch.argmax(unet_output, dim=1).squeeze().cpu().numpy()

        # Mask R-CNN Prediction
        rcnn_output = rcnn_model(rcnn_input)[0]

    # --- VISUALIZATION ---
    print("Visualizing Results...")
    plt.figure(figsize=(18, 6))

    # Plot 1: Original
    plt.subplot(1, 3, 1)
    plt.imshow(original_img)
    plt.title("Original Input")
    plt.axis("off")

    # Plot 2: U-Net Output (Walls/Rooms)
    plt.subplot(1, 3, 2)
    # Resize mask back to original image size for display
    unet_mask_resized = cv2.resize(unet_mask.astype('uint8'), (original_img.shape[1], original_img.shape[0]), interpolation=cv2.INTER_NEAREST)
    plt.imshow(unet_mask_resized, cmap='jet') # Jet map shows different classes as colors
    plt.title("U-Net (Semantic Segmentation)")
    plt.axis("off")

    # Plot 3: Mask R-CNN Output (Instances)
    # Draw boxes on a copy of the image
    rcnn_viz = original_img.copy()
    boxes = rcnn_output['boxes'].cpu().numpy()
    scores = rcnn_output['scores'].cpu().numpy()
    labels = rcnn_output['labels'].cpu().numpy()

    # Filter by confidence
    thr = 0.5
    for i in range(len(boxes)):
        if scores[i] > thr:
            box = boxes[i].astype(int)
            label = labels[i]
            # Color: Red for Label 1, Green for Label 2 (Adjust as needed)
            color = (255, 0, 0) if label == 1 else (0, 255, 0)
            
            cv2.rectangle(rcnn_viz, (box[0], box[1]), (box[2], box[3]), color, 3)
            cv2.putText(rcnn_viz, f"{scores[i]:.2f}", (box[0], box[1]-10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

    plt.subplot(1, 3, 3)
    plt.imshow(rcnn_viz)
    plt.title("Mask R-CNN (Instance Segmentation)")
    plt.axis("off")

    plt.tight_layout()
    plt.show()

if __name__ == "__main__":
    run_dual_inference()