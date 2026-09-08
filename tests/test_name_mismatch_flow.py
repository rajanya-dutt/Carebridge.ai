import os
import sys
import unittest
import io
import fitz  # PyMuPDF

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from backend.main import app
from database.database import get_patient, get_all_patients, delete_patient, init_db


def create_sample_prescription_pdf(patient_name: str, med_name: str = "Metformin 500mg") -> bytes:
    doc = fitz.open()
    page = doc.new_page()
    text = f"""
    CAREBRIDGE HEALTH CLINIC
    PRESCRIPTION RECORD
    
    Patient Name: {patient_name}
    Age: 42  Gender: Male  Date: 2026-08-20
    
    Rx:
    1. {med_name} - 1 tablet twice daily with meals
    2. Atorvastatin 20mg - 1 tablet at bedtime
    
    Dr. S. Mukherjee, MD
    """
    page.insert_text((50, 72), text, fontsize=12)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


class TestNameMismatchFlow(unittest.TestCase):

    def setUp(self):
        self.client = TestClient(app)
        init_db()

    def test_name_mismatch_detected_before_db_write(self):
        """When form name differs from prescription name, return 409 NAME_MISMATCH without saving to DB."""
        pdf_bytes = create_sample_prescription_pdf(patient_name="Rahul Sharma")
        
        initial_patients = {p["id"]: p["name"] for p in get_all_patients()}
        
        # User enters "Priya Sharma" but document contains "Rahul Sharma"
        response = self.client.post(
            "/api/patients/create-with-document",
            data={"name": "Priya Sharma", "gender": "Female", "blood_group": "B+"},
            files={"file": ("prescription_rahul.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
        )
        
        self.assertEqual(response.status_code, 409)
        data = response.json()
        self.assertEqual(data.get("error_type"), "NAME_MISMATCH")
        self.assertEqual(data.get("entered_name"), "Priya Sharma")
        self.assertIn("Rahul", data.get("document_patient_name"))
        
        # Verify ZERO database writes occurred
        current_patients = {p["id"]: p["name"] for p in get_all_patients()}
        self.assertEqual(len(current_patients), len(initial_patients))
        self.assertNotIn("Priya Sharma", current_patients.values())
        self.assertNotIn("Rahul Sharma", current_patients.values())
        print("[OK] Name mismatch detected with zero database writes.")

    def test_name_correction_flow(self):
        """When user accepts the extracted name, patient is created cleanly with corrected name."""
        pdf_bytes = create_sample_prescription_pdf(patient_name="Rahul Sharma")
        
        # User submits with corrected name
        response = self.client.post(
            "/api/patients/create-with-document",
            data={"name": "Rahul Sharma", "gender": "Male", "blood_group": "A+", "ignore_name_mismatch": "true"},
            files={"file": ("prescription_rahul.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
        )
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data.get("success"))
        created_id = data.get("patient_id")
        self.assertIsNotNone(created_id)
        
        # Verify patient exists in DB with corrected name
        patient = get_patient(created_id)
        self.assertIsNotNone(patient)
        self.assertEqual(patient["name"], "Rahul Sharma")
        print(f"[OK] Patient created cleanly with corrected name: {patient['name']} (ID: {created_id})")
        
        # Cleanup
        delete_patient(created_id)


if __name__ == "__main__":
    unittest.main()
