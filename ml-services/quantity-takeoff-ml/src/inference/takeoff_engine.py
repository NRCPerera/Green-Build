import torch
import cv2
import numpy as np
import pandas as pd
from skimage.morphology import skeletonize
import albumentations as A
from albumentations.pytorch import ToTensorV2
import segmentation_models_pytorch as smp
import torchvision
from torchvision.models.detection.faster_rcnn import FastRCNNPredictor
from torchvision.models.detection.mask_rcnn import MaskRCNNPredictor

# --- CONFIGURATION ---
UNET_MODEL_PATH = "outputs/weights/best_unetpp_cubicasa.pth"     
MASKRCNN_MODEL_PATH = "outputs/maskrcnn/final_maskrcnn_optimized.pth"
IMAGE_PATH = "data/cubicasa/images/7941.png"
OUTPUT_CSV = "outputs/predictions/Bill_of_Quantities.csv"

# SCALE FACTOR (Crucial Step)
# You must calibrate this. E.g., if a 1-meter door is 100 pixels wide:
PIXELS_PER_METER = 50.0 

DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

# --- MODEL LOADERS (Same as before) ---
def get_unet_model(num_classes=5):
    return smp.UnetPlusPlus(encoder_name="resnet34", in_channels=3, classes=num_classes)

def get_rcnn_model(num_classes=3):
    model = torchvision.models.detection.maskrcnn_resnet50_fpn(weights=None)
    in_features = model.roi_heads.box_predictor.cls_score.in_features
    model.roi_heads.box_predictor = FastRCNNPredictor(in_features, num_classes)
    in_features_mask = model.roi_heads.mask_predictor.conv5_mask.in_channels
    model.roi_heads.mask_predictor = MaskRCNNPredictor(in_features_mask, 256, num_classes)
    return model

# --- GEOMETRIC CALCULATION ENGINE ---
def calculate_wall_quantities(mask, scale_ppm):
    """
    Calculates Wall Area (m2) and Approx Linear Length (m)
    """
    # 1. Wall Area (Simple Pixel Count)
    # Area = Total Pixels / (Pixels per Meter)^2
    total_pixels = np.sum(mask > 0)
    area_m2 = total_pixels / (scale_ppm ** 2)

    # 2. Wall Length (Skeletonization)
    # Reduces thick walls to a 1-pixel line to measure length
    skeleton = skeletonize(mask > 0)
    length_pixels = np.sum(skeleton)
    length_m = length_pixels / scale_ppm

    return area_m2, length_m

def calculate_instance_quantities(boxes, labels, scale_ppm):
    """
    Converts bbox dimensions to real-world width/height
    """
    inventory = []
    
    for box, label in zip(boxes, labels):
        x1, y1, x2, y2 = box
        
        # Calculate Dimensions in Pixels
        width_px = x2 - x1
        height_px = y2 - y1
        
        # Convert to Meters
        width_m = width_px / scale_ppm
        height_m = height_px / scale_ppm
        
        item_type = "Window" if label == 2 else "Door" # Adjust based on your IDs
        
        inventory.append({
            "Element": item_type,
            "Width_m": round(width_m, 2),
            "Height_m": round(height_m, 2),
            "Area_m2": round(width_m * height_m, 2)
        })
        
    return inventory

# --- MAIN PIPELINE ---
def generate_boq():
    print(f"--- Starting Quantity Takeoff (Scale: {PIXELS_PER_METER} px/m) ---")
    
    # 1. Load Models
    unet = get_unet_model().to(DEVICE)
    unet.load_state_dict(torch.load(UNET_MODEL_PATH, map_location=DEVICE))
    unet.eval()
    
    rcnn = get_rcnn_model().to(DEVICE)
    rcnn.load_state_dict(torch.load(MASKRCNN_MODEL_PATH, map_location=DEVICE))
    rcnn.eval()

    # 2. Process Image
    img = cv2.imread(IMAGE_PATH)
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    
    # Preprocess for U-Net (Fixed Resize)
    unet_transform = A.Compose([A.Resize(512, 512), A.Normalize(), ToTensorV2()])
    unet_input = unet_transform(image=img_rgb)["image"].unsqueeze(0).to(DEVICE)
    
    # Preprocess for R-CNN (Full Resolution Tensor)
    rcnn_input = torchvision.transforms.functional.to_tensor(img_rgb).to(DEVICE).unsqueeze(0)

    # 3. Inference
    with torch.no_grad():
        # Get Wall Mask (U-Net)
        u_out = unet(unet_input)
        # Resize mask back to original image size for accurate calculation
        mask_pred = torch.argmax(u_out, dim=1).squeeze().cpu().numpy()
        mask_resized = cv2.resize(mask_pred.astype('uint8'), (img.shape[1], img.shape[0]), interpolation=cv2.INTER_NEAREST)
        
        # Get Instance Boxes (R-CNN)
        r_out = rcnn(rcnn_input)[0]
    
    # Filter R-CNN results (Score > 0.5)
    keep = r_out['scores'] > 0.5
    boxes = r_out['boxes'][keep].cpu().numpy()
    labels = r_out['labels'][keep].cpu().numpy()

    # --- QUANTITY CALCULATION ---
    
    # A. Wall Calculations
    # Assuming Class 1 or 2 is Wall in your U-Net. Adjust logic to match your U-Net classes.
    # Example: Create binary mask where pixels are "Wall"
    wall_mask = (mask_resized == 1) | (mask_resized == 2) 
    wall_area, wall_length = calculate_wall_quantities(wall_mask, PIXELS_PER_METER)

    # B. Window/Door Calculations
    fixtures_list = calculate_instance_quantities(boxes, labels, PIXELS_PER_METER)

    # --- REPORT GENERATION ---
    print("\n--- Generating Bill of Quantities ---")
    
    # Create DataFrames
    df_fixtures = pd.DataFrame(fixtures_list)
    
    # Summary Table
    summary_data = {
        "Category": ["Structural", "Structural", "Fixtures", "Fixtures"],
        "Item": ["Total Wall Area", "Total Wall Length", "Total Windows", "Total Doors"],
        "Quantity": [
            f"{wall_area:.2f} m2", 
            f"{wall_length:.2f} m", 
            len(df_fixtures[df_fixtures['Element'] == 'Window']),
            len(df_fixtures[df_fixtures['Element'] == 'Door'])
        ]
    }
    df_summary = pd.DataFrame(summary_data)

    # Export
    with open(OUTPUT_CSV, 'w') as f:
        f.write("PROJECT: AUTOMATED QUANTITY TAKEOFF\n")
        f.write(f"SCALE: 1 Meter = {PIXELS_PER_METER} Pixels\n\n")
        
        f.write("--- SUMMARY ---\n")
        df_summary.to_csv(f, index=False)
        f.write("\n\n--- DETAILED FIXTURE SCHEDULE ---\n")
        df_fixtures.to_csv(f, index=False)

    print(f"Success! Report saved to {OUTPUT_CSV}")
    print(df_summary)

if __name__ == "__main__":
    generate_boq()