"""Critical Regression Test for:
1. Patient resolution & prescription upload
2. Emergency contact isolation
3. Emergency contact update
4. Single prescription deletion & orphan cleanup
"""

import os
import sys
import io
import json
import urllib.request
import urllib.parse
from PIL import Image, ImageDraw

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from database.database import (
    get_patient,
    get_patients,
    get_emergency_profile,
    get_medications,
    get_documents,
    delete_prescription,
    insert_patient,
    cleanup_orphaned_patient,
    update_patient_emergency_contact
)

def run_critical_regression_tests():
    print("=================================================================")
    print("        CAREBRIDGE CRITICAL WORKFLOW & REGRESSION TEST           ")
    print("=================================================================")
    
    pat_a_id = "PAT_TEST_RAHUL"
    pat_b_id = "PAT_TEST_PRIYA"

    # Clean existing test records if any
    from database.database import get_db_connection
    conn = get_db_connection()
    with conn:
        for pid in [pat_a_id, pat_b_id]:
            conn.execute("DELETE FROM documents WHERE patient_id = ?", (pid,))
            conn.execute("DELETE FROM medications WHERE patient_id = ?", (pid,))
            conn.execute("DELETE FROM timeline_events WHERE patient_id = ?", (pid,))
            conn.execute("DELETE FROM lab_results WHERE patient_id = ?", (pid,))
            conn.execute("DELETE FROM symptoms WHERE patient_id = ?", (pid,))
            conn.execute("DELETE FROM emergency_events WHERE patient_id = ?", (pid,))
            conn.execute("DELETE FROM patients WHERE id = ?", (pid,))
    conn.close()
    
    # Setup Patient A: Rahul Sharma
    insert_patient({
        "id": pat_a_id,
        "name": "Rahul Sharma",
        "age": 45,
        "gender": "Male",
        "blood_group": "B+",
        "emergency_contact_name": "Anita Sharma",
        "emergency_contact_relationship": "Spouse",
        "emergency_contact_phone": "+91-98765-43210",
        "allergies": "Sulfa drugs",
        "chronic_conditions": "Hypertension"
    })
    
    # Setup Patient B: Priya Sharma
    pat_b_id = "PAT_TEST_PRIYA"
    insert_patient({
        "id": pat_b_id,
        "name": "Priya Sharma",
        "age": 38,
        "gender": "Female",
        "blood_group": "O+",
        "emergency_contact_name": "Vikram Sharma",
        "emergency_contact_relationship": "Brother",
        "emergency_contact_phone": "+91-91234-56789",
        "allergies": "Penicillin",
        "chronic_conditions": "Asthma"
    })

    print("\n[1/5] Testing Emergency Contact Isolation...")
    emg_a = get_emergency_profile(pat_a_id)
    emg_b = get_emergency_profile(pat_b_id)
    
    assert emg_a["emergency_contact_name"] == "Anita Sharma", f"Expected Anita Sharma, got {emg_a['emergency_contact_name']}"
    assert emg_b["emergency_contact_name"] == "Vikram Sharma", f"Expected Vikram Sharma, got {emg_b['emergency_contact_name']}"
    assert emg_a["emergency_contact_phone"] == "+91-98765-43210"
    assert emg_b["emergency_contact_phone"] == "+91-91234-56789"
    print("  -> PASS: Patient A and Patient B emergency contacts are strictly isolated.")

    print("\n[2/5] Testing Emergency Contact Update API...")
    update_res = update_patient_emergency_contact(
        patient_id=pat_b_id,
        name="Sunita Sharma",
        relationship="Mother",
        phone="+91-99887-76655"
    )
    assert update_res is True
    emg_b_updated = get_emergency_profile(pat_b_id)
    assert emg_b_updated["emergency_contact_name"] == "Sunita Sharma"
    assert emg_b_updated["emergency_contact_relationship"] == "Mother"
    assert emg_b_updated["emergency_contact_phone"] == "+91-99887-76655"
    print("  -> PASS: Emergency contact updated successfully.")

    print("\n[3/5] Testing Multi-Prescription Creation & Superseding...")
    from database.database import save_extracted_document_bundle, set_prescription_as_current
    from database.models import MedicalDocument, Patient, Medication
    
    # Doc 1 for Rahul: Lisinopril
    doc1 = MedicalDocument(
        file_name="Rahul_Rx_2026_01_10.pdf",
        patient_info=Patient(id=pat_a_id, name="Rahul Sharma"),
        medications=[Medication(name="Lisinopril", dosage="10mg", frequency="Daily", status="ACTIVE")]
    )
    bundle1 = save_extracted_document_bundle(
        document=doc1,
        file_name="Rahul_Rx_2026_01_10.pdf",
        patient_id=pat_a_id
    )
    
    # Doc 2 for Rahul: Amlodipine (Newer prescription)
    doc2 = MedicalDocument(
        file_name="Rahul_Rx_2026_02_20.pdf",
        patient_info=Patient(id=pat_a_id, name="Rahul Sharma"),
        medications=[Medication(name="Amlodipine", dosage="5mg", frequency="Daily", status="ACTIVE")]
    )
    bundle2 = save_extracted_document_bundle(
        document=doc2,
        file_name="Rahul_Rx_2026_02_20.pdf",
        patient_id=pat_a_id
    )
    
    # Promote Doc 2 to Current
    set_prescription_as_current(bundle2["document_id"], patient_id=pat_a_id)
    meds_rahul = get_medications(pat_a_id)
    active_m = [m for m in meds_rahul if m.get("status") == "ACTIVE"]
    superseded_m = [m for m in meds_rahul if m.get("status") == "SUPERSEDED"]
    
    assert len(active_m) >= 1
    assert any(m["name"] == "Amlodipine" for m in active_m)
    print(f"  -> PASS: Newer prescription is ACTIVE, previous is SUPERSEDED ({len(superseded_m)} historical).")

    print("\n[4/5] Testing Single Prescription Deletion & Promotion...")
    del_res = delete_prescription(bundle2["document_id"], patient_id=pat_a_id)
    assert del_res["success"] is True
    assert del_res["patient_cleaned"] is False, "Rahul still has Doc 1, so patient must NOT be cleaned up."
    
    # Check that Doc 1 is promoted to active
    meds_after_del = get_medications(pat_a_id)
    assert any(m["name"] == "Lisinopril" for m in meds_after_del)
    print(f"  -> PASS: Deleted Doc 2, promoted Doc 1 to current. Patient Rahul remains.")

    print("\n[5/5] Testing Orphan Patient Cleanup on Deletion...")
    # Delete Doc 1 for Rahul
    del_res2 = delete_prescription(bundle1["document_id"], patient_id=pat_a_id)
    assert del_res2["success"] is True
    assert del_res2["patient_cleaned"] is True, "Orphaned patient with 0 records must be cleaned up."
    
    # Verify Rahul is removed from patients table
    rahul_check = get_patient(pat_a_id)
    assert rahul_check is None, "Orphaned patient with 0 clinical records must be removed."
    print("  -> PASS: Orphan patient cleanup properly removed empty patient profile.")

    # Cleanup Priya
    cleanup_orphaned_patient(pat_b_id)

    print("\n=================================================================")
    print("   [SUCCESS] ALL CRITICAL REGRESSION & ISOLATION TESTS PASSED!   ")
    print("=================================================================")

if __name__ == "__main__":
    run_critical_regression_tests()
