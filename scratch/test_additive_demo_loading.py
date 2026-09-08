"""Rigorous test suite verifying that Loading Demo Patient is ADDITIVE and NEVER deletes existing patients."""

import sys
import os
import io
import time

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from database.database import (
    get_db_connection,
    get_patient,
    get_all_patients,
    get_documents,
    get_medications,
    get_lab_results,
    get_timeline,
    delete_patient
)
from ai.workflow import IngestionWorkflow
from data.demo_data import load_demo_patient, DEMO_PATIENT_ID
from PIL import Image, ImageDraw


def create_test_prescription_bytes(patient_name: str, drug: str = "Amoxicillin 500mg") -> bytes:
    """Creates synthetic prescription image."""
    img = Image.new("RGB", (800, 600), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    draw.text((40, 40), f"CLINICAL PRESCRIPTION\nDate: 2026-08-20\nPatient Name: {patient_name}\nAge: 38 Gender: Female\n\nRx:\n1. {drug} - 1 tablet twice daily for 5 days\n\nDr. S. Roy, MD", fill=(0, 0, 0))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=95)
    return buf.getvalue()


def run_additive_demo_tests():
    print("=================================================================")
    print("   CAREBRIDGE — ADDITIVE NON-DESTRUCTIVE DEMO LOADING TEST       ")
    print("=================================================================")

    # 1. Clean slate for testing
    conn = get_db_connection()
    with conn:
        conn.execute("DELETE FROM documents")
        conn.execute("DELETE FROM medications")
        conn.execute("DELETE FROM timeline_events")
        conn.execute("DELETE FROM lab_results")
        conn.execute("DELETE FROM symptoms")
        conn.execute("DELETE FROM emergency_events")
        conn.execute("DELETE FROM patients")
    conn.close()

    workflow = IngestionWorkflow()

    # -----------------------------------------------------------------
    # STEP 1: Upload real patient 1 (Priya Sharma)
    # -----------------------------------------------------------------
    print("\n[STEP 1] Ingesting prescription for real patient 'Priya Sharma'...")
    priya_bytes = create_test_prescription_bytes("Priya Sharma", "Amoxicillin 500mg")
    res_priya = workflow.process_and_persist_document(
        pdf_input=priya_bytes,
        file_name="Priya_Rx.jpg",
        patient_id=None
    )
    assert res_priya["success"] is True
    
    pats = get_all_patients()
    assert len(pats) == 1
    assert pats[0]["name"] == "Priya Sharma"
    priya_id = pats[0]["id"]
    print(f"  -> OK: Priya Sharma created with ID {priya_id}.")

    # -----------------------------------------------------------------
    # STEP 2: Upload real patient 2 (Rahul Sharma)
    # -----------------------------------------------------------------
    print("\n[STEP 2] Ingesting prescription for real patient 'Rahul Sharma'...")
    rahul_bytes = create_test_prescription_bytes("Rahul Sharma", "Metformin 500mg")
    res_rahul = workflow.process_and_persist_document(
        pdf_input=rahul_bytes,
        file_name="Rahul_Rx.jpg",
        patient_id=None
    )
    assert res_rahul["success"] is True
    
    pats = get_all_patients()
    assert len(pats) == 2
    pat_names = sorted([p["name"] for p in pats])
    assert pat_names == ["Priya Sharma", "Rahul Sharma"]
    rahul_id = [p["id"] for p in pats if p["name"] == "Rahul Sharma"][0]
    print(f"  -> OK: Both Priya and Rahul exist in database: {pat_names}.")

    # -----------------------------------------------------------------
    # STEP 3: Click "Load Demo Patient" (Must be ADDITIVE!)
    # -----------------------------------------------------------------
    print("\n[STEP 3] Loading Demo Patient Data (calling load_demo_patient)...")
    demo_res = load_demo_patient()
    assert demo_res["success"] is True
    assert demo_res["patient_id"] == DEMO_PATIENT_ID

    pats_after_demo = get_all_patients()
    print(f"  -> Patient count after loading demo: {len(pats_after_demo)}")
    all_names = [p["name"] for p in pats_after_demo]
    print(f"  -> Patients in DB: {all_names}")

    # HARD REQUIREMENT VERIFICATION
    assert len(pats_after_demo) == 3, f"Expected 3 patients, but found {len(pats_after_demo)}: {all_names}"
    assert "Priya Sharma" in all_names, "CRITICAL ERROR: Priya Sharma was removed by demo loading!"
    assert "Rahul Sharma" in all_names, "CRITICAL ERROR: Rahul Sharma was removed by demo loading!"
    assert any("Demo" in name for name in all_names), "CRITICAL ERROR: Demo patient was not added!"

    # Verify Priya's data was completely preserved
    priya_docs = get_documents(priya_id)
    assert len(priya_docs) >= 1, "Priya documents were deleted!"
    priya_meds = get_medications(priya_id)
    assert len(priya_meds) >= 1, "Priya medications were deleted!"

    # Verify Demo patient has full longitudinal dataset
    demo_docs = get_documents(DEMO_PATIENT_ID)
    assert len(demo_docs) == 5, f"Demo should have 5 documents, got {len(demo_docs)}"
    demo_labs = get_lab_results(DEMO_PATIENT_ID)
    assert len(demo_labs) >= 15, f"Demo should have multiple lab readings, got {len(demo_labs)}"

    print("  -> PASS: All 3 patients (Priya, Rahul, Demo) exist simultaneously without data corruption.")

    # -----------------------------------------------------------------
    # STEP 4: Idempotent Demo Loading (Click Load Demo again)
    # -----------------------------------------------------------------
    print("\n[STEP 4] Clicking 'Load Demo Patient' multiple times (Idempotency test)...")
    load_demo_patient()
    load_demo_patient()
    
    pats_idempotent = get_all_patients()
    assert len(pats_idempotent) == 3, f"Expected exactly 3 patients after multiple demo loads, got {len(pats_idempotent)}"
    print(f"  -> PASS: Exactly 3 patients remain after repeated demo loads ({[p['name'] for p in pats_idempotent]}).")

    # -----------------------------------------------------------------
    # STEP 5: Delete Rahul Sharma explicitly
    # -----------------------------------------------------------------
    print(f"\n[STEP 5] Explicitly deleting patient 'Rahul Sharma' (ID: {rahul_id})...")
    del_res = delete_patient(rahul_id)
    assert del_res["success"] is True

    pats_after_del = get_all_patients()
    assert len(pats_after_del) == 2
    del_names = [p["name"] for p in pats_after_del]
    assert "Priya Sharma" in del_names
    assert any("Demo" in n for n in del_names)
    assert "Rahul Sharma" not in del_names
    print(f"  -> PASS: Rahul deleted. Priya and Demo remain ({del_names}).")

    # -----------------------------------------------------------------
    # STEP 6: Delete Demo Patient explicitly
    # -----------------------------------------------------------------
    print(f"\n[STEP 6] Explicitly deleting Demo Patient (ID: {DEMO_PATIENT_ID})...")
    del_demo = delete_patient(DEMO_PATIENT_ID)
    assert del_demo["success"] is True

    pats_only_priya = get_all_patients()
    assert len(pats_only_priya) == 1
    assert pats_only_priya[0]["name"] == "Priya Sharma"
    print(f"  -> PASS: Demo deleted. Only Priya remains ({[p['name'] for p in pats_only_priya]}).")

    # -----------------------------------------------------------------
    # STEP 7: Re-load Demo Patient
    # -----------------------------------------------------------------
    print("\n[STEP 7] Re-loading Demo Patient after deletion...")
    load_demo_patient()
    pats_reloaded = get_all_patients()
    assert len(pats_reloaded) == 2
    reloaded_names = [p["name"] for p in pats_reloaded]
    assert "Priya Sharma" in reloaded_names
    assert any("Demo" in n for n in reloaded_names)
    print(f"  -> PASS: Re-loading demo adds demo back without affecting Priya ({reloaded_names}).")

    print("\n=================================================================")
    print("   [SUCCESS] ALL ADDITIVE DEMO LOADING TESTS PASSED 100%!        ")
    print("=================================================================")


if __name__ == "__main__":
    run_additive_demo_tests()
