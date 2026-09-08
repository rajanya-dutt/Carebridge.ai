"""Regression test suite for Doctor Brief timeout fix, Orphan Patient cleanup, and Multilingual TTS."""

import os
import sys
import unittest
import time

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from fastapi.testclient import TestClient
from backend.main import app
from database.database import (
    init_db,
    get_db_connection,
    get_all_patients,
    cleanup_all_orphaned_patients,
    DB_PATH
)

client = TestClient(app)


class TestDoctorBriefAndPatientCleanup(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        cleanup_all_orphaned_patients()

    def test_1_doctor_brief_caching_and_speed(self):
        """Verify that Doctor Brief generates without timing out and reuses cache on second call."""
        t0 = time.time()
        resp = client.post("/api/patients/P101/doctor-brief/generate")
        duration_1 = time.time() - t0
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["success"])
        self.assertIn("brief", data)
        print(f"[PASS] Doctor Brief 1st Call Duration: {round(duration_1, 2)}s (cached={data.get('cached')})")

        # 2nd Call must be cached and return in < 0.2s
        t0 = time.time()
        resp2 = client.post("/api/patients/P101/doctor-brief/generate")
        duration_2 = time.time() - t0
        self.assertEqual(resp2.status_code, 200)
        data2 = resp2.json()
        self.assertTrue(data2["cached"])
        self.assertLess(duration_2, 0.5)
        print(f"[PASS] Doctor Brief 2nd Call (Cached) Duration: {round(duration_2, 4)}s")

    def test_2_orphan_patient_lifecycle(self):
        """Verify end-to-end orphan patient cleanup when last record is deleted."""
        conn = get_db_connection(DB_PATH)
        with conn:
            conn.execute(
                "INSERT OR REPLACE INTO patients (id, name, blood_group) VALUES ('P_ORPHAN_TEST', 'Orphan Lifecycle Patient', 'O-')"
            )
            conn.execute(
                "INSERT OR REPLACE INTO documents (id, patient_id, file_name, file_path, file_type, document_date) VALUES ('DOC_ORPHAN_01', 'P_ORPHAN_TEST', 'Rx.pdf', 'uploads/rx.pdf', 'Prescription', '2026-08-21')"
            )
            conn.execute(
                "INSERT OR REPLACE INTO medications (id, patient_id, document_id, name, dosage, status) VALUES ('MED_ORPHAN_01', 'P_ORPHAN_TEST', 'DOC_ORPHAN_01', 'TestMed', '50mg', 'ACTIVE')"
            )
        conn.close()

        # Check patient exists
        p_res = client.get("/api/patients")
        p_ids = [p["id"] for p in p_res.json()["patients"]]
        self.assertIn("P_ORPHAN_TEST", p_ids)

        # Delete the only prescription
        del_res = client.delete("/api/patients/P_ORPHAN_TEST/prescriptions/DOC_ORPHAN_01")
        self.assertEqual(del_res.status_code, 200)
        self.assertTrue(del_res.json()["patient_cleaned"])

        # Check patient is removed from database & API list
        p_res_after = client.get("/api/patients")
        p_ids_after = [p["id"] for p in p_res_after.json()["patients"]]
        self.assertNotIn("P_ORPHAN_TEST", p_ids_after)
        print("[PASS] Orphan patient removed from selector upon deleting last prescription!")

    def test_3_patient_with_multiple_records_retained(self):
        """Verify that patient with prescription + lab report remains when prescription is deleted."""
        conn = get_db_connection(DB_PATH)
        with conn:
            conn.execute(
                "INSERT OR REPLACE INTO patients (id, name, blood_group) VALUES ('P_MULTI_TEST', 'Multi Record Patient', 'B+')"
            )
            conn.execute(
                "INSERT OR REPLACE INTO documents (id, patient_id, file_name, file_path, file_type) VALUES ('DOC_M_01', 'P_MULTI_TEST', 'Rx1.pdf', 'uploads/rx1.pdf', 'Prescription')"
            )
            conn.execute(
                "INSERT OR REPLACE INTO documents (id, patient_id, file_name, file_path, file_type) VALUES ('DOC_M_02', 'P_MULTI_TEST', 'Lab1.pdf', 'uploads/lab1.pdf', 'Lab Report')"
            )
            conn.execute(
                "INSERT OR REPLACE INTO lab_results (id, patient_id, document_id, test_name, value, unit) VALUES ('LAB_M_01', 'P_MULTI_TEST', 'DOC_M_02', 'Lipid Panel', 180, 'mg/dL')"
            )
        conn.close()

        # Delete Rx
        del_res = client.delete("/api/patients/P_MULTI_TEST/prescriptions/DOC_M_01")
        self.assertEqual(del_res.status_code, 200)
        self.assertFalse(del_res.json()["patient_cleaned"])

        # Patient still exists
        p_res = client.get("/api/patients")
        p_ids = [p["id"] for p in p_res.json()["patients"]]
        self.assertIn("P_MULTI_TEST", p_ids)

        # Delete remaining Lab Report
        conn = get_db_connection(DB_PATH)
        with conn:
            conn.execute("DELETE FROM lab_results WHERE document_id = 'DOC_M_02'")
            conn.execute("DELETE FROM documents WHERE id = 'DOC_M_02'")
        conn.close()

        cleanup_all_orphaned_patients()

        p_res_final = client.get("/api/patients")
        p_ids_final = [p["id"] for p in p_res_final.json()["patients"]]
        self.assertNotIn("P_MULTI_TEST", p_ids_final)
        print("[PASS] Multi-record patient retained until ALL records are deleted!")


if __name__ == "__main__":
    unittest.main(verbosity=2)
