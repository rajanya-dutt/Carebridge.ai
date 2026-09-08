"""Unit tests for the CAREBRIDGE Demo Mode and Synthetic Patient Generator.
Tests PDF creation, SQLite population, multi-year laboratory measurements, medication changes, and Doctor Brief synthesis.
"""

import os
from data.demo_data import generate_synthetic_pdfs, load_demo_patient
from database.database import (
    get_patient,
    get_documents,
    get_lab_results,
    get_medications,
    get_symptoms,
    get_timeline
)
from components.dashboard import compute_informational_shifts
from components.doctor_brief import prepare_brief_data_bundle
from ai.ai_engine import AIEngine


def test_demo_mode():
    print("--- Starting Demo Mode Synthetic Patient Verification ---")

    # 1. Test Demo Loader Execution
    result = load_demo_patient()
    assert result["success"] is True
    assert result["documents_count"] == 5
    assert result["lab_results_count"] >= 20
    assert result["medications_count"] >= 4
    assert result["symptoms_count"] >= 3
    assert result["timeline_events_count"] == 5
    print("[OK] load_demo_patient successfully populated SQLite database.")

    # 2. Verify Generated PDF Files on disk
    docs = get_documents("P101")
    assert len(docs) == 5
    for d in docs:
        f_path = d.get("file_path")
        assert f_path and os.path.exists(f_path), f"PDF file should exist at: {f_path}"
    print(f"[OK] Verified 5 physical synthetic PDF files on disk in data/uploads/.")

    # 3. Verify Repeated Laboratory Measurements & Multi-Date Trajectory
    labs = get_lab_results("P101")
    hba1c_readings = [l for l in labs if l["test_name"] == "HbA1c"]
    assert len(hba1c_readings) >= 4, "HbA1c must have at least 4 longitudinal timepoints."
    
    # Check that HbA1c values decline from baseline 7.8 down to 6.2
    assert hba1c_readings[0]["value"] == 7.8
    assert hba1c_readings[-1]["value"] == 6.2
    print(f"[OK] HbA1c trajectory verified across 4 timepoints: {[r['value'] for r in hba1c_readings]}")

    # 4. Verify Calculated Biomarker Shifts
    shifts = compute_informational_shifts(labs)
    assert len(shifts) >= 3, "Should compute shifts for HbA1c, Cholesterol, Glucose, BP, etc."
    print(f"[OK] Computed {len(shifts)} active biomarker shifts.")

    # 5. Verify Medications
    meds = get_medications("P101")
    active_meds = [m for m in meds if m.get("status") == "ACTIVE"]
    disc_meds = [m for m in meds if m.get("status") == "DISCONTINUED"]
    assert len(active_meds) >= 3, "Should have active prescriptions."
    assert len(disc_meds) >= 1, "Should have documented discontinued medication."
    print(f"[OK] Medications verified: {len(active_meds)} active, {len(disc_meds)} discontinued.")

    # 6. Verify Symptoms & Timeline
    symptoms = get_symptoms("P101")
    timeline = get_timeline("P101")
    assert len(symptoms) >= 3
    assert len(timeline) == 5
    print(f"[OK] Verified {len(symptoms)} symptoms and {len(timeline)} timeline events.")

    # 7. Verify Doctor Brief Generation Capability
    bundle = prepare_brief_data_bundle("P101")
    assert bundle["patient_profile"]["name"] == "Eleanor Vance (Synthetic Demo)"
    assert len(bundle["important_documents"]) == 5
    print("[OK] Demo Patient contains complete clinical history ready for Doctor Brief generation.")

    print("\nALL DEMO MODE INTEGRATION TESTS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    test_demo_mode()
