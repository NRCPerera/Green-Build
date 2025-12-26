import os
import cv2
from tqdm import tqdm

INPUT_DIR = "data/cubicasa/images"
OUTPUT_DIR = "data/processed/images"

os.makedirs(OUTPUT_DIR, exist_ok=True)

TARGET_SIZE = 512

for file in tqdm(os.listdir(INPUT_DIR)):
    path = os.path.join(INPUT_DIR, file)
    img = cv2.imread(path)
    img = cv2.resize(img, (TARGET_SIZE, TARGET_SIZE))
    cv2.imwrite(os.path.join(OUTPUT_DIR, file), img)

print("Preprocessing completed.")