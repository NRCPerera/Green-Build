import os
import cv2
import numpy as np
import torch
import segmentation_models_pytorch as smp
import albumentations as A
from albumentations.pytorch import ToTensorV2
import matplotlib.pyplot as plt

MODEL_PATH = "outputs/weights/best_unetpp_cubicasa.pth"
IMG_SIZE = 512
NUM_CLASSES = 5
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

inference_transform = A.Compose([
    A.Resize(IMG_SIZE, IMG_SIZE),
    A.Normalize(),
    ToTensorV2()
])

def load_model(model_path, num_classes):
    model = smp.UnetPlusPlus(
        encoder_name="resnet34",
        encoder_weights=None,
        in_channels=3,
        classes=num_classes,
    )

    model.load_state_dict(torch.load(model_path, map_location=DEVICE))
    model = model.to(DEVICE)
    model.eval()

    return model

def predict_single_image(image_path, model, transform):
    image = cv2.imread(image_path)
    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    original_image = image.copy()

    augmented = transform(image=image)
    image_tensor = augmented["image"].unsqueeze(0)

    image_tensor = image_tensor.to(DEVICE)

    with torch.no_grad():
        output = model(image_tensor)
        prediction = torch.argmax(output, dim=1).squeeze(0).cpu().numpy()

    return prediction, original_image

def predict_batch(image_paths, model, transform):
    predictions = []
    original_images = []

    for img_path in image_paths:
        pred, orig = predict_single_image(img_path, model, transform)
        predictions.append(pred)
        original_images.append(orig)

    return predictions, original_images

def visualize_prediction(image, prediction, num_classes, save_path=None):
    pred_resized = cv2.resize(
        prediction.astype(np.uint8),
        (image.shape[1], image.shape[0]),
        interpolation=cv2.INTER_NEAREST
    )

    colors = plt.cm.get_cmap('tab10', num_classes)
    colored_mask = colors(pred_resized)[:, :, :3]
    colored_mask = (colored_mask * 255).astype(np.uint8)

    overlay = cv2.addWeighted(image, 0.6, colored_mask, 0.4, 0)

    fig, axes = plt.subplots(1, 3, figsize=(15, 5))

    axes[0].imshow(image)
    axes[0].set_title("Original Image")
    axes[0].axis('off')

    axes[1].imshow(pred_resized, cmap='tab10', vmin=0, vmax=num_classes-1)
    axes[1].set_title("Predicted Mask")
    axes[1].axis('off')

    axes[2].imshow(overlay)
    axes[2].set_title("Overlay")
    axes[2].axis('off')

    plt.tight_layout()

    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches='tight')
        print(f"Visualization saved to {save_path}")

    plt.show()

def save_prediction_mask(prediction, save_path):
    cv2.imwrite(save_path, prediction.astype(np.uint8))
    print(f"Prediction mask saved to {save_path}")

import argparse
from pathlib import Path

def main():
    parser = argparse.ArgumentParser(description="UNet++ Inference for Floor Plan Segmentation")
    parser.add_argument("--image", "-i", type=str, required=True, 
                        help="Path to input image or directory containing images")
    parser.add_argument("--output", "-o", type=str, default="outputs/predictions",
                        help="Output directory for predictions (default: outputs/predictions)")
    parser.add_argument("--model", "-m", type=str, default=MODEL_PATH,
                        help=f"Path to model weights (default: {MODEL_PATH})")
    parser.add_argument("--no-display", action="store_true",
                        help="Don't display the visualization (useful for batch processing)")
    args = parser.parse_args()

    # Create output directory
    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    print("Loading model...")
    model = load_model(args.model, NUM_CLASSES)
    print(f"Model loaded successfully! (Device: {DEVICE})")

    # Get list of images to process
    input_path = Path(args.image)
    if input_path.is_file():
        image_paths = [input_path]
    elif input_path.is_dir():
        image_paths = list(input_path.glob("*.png")) + list(input_path.glob("*.jpg")) + list(input_path.glob("*.jpeg"))
        if not image_paths:
            print(f"No images found in {input_path}")
            return
        print(f"Found {len(image_paths)} images to process")
    else:
        print(f"Error: {args.image} is not a valid file or directory")
        return

    for img_path in image_paths:
        print(f"\nPredicting on: {img_path.name}")

        prediction, original_image = predict_single_image(
            str(img_path),
            model,
            inference_transform
        )

        print(f"Prediction shape: {prediction.shape}")
        print(f"Unique classes in prediction: {np.unique(prediction)}")

        # Save visualization
        vis_save_path = output_dir / f"prediction_{img_path.stem}.png"
        
        # Temporarily disable display if --no-display is set
        if args.no_display:
            plt.ioff()
        
        visualize_prediction(
            original_image,
            prediction,
            NUM_CLASSES,
            save_path=str(vis_save_path)
        )
        
        if args.no_display:
            plt.close()

        # Save mask
        mask_save_path = output_dir / f"mask_{img_path.stem}.png"
        save_prediction_mask(prediction, str(mask_save_path))

    print(f"\n✓ All predictions saved to: {output_dir.absolute()}")

if __name__ == "__main__":
    main()