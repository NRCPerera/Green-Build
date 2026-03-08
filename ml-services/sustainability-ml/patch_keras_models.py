import os
import zipfile
import json
import shutil
import glob

def patch_keras_file(filepath):
    print(f"Patching {filepath}...")
    temp_dir = filepath + "_temp"
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir)
    os.makedirs(temp_dir)
    
    with zipfile.ZipFile(filepath, 'r') as zip_ref:
        zip_ref.extractall(temp_dir)
    
    config_path = os.path.join(temp_dir, "config.json")
    if os.path.exists(config_path):
        with open(config_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        import re
        # Revert batch_shape -> batch_input_shape (already done in previous run, but let's do it right)
        # It's cleaner to parse JSON, modify, and dump!
        config_data = json.loads(content)
        
        def traverse_and_patch(obj):
            if isinstance(obj, dict):
                # Patch dtype
                if "dtype" in obj and isinstance(obj["dtype"], dict):
                    if obj["dtype"].get("class_name") == "DTypePolicy":
                        obj["dtype"] = obj["dtype"]["config"]["name"]
                
                # Patch batch_shape
                if "batch_shape" in obj:
                    obj["batch_input_shape"] = obj.pop("batch_shape")
                    
                # Fix optimizer arguments that don't exist in Keras 2
                if "loss_scale_factor" in obj:
                    del obj["loss_scale_factor"]
                    
                if "gradient_accumulation_steps" in obj:
                    del obj["gradient_accumulation_steps"]
                    
                for k, v in list(obj.items()):
                    traverse_and_patch(v)
            elif isinstance(obj, list):
                for item in obj:
                    traverse_and_patch(item)

        traverse_and_patch(config_data)
        
        new_content = json.dumps(config_data)
        
        if content != new_content:
            with open(config_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f" -> Patched 'dtype'/'batch_shape' in {filepath}")
            
            # Create a new zip file
            with zipfile.ZipFile(filepath, 'w', zipfile.ZIP_DEFLATED) as zip_ref:
                for root, dirs, files in os.walk(temp_dir):
                    for file in files:
                        file_path = os.path.join(root, file)
                        arcname = os.path.relpath(file_path, temp_dir)
                        zip_ref.write(file_path, arcname)
        else:
            print(" -> No changes needed.")
            
    shutil.rmtree(temp_dir)

if __name__ == "__main__":
    for f in glob.glob("models/*.keras"):
        patch_keras_file(f)
