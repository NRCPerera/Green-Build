!pip install segmentation-models-pytorch albumentations -q

import os
import cv2
import numpy as np
import torch
import albumentations as A
from albumentations.pytorch import ToTensorV2
from torch.utils.data import Dataset, DataLoader, random_split
import segmentation_models_pytorch as smp
from tqdm import tqdm
from google.colab import drive

# 1. Setup
drive.mount('/content/drive')
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# Config
DATA_DIR = "/content/drive/MyDrive/data/cubicasa"
OUT_DIR = "/content/drive/MyDrive/models/room_segmentation"
IMG_SIZE = 512
BATCH_SIZE = 8
LR = 1e-4
EPOCHS = 50
ROOM_ID = 4  # Class ID for rooms

os.makedirs(OUT_DIR, exist_ok=True)

# 2. Dataset
class RoomDataset(Dataset):
    def __init__(self, img_dir, mask_dir, tfm=None):
        self.img_dir = img_dir
        self.mask_dir = mask_dir
        self.tfm = tfm
        self.files = sorted([f for f in os.listdir(img_dir) if f.endswith(('.jpg', '.png'))])

    def __len__(self): return len(self.files)

    def __getitem__(self, i):
        img_name = self.files[i]
        img = cv2.cvtColor(cv2.imread(os.path.join(self.img_dir, img_name)), cv2.COLOR_BGR2RGB)
        mask = cv2.imread(os.path.join(self.mask_dir, img_name), 0)
        mask = (mask == ROOM_ID).astype(np.float32)

        if self.tfm:
            aug = self.tfm(image=img, mask=mask)
            img, mask = aug['image'], aug['mask']
        
        return img, mask.unsqueeze(0)

# 3. Transforms & Loaders
tfm = A.Compose([
    A.Resize(IMG_SIZE, IMG_SIZE),
    A.HorizontalFlip(p=0.5),
    A.Normalize(),
    ToTensorV2()
])

full_ds = RoomDataset(f"{DATA_DIR}/images", f"{DATA_DIR}/masks", tfm=tfm)
train_len = int(0.8 * len(full_ds))
train_ds, val_ds = random_split(full_ds, [train_len, len(full_ds) - train_len])

train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE, shuffle=True, num_workers=2)
val_loader = DataLoader(val_ds, batch_size=BATCH_SIZE, shuffle=False, num_workers=2)

# 4. Model, Loss, Optimizer
model = smp.UnetPlusPlus(
    encoder_name="efficientnet-b3", 
    encoder_weights="imagenet", 
    in_channels=3, 
    classes=1
).to(DEVICE)

loss_fn = smp.losses.DiceLoss(mode='binary', from_logits=True)
optimizer = torch.optim.AdamW(model.parameters(), lr=LR)

# 5. Training Loop
best_acc = 0

print(f"Starting training on {DEVICE}...")

for epoch in range(EPOCHS):
    # Train
    model.train()
    train_loss, train_acc = 0, 0
    loop = tqdm(train_loader, desc=f"Epoch {epoch+1}/{EPOCHS} [Train]")
    
    for img, mask in loop:
        img, mask = img.to(DEVICE), mask.to(DEVICE)
        
        optimizer.zero_grad()
        pred = model(img)
        loss = loss_fn(pred, mask)
        loss.backward()
        optimizer.step()
        
        # Track metrics
        train_loss += loss.item()
        acc = ((pred.sigmoid() > 0.5) == mask).float().mean()
        train_acc += acc.item()
        
        loop.set_postfix(loss=loss.item(), acc=acc.item())

    # Validate
    model.eval()
    val_loss, val_acc = 0, 0
    with torch.no_grad():
        for img, mask in val_loader:
            img, mask = img.to(DEVICE), mask.to(DEVICE)
            pred = model(img)
            val_loss += loss_fn(pred, mask).item()
            val_acc += ((pred.sigmoid() > 0.5) == mask).float().mean().item()

    # Average metrics
    avg_train_loss = train_loss / len(train_loader)
    avg_train_acc = train_acc / len(train_loader)
    avg_val_loss = val_loss / len(val_loader)
    avg_val_acc = val_acc / len(val_loader)

    print(f"Results: Train Loss: {avg_train_loss:.4f}, Train Acc: {avg_train_acc:.4f} | "
          f"Val Loss: {avg_val_loss:.4f}, Val Acc: {avg_val_acc:.4f}")

    # Save Best
    if avg_val_acc > best_acc:
        best_acc = avg_val_acc
        torch.save(model.state_dict(), f"{OUT_DIR}/best_model.pth")
        print(f"✓ Saved new best model (Acc: {best_acc:.4f})")