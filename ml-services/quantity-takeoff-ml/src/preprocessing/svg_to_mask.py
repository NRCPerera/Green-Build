import os
import cv2
import numpy as np
import xml.etree.ElementTree as ET # Standard library is safer for namespace handling here
from tqdm import tqdm

RAW_DIR = "raw_data/cubicasa/high_quality_architectural"
IMG_OUT = "data/cubicasa/images"
MASK_OUT = "data/cubicasa/masks"
VIZ_OUT = "data/cubicasa/viz_debug" # New folder to check results visually

os.makedirs(IMG_OUT, exist_ok=True)
os.makedirs(MASK_OUT, exist_ok=True)
os.makedirs(VIZ_OUT, exist_ok=True)

# Class map
CLASS_MAP = {
    "Wall": 1,
    "Door": 2,
    "Window": 3,
    "Room": 4,
    "Structure": 1, # CubiCasa often uses "Structure" for walls
}

def create_empty_mask(w, h):
    return np.zeros((h, w), dtype=np.uint8)

def parse_svg(svg_path, width, height):
    mask = create_empty_mask(width, height)
    
    # Parse XML
    tree = ET.parse(svg_path)
    root = tree.getroot()
    
    # SVG Namespace (CubiCasa uses this namespace)
    ns = {'svg': 'http://www.w3.org/2000/svg'}

    # 1. Iterate over all GROUPS <g> first to find the class
    for g in root.findall(".//svg:g", ns):
        
        # Get class from the Group
        class_name = g.get("class")
        # Sometimes CubiCasa puts it in 'id'
        id_name = g.get("id")

        target_id = 0
        
        # Check if this group matches our map
        if class_name in CLASS_MAP:
            target_id = CLASS_MAP[class_name]
        elif id_name and id_name in CLASS_MAP:
            target_id = CLASS_MAP[id_name]
        
        # Special check for "Structure" which is often walls
        if class_name == "Structure": 
            target_id = 1
            
        if target_id == 0:
            continue

        # 2. Draw all Polygons inside this group
        for polygon in g.findall(".//svg:polygon", ns):
            points = polygon.get("points")
            if points:
                pts = []
                for p in points.split():
                    # Handle "x,y" format safely
                    try:
                        x, y = map(float, p.split(','))
                        pts.append([x, y])
                    except ValueError:
                        continue
                if len(pts) > 0:
                    pts = np.array(pts, np.int32)
                    cv2.fillPoly(mask, [pts], target_id)

        # 3. Draw all Rects inside this group
        for rect in g.findall(".//svg:rect", ns):
            try:
                x = float(rect.get("x", 0))
                y = float(rect.get("y", 0))
                w = float(rect.get("width", 0))
                h = float(rect.get("height", 0))
                # Convert rect to polygon points
                pts = np.array([[x,y], [x+w,y], [x+w,y+h], [x,y+h]], np.int32)
                cv2.fillPoly(mask, [pts], target_id)
            except (ValueError, TypeError):
                continue

    return mask

print("Converting PNG + SVG to dataset format...")

for folder in tqdm(os.listdir(RAW_DIR)):
    folder_path = os.path.join(RAW_DIR, folder)
    if not os.path.isdir(folder_path):
        continue

    img_path = os.path.join(folder_path, "F1_scaled.png")
    svg_path = os.path.join(folder_path, "model.svg")

    if not os.path.exists(img_path) or not os.path.exists(svg_path):
        continue

    # Image
    img = cv2.imread(img_path)
    if img is None: continue
    h, w = img.shape[:2]

    # Save PNG image
    cv2.imwrite(f"{IMG_OUT}/{folder}.png", img)

    # Generate Mask
    mask = parse_svg(svg_path, w, h)

    # Save Real Mask (Values 0, 1, 2, 3) - LOOKS BLACK
    cv2.imwrite(f"{MASK_OUT}/{folder}.png", mask)

    # Save Visualization Mask (Values multiplied by 50) - LOOKS VISIBLE
    # Wall(1)->50 (Dark Grey), Door(2)->100 (Light Grey), Window(3)->150 (White)
    viz_mask = mask * 50
    cv2.imwrite(f"{VIZ_OUT}/{folder}_viz.png", viz_mask)

print("Conversion completed! Check 'data/cubicasa/viz_debug' to verify images.")