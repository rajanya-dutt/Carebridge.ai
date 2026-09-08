import os
import sys
import unittest
import io
import fitz

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from backend.main import app
from database.database import get_patient, get_all_patients, delete_patient, get_documents, init_db


def create_sample_prescription_pdf(patient_name: str, med_name: str = "Metformin 500mg") -> bytes:
    doc = fitz.open()
    page = doc.new_page()
    text = f"""
    CAREBRIDGE HEALTH CLINIC
    PRESCRIPTION RECORD
    
    Patient Name: {patient_name}
    Age: 45  Gender: Male  Date: 2026-08-22
    
    Rx:
    1. {med_name} - 1 tablet daily
    
    Dr. S. Mukherjee, MD
    """
    page.insert_text((50, 72), text, fontsize=12)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


class TestPatientUniqueness(unittest.TestCase):

    def setUp(self):
        self.client = TestClient(app)
        init_db()
        from database.database import find_patient_by_name, delete_patient
        p = find_patient_by_name("Debasish Mukherjee")
        if p:
            delete_patient(p["id"])

    def test_single_id_per_person(self):
        """Uploading multiple prescriptions for the same person maintains one single unique patient ID."""
        test_patient_name = "Debasish Mukherjee"
        
        # 1. First upload creates patient
        pdf_1 = create_sample_prescription_pdf(patient_name=test_patient_name, med_name="Amlodipine 5mg")
        resp1 = self.client.post(
            "/api/patients/create-with-document",
            data={"name": test_patient_name, "gender": "Male", "blood_group": "O+"},
            files={"file": ("rx_1.pdf", io.BytesIO(pdf_1), "application/pdf")}
        )
        self.assertEqual(resp1.status_code, 200)
        data1 = resp1.json()
        first_patient_id = data1.get("patient_id")
        self.assertIsNotNone(first_patient_id)
        
        # 2. Second upload for same person with name confirmed (e.g. from mismatch or document ingestion)
        pdf_2 = create_sample_prescription_pdf(patient_name=test_patient_name, med_name="Atorvastatin 10mg")
        resp2 = self.client.post(
            "/api/patients/create-with-document",
            data={"name": test_patient_name, "gender": "Male", "blood_group": "O+", "ignore_name_mismatch": "true"},
            files={"file": ("rx_2.pdf", io.BytesIO(pdf_2), "application/pdf")}
        )
        self.assertEqual(resp2.status_code, 200)
        data2 = resp2.json()
        second_patient_id = data2.get("patient_id")
        
        # Verify both uploads attached to the EXACT SAME patient ID
        self.assertEqual(first_patient_id, second_patient_id, "Duplicate patient ID was created for the same person!")
        
        # Verify patient has 2 documents under their single profile
        docs = get_documents(first_patient_id)
        self.assertEqual(len(docs), 2)
        print(f"[OK] Verified single patient ID ({first_patient_id}) with {len(docs)} documents.")
        
        # Clean up test records
        delete_patient(first_patient_id)


if __name__ == "__main__":
    unittest.main()
