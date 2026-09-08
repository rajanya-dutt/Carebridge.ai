import os
from PIL import Image

SRC = r"D:\CAREBRIDGE\scratch\test_docs\Alamgir_Mandal_Rx.jpg"
OUT_DIR = r"D:\CAREBRIDGE\scratch\test_docs"

img = Image.open(SRC)

# 1. Save PNG
png_path = os.path.join(OUT_DIR, "Alamgir_Mandal_Rx.png")
img.save(png_path, "PNG")

# 2. Save WEBP
webp_path = os.path.join(OUT_DIR, "Alamgir_Mandal_Rx.webp")
img.save(webp_path, "WEBP")

# 3. Save JPEG
jpeg_path = os.path.join(OUT_DIR, "Alamgir_Mandal_Rx.jpeg")
img.save(jpeg_path, "JPEG")

# 4. Save PDF
pdf_path = os.path.join(OUT_DIR, "Alamgir_Mandal_Rx.pdf")
img_rgb = img.convert("RGB")
img_rgb.save(pdf_path, "PDF", resolution=100.0)

print(f"Generated multi-format files for Alamgir Mandal from real prescription!")
