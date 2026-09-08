"""Test suite for CAREBRIDGE FastAPI Backend Endpoints."""

import os
import sys
import unittest

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from fastapi.testclient import TestClient
from backend.main import app
from database.database import init_db

client = TestClient(app)


class TestFastAPIEndpoints(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()

    def test_health_check(self):
        resp = client.get("/api/health")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["status"], "healthy")
        print("[PASS] GET /api/health")

    def test_patients_endpoints(self):
        resp = client.get("/api/patients")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["success"])
        self.assertGreaterEqual(len(data["patients"]), 1)
        print(f"[PASS] GET /api/patients: {len(data['patients'])} patients found")

        # Patient Profile & Dashboard Stats
        resp2 = client.get("/api/patients/P101")
        self.assertEqual(resp2.status_code, 200)
        self.assertEqual(resp2.json()["patient"]["id"], "P101")

        resp3 = client.get("/api/patients/P101/dashboard-stats")
        self.assertEqual(resp3.status_code, 200)
        self.assertIn("stats", resp3.json())
        print("[PASS] GET /api/patients/P101 & dashboard-stats")

    def test_timeline_endpoint(self):
        resp = client.get("/api/patients/P101/timeline")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["success"])
        print(f"[PASS] GET /api/patients/P101/timeline: {len(data['timeline'])} events")

    def test_trends_endpoint(self):
        resp = client.get("/api/patients/P101/trends")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["success"])
        self.assertIn("shifts", data)
        self.assertIn("trajectory_data", data)
        print(f"[PASS] GET /api/patients/P101/trends: {len(data['labs'])} labs, {len(data['shifts'])} shifts")

    def test_medications_endpoint(self):
        resp = client.get("/api/patients/P101/medications")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["success"])
        self.assertIn("active_medications", data)
        print(f"[PASS] GET /api/patients/P101/medications: {len(data['active_medications'])} active")

    def test_doctor_brief_endpoint(self):
        resp = client.get("/api/patients/P101/doctor-brief")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["success"])
        self.assertIn("data_bundle", data)
        print("[PASS] GET /api/patients/P101/doctor-brief data bundle")

    def test_languages_and_tts(self):
        resp = client.get("/api/languages")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(len(data["languages"]), 11)
        print(f"[PASS] GET /api/languages: 11 languages verified")

        # Test Bengali TTS via API
        tts_payload = {
            "text": "আপনার রক্তচাপ স্বাভাবিক রয়েছে।",
            "target_language_key": "বাংলা / Bengali"
        }
        resp_tts = client.post("/api/patients/P101/tts", json=tts_payload)
        self.assertEqual(resp_tts.status_code, 200)
        tts_data = resp_tts.json()
        self.assertTrue(tts_data["success"])
        self.assertGreater(len(tts_data["audio_base64"]), 1000)
        print(f"[PASS] POST /api/patients/P101/tts (Bengali Audio Size: {tts_data['audio_size_bytes']} bytes)")

    def test_emergency_endpoints(self):
        resp = client.get("/api/patients/P101/emergency")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["success"])
        self.assertIn("profile", data)
        print("[PASS] GET /api/patients/P101/emergency")

        # Log emergency event
        loc_payload = {
            "latitude": 28.6139,
            "longitude": 77.2090,
            "accuracy": 15.0,
            "status": "ACQUIRED",
            "action": "API Test Emergency Dispatch"
        }
        resp_loc = client.post("/api/patients/P101/emergency/location", json=loc_payload)
        self.assertEqual(resp_loc.status_code, 200)
        print("[PASS] POST /api/patients/P101/emergency/location")


if __name__ == "__main__":
    unittest.main(verbosity=2)
