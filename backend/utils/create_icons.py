import os
import sys

# Paths
source_image = r"C:\Users\Atharv\.gemini\antigravity-ide\brain\afb6d27b-8229-43b7-a377-0cf890d3e0a3\bridgemind_logo_1781259021930.png"
assets_dir = r"g:\BridgeMind\extension\assets"
frontend_assets_dir = r"g:\BridgeMind\frontend\assets"

# Ensure directories exist
os.makedirs(assets_dir, exist_ok=True)
os.makedirs(frontend_assets_dir, exist_ok=True)

try:
    from PIL import Image
    print("Pillow is installed.")
except ImportError:
    print("Pillow is not installed. Installing Pillow...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow"])
    from PIL import Image

try:
    # Open the generated image
    img = Image.open(source_image)
    
    # Save extension icons
    sizes = [16, 48, 128]
    for size in sizes:
        resized_img = img.resize((size, size), Image.Resampling.LANCZOS)
        out_path = os.path.join(assets_dir, f"icon-{size}.png")
        resized_img.save(out_path, "PNG")
        print(f"Saved {out_path}")
        
    # Save frontend logo
    resized_frontend = img.resize((256, 256), Image.Resampling.LANCZOS)
    frontend_path = os.path.join(frontend_assets_dir, "logo.png")
    resized_frontend.save(frontend_path, "PNG")
    print(f"Saved {frontend_path}")
    
    print("Icon creation completed successfully.")
except Exception as e:
    print(f"Error creating icons: {e}")
    sys.exit(1)
