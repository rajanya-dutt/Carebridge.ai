"""End-to-end verification script for CAREBRIDGE FastAPI & React servers."""

import urllib.request
import json

def verify_live_servers():
    print("--- 1. Testing FastAPI Backend (http://localhost:8000/api/health) ---")
    try:
        req = urllib.request.Request("http://localhost:8000/api/health")
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode('utf-8'))
            print("FastAPI Response:", data)
            assert data["status"] == "healthy"
            print("[PASS] FastAPI Backend is HEALTHY and OPERATIONAL!")
    except Exception as e:
        print("[FAIL] FastAPI check failed:", e)

    print("\n--- 2. Testing React Frontend (http://localhost:3000/) ---")
    try:
        req = urllib.request.Request("http://localhost:3000/")
        with urllib.request.urlopen(req, timeout=5) as response:
            html = response.read().decode('utf-8')
            assert "<title>CAREBRIDGE" in html
            print("[PASS] React Server HTML received with title CAREBRIDGE!")
            print("[PASS] CAREBRIDGE React Frontend is LIVE on http://localhost:3000 !")
    except Exception as e:
        print("[FAIL] React check failed:", e)

if __name__ == "__main__":
    verify_live_servers()
