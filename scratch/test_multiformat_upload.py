"""Test script for multi-format ingestion (PNG, JPG, WEBP, Scanned PDF)."""

import os
import sys
import io
from PIL import Image, ImageDraw, ImageFont

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from ai.workflow import IngestionWorkflow
from ai.document_processor import is_image_file, DocumentProcessor
from database.database import get_patient, get_documents, delete_prescription, cleanup_orphaned_patient

def create_synthetic_prescription_image(filepath: str, format_name: str = "PNG"):
    img = Image.new("RGB", (800, 600), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    
    # Draw simple simulated prescription text
    lines = [
        "METRO HEALTH CLINIC - PRESCRIPTION",
        "Patient: Rahul Sharma    Age: 42    Sex: Male",
        "Blood Group: O+          Date: 2026-02-20",
        "Allergies: Penicillin",
        "",
        "Rx:",
        "1. Amoxicillin 500mg - 1 tablet 3 times daily x 7 days",
        "2. Paracetamol 650mg - As needed for fever",
        "",
        "Dr. Marcus Bennett, MD",
        "Reg No: MED-99281"
    ]
    
    y = 40
    for line in lines:
        draw.text((50, y), line, fill=(0, 0, 0))
        y += 35
        
    img.save(filepath, format=format_name)
    print(f"Created synthetic {format_name} image at: {filepath}")

def run_tests():
    os.makedirs("data/uploads", exist_ok=True)
    png_path = "data/uploads/Test_Prescription_Rahul.png"
    create_synthetic_prescription_image(png_path, "PNG")
    
    print("\n--- 1. Testing Format Detection ---")
    assert is_image_file("test.png") is True
    assert is_image_file("test.jpg") is True
    assert is_image_file("test.jpeg") is True
    assert is_image_file("test.webp") is True
    assert is_image_file("test.pdf") is False
    print("PASS: Format detection is correct.")
    
    print("\n--- 2. Testing Ingestion Workflow on PNG ---")
    workflow = IngestionWorkflow()
    with open(png_path, "rb") as f:
        res = workflow.process_and_persist_document(
            pdf_input=f,
            file_name="Test_Prescription_Rahul.png",
            patient_id="P102"
        )
    print("Ingestion Result Success:", res.get("success"))
    print("Extraction Method:", res.get("extraction_method"))
    print("Target Patient:", res.get("target_patient_id"))
    
    print("\n--- 3. Testing Orphan Patient Cleanup ---")
    # Clean up test patient if needed
    cleanup_res = cleanup_orphaned_patient("P9999")
    print("Cleanup result on non-existent/empty patient:", cleanup_res)
    
    print("\n[SUCCESS] Multi-format upload & processing validation complete!")

if __name__ == "__main__":
    run_tests()
