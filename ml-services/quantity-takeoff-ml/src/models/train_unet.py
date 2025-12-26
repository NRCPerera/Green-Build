import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from tqdm import tqdm

from datasets.cubicasa_dataset import CubicasaDataset
from unet import UNet

# Ensure output directory exists
os.makedirs("outputs/weights", exist_ok=True)

import albumentations as A
from albumentations.pytorch import ToTensorV2


# ====== SETTINGS ======
IMG_DIR = "data/cubicasa/images"
MASK_DIR = "data/cubicasa/masks"
EPOCHS = 50
BATCH_SIZE = 4
LR = 1e-4
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"


# ====== AUGMENTATION ======
transform = A.Compose([
    A.Resize(512, 512),
    A.HorizontalFlip(p=0.5),
    A.RandomBrightnessContrast(p=0.2),
    ToTensorV2()
])


# ====== DATASET & LOADER ======
dataset = CubicasaDataset(IMG_DIR, MASK_DIR, transform)
loader = DataLoader(dataset, batch_size=BATCH_SIZE, shuffle=True)


# ====== MODEL ======
model = UNet(n_classes=5).to(DEVICE)
criterion = nn.CrossEntropyLoss()
optimizer = optim.Adam(model.parameters(), lr=LR)


# ====== TRAINING LOOP ======
for epoch in range(EPOCHS):
    model.train()
    loop = tqdm(loader)

    for images, masks in loop:
        images, masks = images.to(DEVICE), masks.to(DEVICE)

        preds = model(images)
        loss = criterion(preds, masks.long())

        optimizer.zero_grad()
        loss.backward()
        optimizer.step()

        loop.set_description(f"Epoch [{epoch+1}/{EPOCHS}] Loss: {loss.item():.4f}")

    torch.save(model.state_dict(), f"outputs/weights/unet_epoch{epoch+1}.pth")

print("Training completed!")