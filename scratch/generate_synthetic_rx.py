"""Generate clean synthetic medical test files (PDF, PNG, JPG, JPEG, WEBP, Scanned) for Priya Sharma & Rahul Sharma."""

import os
import fitz  # PyMuPDF
from PIL import Image, ImageDraw, ImageFont

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "scratch", "test_docs")
os.makedirs(OUTPUT_DIR, exist_ok=True)

def make_pdf(filename, patient_name, age, gender, date, rx_lines, diagnosis="Essential Hypertension & Mild Asthma"):
    doc = fitz.open()
    page = doc.new_page(width=595, height=842) # A4
    text = f"""
    METRO HEALTH MEDICAL CENTER
    Department of Internal Medicine
    108 Healthcare Ave, Tech City
    --------------------------------------------------
    CLINICAL PRESCRIPTION & ENCOUNTER RECORD
    
    Date: {date}
    Patient Name: {patient_name}
    Age: {age}    Gender: {gender}
    Blood Group: O+
    Allergies: Penicillin (Mild Rash)
    Diagnosis: {diagnosis}
    
    Vitals:
    BP: 132/84 mmHg | Pulse: 74 bpm | SpO2: 98% | Fasting Blood Sugar: 112 mg/dL
    
    MEDICATIONS PRESCRIBED (Rx):
"""
    for i, line in enumerate(rx_lines, 1):
        text += f"    {i}. {line}\n"
        
    text += """
    Special Clinical Instructions:
    - Take medications as directed with meals.
    - Follow up in 4 weeks for Blood Pressure & HbA1c evaluation.
    - Maintain low sodium diet and regular moderate exercise.
    
    Treating Physician:
    Dr. Sunita Sen, MD, DM (Cardiology)
    Reg. No: WB-MC-84920
    --------------------------------------------------
    """
    page.insert_text((40, 60), text, fontsize=11, fontname="helv")
    pdf_path = os.path.join(OUTPUT_DIR, filename)
    doc.save(pdf_path)
    doc.close()
    print(f"Created PDF: {pdf_path}")
    return pdf_path

def make_image_doc(filename, patient_name, age, gender, date, rx_lines, diagnosis="Seasonal Bronchitis", fmt="PNG", is_scanned=False):
    width, height = 1200, 1600
    img = Image.new("RGB", (width, height), color=(255, 255, 255) if not is_scanned else (248, 246, 240))
    draw = ImageDraw.Draw(img)
    
    # Try default or standard font
    # Draw header
    draw.rectangle([(40, 40), (1160, 150)], fill=(235, 245, 255) if not is_scanned else (230, 230, 225), outline=(180, 200, 220), width=2)
    draw.text((60, 60), "CITY GENERAL HOSPITAL & RESEARCH INSTITUTE", fill=(20, 60, 120))
    draw.text((60, 100), "Comprehensive Health & Outpatient Prescription", fill=(70, 80, 90))
    
    draw.text((60, 180), f"Date: {date}                  Encounter ID: ENC-2026-8841", fill=(30, 30, 30))
    draw.text((60, 220), f"Patient Name: {patient_name}         Age: {age}      Gender: {gender}", fill=(30, 30, 30))
    draw.text((60, 260), "Blood Group: O+                      Known Allergies: Penicillin", fill=(30, 30, 30))
    draw.text((60, 300), f"Primary Diagnosis: {diagnosis}", fill=(180, 40, 40))
    
    draw.line([(60, 350), (1140, 350)], fill=(200, 200, 200), width=2)
    draw.text((60, 380), "PRESCRIPTION (Rx):", fill=(20, 60, 120))
    
    y = 440
    for i, line in enumerate(rx_lines, 1):
        draw.text((80, y), f"{i}. {line}", fill=(20, 20, 20))
        y += 60
        
    y += 40
    draw.line([(60, y), (1140, y)], fill=(200, 200, 200), width=2)
    y += 30
    draw.text((60, y), "Clinical Advice & Follow-up:", fill=(30, 30, 30))
    y += 40
    draw.text((80, y), "• Maintain hydration and monitor morning peak expiratory flow.", fill=(50, 50, 50))
    y += 40
    draw.text((80, y), "• Schedule follow-up visit in 3 weeks.", fill=(50, 50, 50))
    y += 100
    draw.text((700, y), "Dr. Anirban Roy, MD", fill=(20, 20, 20))
    draw.text((700, y+30), "Senior Consultant Physician", fill=(80, 80, 80))
    
    img_path = os.path.join(OUTPUT_DIR, filename)
    img.save(img_path, format=fmt)
    print(f"Created {fmt}: {img_path}")
    return img_path

def main():
    # 1. Primary Priya Sharma Rx1 (PDF)
    make_pdf("Priya_Sharma_Rx1.pdf", "Priya Sharma", "38", "Female", "2026-01-10", [
        "Amlodipine 5mg - 1 tablet once daily in the morning",
        "Telmisartan 40mg - 1 tablet once daily after breakfast",
        "Montelukast 10mg - 1 tablet once daily at bedtime"
    ])
    
    # 2. Updated Priya Sharma Rx2 (PDF)
    make_pdf("Priya_Sharma_Rx2_Updated.pdf", "Priya Sharma", "38", "Female", "2026-02-18", [
        "Telmisartan 80mg - 1 tablet once daily (Dosage increased)",
        "Amlodipine 5mg - 1 tablet once daily (Continued)",
        "Atorvastatin 10mg - 1 tablet once daily at night (Newly added)",
        "Montelukast 10mg - Discontinued"
    ], diagnosis="Essential Hypertension (Updated Regimen) & Hyperlipidemia")

    # 3. Rahul Sharma Rx (for name mismatch & 2nd patient)
    make_pdf("Rahul_Sharma_Rx.pdf", "Rahul Sharma", "44", "Male", "2026-02-05", [
        "Metformin 500mg - 1 tablet twice daily with meals",
        "Glimepiride 1mg - 1 tablet once daily before breakfast"
    ], diagnosis="Type 2 Diabetes Mellitus")

    # 4. Image formats: PNG, JPG, JPEG, WEBP, Scanned
    make_image_doc("Priya_Prescription.png", "Priya Sharma", "38", "Female", "2026-01-15", [
        "Amlodipine 5mg - 1 tablet daily",
        "Telmisartan 40mg - 1 tablet daily"
    ], fmt="PNG")

    make_image_doc("Priya_Prescription.jpg", "Priya Sharma", "38", "Female", "2026-01-15", [
        "Amlodipine 5mg - 1 tablet daily",
        "Telmisartan 40mg - 1 tablet daily"
    ], fmt="JPEG")

    make_image_doc("Priya_Prescription.jpeg", "Priya Sharma", "38", "Female", "2026-01-15", [
        "Amlodipine 5mg - 1 tablet daily",
        "Telmisartan 40mg - 1 tablet daily"
    ], fmt="JPEG")

    make_image_doc("Priya_Prescription.webp", "Priya Sharma", "38", "Female", "2026-01-15", [
        "Amlodipine 5mg - 1 tablet daily",
        "Telmisartan 40mg - 1 tablet daily"
    ], fmt="WEBP")

    make_image_doc("Priya_Scanned_Rx.png", "Priya Sharma", "38", "Female", "2026-01-20", [
        "Amlodipine 5mg - 1 tab daily (Morning)",
        "Telmisartan 40mg - 1 tab daily (Post Breakfast)",
        "Salbutamol Inhaler 100mcg - 2 puffs as needed"
    ], fmt="PNG", is_scanned=True)

if __name__ == "__main__":
    main()
