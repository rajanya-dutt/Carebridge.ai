"""Test suite for Patient Cleanup on Deletion & Multilingual Full-Text TTS."""

import os
import sys
import unittest
import json

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from fastapi.testclient import TestClient
from backend.main import app
from database.database import (
    init_db,
    insert_patient,
    get_db_connection,
    get_all_patients,
    DB_PATH
)

client = TestClient(app)


class TestPatientCleanupAndTTS(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()

    def test_orphan_patient_cleanup_on_delete(self):
        """Verify that when a patient's only document/prescription is deleted,
        the orphaned patient is cleanly removed from the database."""
        conn = get_db_connection(DB_PATH)
        with conn:
            # Create a temporary single-document patient
            conn.execute(
                "INSERT OR REPLACE INTO patients (id, name, blood_group) VALUES ('P_TEMP_01', 'Temporary Patient', 'B+')"
            )
            conn.execute(
                "INSERT OR REPLACE INTO documents (id, patient_id, file_name, file_path, file_type, document_date) VALUES ('DOC_TEMP_01', 'P_TEMP_01', 'Temp_Rx.pdf', 'uploads/temp.pdf', 'Prescription', '2026-08-21')"
            )
            conn.execute(
                "INSERT OR REPLACE INTO medications (id, patient_id, document_id, name, dosage, status) VALUES ('MED_TEMP_01', 'P_TEMP_01', 'DOC_TEMP_01', 'Temp Drug', '10mg', 'ACTIVE')"
            )
        conn.close()

        # 1. Verify patient exists in API
        resp = client.get("/api/patients")
        self.assertEqual(resp.status_code, 200)
        p_ids = [p["id"] for p in resp.json()["patients"]]
        self.assertIn("P_TEMP_01", p_ids)

        # 2. Delete the prescription
        del_resp = client.delete("/api/patients/P_TEMP_01/prescriptions/DOC_TEMP_01")
        self.assertEqual(del_resp.status_code, 200)
        del_data = del_resp.json()
        self.assertTrue(del_data["success"])
        self.assertTrue(del_data["patient_cleaned"])

        # 3. Verify patient NO LONGER exists in patient selector/API
        resp_after = client.get("/api/patients")
        p_ids_after = [p["id"] for p in resp_after.json()["patients"]]
        self.assertNotIn("P_TEMP_01", p_ids_after)
        print("[PASS] Orphaned patient cleanup on prescription deletion verified!")

    def test_patient_with_multiple_records_retained(self):
        """Verify that a patient with remaining records is NOT deleted when one prescription is removed."""
        conn = get_db_connection(DB_PATH)
        with conn:
            conn.execute(
                "INSERT OR REPLACE INTO patients (id, name, blood_group) VALUES ('P_MULTI_01', 'Multi Record Patient', 'AB+')"
            )
            conn.execute(
                "INSERT OR REPLACE INTO documents (id, patient_id, file_name, file_path, file_type) VALUES ('DOC_M_01', 'P_MULTI_01', 'Prescription_1.pdf', 'uploads/p1.pdf', 'Prescription')"
            )
            conn.execute(
                "INSERT OR REPLACE INTO documents (id, patient_id, file_name, file_path, file_type) VALUES ('DOC_M_02', 'P_MULTI_01', 'Blood_Report.pdf', 'uploads/p2.pdf', 'Lab Report')"
            )
            conn.execute(
                "INSERT OR REPLACE INTO lab_results (id, patient_id, document_id, test_name, value, unit) VALUES ('LAB_M_01', 'P_MULTI_01', 'DOC_M_02', 'Hemoglobin', 14.2, 'g/dL')"
            )
        conn.close()

        # Delete prescription 1
        del_resp = client.delete("/api/patients/P_MULTI_01/prescriptions/DOC_M_01")
        self.assertEqual(del_resp.status_code, 200)
        del_data = del_resp.json()
        self.assertTrue(del_data["success"])
        self.assertFalse(del_data["patient_cleaned"])  # Should NOT be cleaned because Blood_Report exists!

        # Patient still exists
        resp_after = client.get("/api/patients/P_MULTI_01")
        self.assertEqual(resp_after.status_code, 200)
        print("[PASS] Patient with remaining records retained correctly!")

    def test_multilingual_full_narration_tts(self):
        """Verify full-length TTS generation for long texts across languages."""
        long_bengali_text = (
            "আপনার উচ্চ রক্তচাপ এবং ডায়াবেটিসের জন্য ডাক্তারের নির্দেশিত ওষুধগুলি নিয়মিত সময়মতো গ্রহণ করতে হবে। "
            "মেটফর্মিন এবং টেলমিসারটান প্রতিদিন সকালে খাবারের পর খাবেন। কোনো ওষুধ নিজে থেকে বন্ধ করবেন না। "
            "নিয়মিত রক্তচাপ ও গ্লুকোজ পরীক্ষা করুন এবং পরবর্তী স্বাস্থ্য পরীক্ষায় অংশ নিন।"
        )

        resp = client.post("/api/patients/P101/tts", json={
            "text": long_bengali_text,
            "target_language_key": "বাংলা / Bengali"
        })
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["success"])
        self.assertGreater(data["audio_size_bytes"], 10000)
        self.assertEqual(data["language"]["gtts_code"], "bn")

        # Test caching on second request
        resp2 = client.post("/api/patients/P101/tts", json={
            "text": long_bengali_text,
            "target_language_key": "বাংলা / Bengali"
        })
        self.assertEqual(resp2.status_code, 200)
        self.assertTrue(resp2.json()["cached"])
        print(f"[PASS] Multilingual Full-Text Bengali TTS (Size: {data['audio_size_bytes']} bytes, Chunks: {data['chunks_count']}, Cached: True)")


if __name__ == "__main__":
    unittest.main(verbosity=2)
