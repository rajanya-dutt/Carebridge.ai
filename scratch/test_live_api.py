"""Comprehensive HTTP API test against the live FastAPI server."""

import urllib.request
import urllib.parse
import json

BASE_URL = "http://localhost:8000/api"

def test_api():
    print("Testing live FastAPI endpoints at", BASE_URL)
    
    # 1. Health Check
    req = urllib.request.urlopen(f"{BASE_URL}/health")
    data = json.loads(req.read().decode())
    print("Health:", data)
    assert data["status"] == "healthy"
    
    # 2. Patients list
    req = urllib.request.urlopen(f"{BASE_URL}/patients")
    data = json.loads(req.read().decode())
    patients = data.get("patients", [])
    print(f"Patients count: {len(patients)} (First: {patients[0]['name'] if patients else 'None'})")
    assert len(patients) > 0
    
    pat_id = urllib.parse.quote(str(patients[0]["id"]), safe='')
    
    # 3. Patient Details
    req = urllib.request.urlopen(f"{BASE_URL}/patients/{pat_id}")
    data = json.loads(req.read().decode())
    print("Patient Details Success:", data.get("success"))
    
    # 4. Documents
    req = urllib.request.urlopen(f"{BASE_URL}/patients/{pat_id}/documents")
    data = json.loads(req.read().decode())
    print("Documents Count:", len(data.get("documents", [])))
    
    # 5. Timeline
    req = urllib.request.urlopen(f"{BASE_URL}/patients/{pat_id}/timeline")
    data = json.loads(req.read().decode())
    print("Timeline Events Count:", len(data.get("timeline", [])))
    
    # 6. Trends
    req = urllib.request.urlopen(f"{BASE_URL}/patients/{pat_id}/trends")
    data = json.loads(req.read().decode())
    print("Biomarker Shifts Count:", len(data.get("shifts", [])))
    
    # 7. Medications
    req = urllib.request.urlopen(f"{BASE_URL}/patients/{pat_id}/medications")
    data = json.loads(req.read().decode())
    print("Active Medications:", len(data.get("active_medications", [])))
    
    # 8. Languages
    req = urllib.request.urlopen(f"{BASE_URL}/languages")
    data = json.loads(req.read().decode())
    print("Supported Languages Count:", len(data.get("languages", {})))
    
    # 9. Emergency
    req = urllib.request.urlopen(f"{BASE_URL}/patients/{pat_id}/emergency")
    data = json.loads(req.read().decode())
    print("Emergency Profile Blood:", data.get("profile", {}).get("blood_group"))
    
    print("\n[ALL LIVE FASTAPI HTTP ENDPOINT TESTS PASSED SUCCESSFULLY!]")

if __name__ == "__main__":
    test_api()
