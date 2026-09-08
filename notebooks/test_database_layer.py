"""Unit tests for CAREBRIDGE SQLite Database Layer.
Tests initialization, parameterized inserts, queries, transactions, and Pydantic integration.
"""

import os
import tempfile
from database.database import (
    init_db,
    insert_patient,
    insert_medical_document,
    insert_lab_result,
    insert_medication,
    insert_symptom,
    insert_timeline_event,
    get_patient,
    get_patients,
    get_documents,
    get_lab_results,
    get_medications,
    get_symptoms,
    get_timeline,
    save_extracted_document_bundle
)
from database.models import (
    Patient,
    MedicalDocument,
    LabResult,
    Medication,
    Symptom,
    TimelineEvent
)


def run_database_tests():
    # Use an isolated test database in temp directory
    temp_dir = tempfile.mkdtemp()
    test_db = os.path.join(temp_dir, "test_carebridge.db")

    try:
        # 1. Test init_db
        init_db(test_db)
        patient = get_patient("P101", db_path=test_db)
        assert patient is not None, "Seeded demo patient P101 should exist."
        assert patient["name"] == "Eleanor Vance (Synthetic Demo)"
        print("[OK] Database initialization and seed completed.")

        # 2. Test insert_patient
        p2 = Patient(
            id="P202",
            name="Robert Chen",
            age=62,
            gender="Male",
            blood_group="O+",
            allergies=["Aspirin", "Iodine contrast"],
            chronic_conditions=["Coronary Artery Disease"]
        )
        p2_id = insert_patient(p2, db_path=test_db)
        assert p2_id == "P202"
        fetched_p2 = get_patient("P202", db_path=test_db)
        assert fetched_p2["name"] == "Robert Chen"
        assert "Aspirin" in fetched_p2["allergies"]
        print("[OK] insert_patient and get_patient verified.")

        # 3. Test insert_medical_document
        doc_payload = {
            "id": "DOC_TEST_1",
            "file_name": "lab_report_2026.pdf",
            "document_type": "Lab Report",
            "document_date": "2026-02-10",
            "extracted_text": "Sample text",
            "file_path": "data/uploads/lab_report_2026.pdf"
        }
        doc_id = insert_medical_document(doc_payload, patient_id="P202", db_path=test_db)
        assert doc_id == "DOC_TEST_1"
        docs = get_documents("P202", db_path=test_db)
        assert len(docs) == 1
        assert docs[0]["file_name"] == "lab_report_2026.pdf"
        print("[OK] insert_medical_document and get_documents verified.")

        # 4. Test insert_lab_result
        lab = LabResult(
            test_name="Troponin I",
            category="Cardiac",
            value=0.02,
            unit="ng/mL",
            reference_range="< 0.04",
            flag="NORMAL",
            date="2026-02-10"
        )
        lab_id = insert_lab_result(lab, patient_id="P202", document_id=doc_id, db_path=test_db)
        assert lab_id is not None
        labs = get_lab_results("P202", db_path=test_db)
        assert len(labs) == 1
        assert labs[0]["test_name"] == "Troponin I"
        assert labs[0]["value"] == 0.02

        filtered_labs = get_lab_results("P202", test_name="Troponin I", db_path=test_db)
        assert len(filtered_labs) == 1
        print("[OK] insert_lab_result and get_lab_results verified.")

        # 5. Test insert_medication
        med = Medication(
            name="Clopidogrel",
            dosage="75 mg",
            frequency="Once daily",
            route="Oral",
            purpose="Antiplatelet therapy",
            start_date="2026-02-10",
            status="ACTIVE"
        )
        med_id = insert_medication(med, patient_id="P202", document_id=doc_id, db_path=test_db)
        assert med_id is not None
        meds = get_medications("P202", status="ACTIVE", db_path=test_db)
        assert len(meds) == 1
        assert meds[0]["name"] == "Clopidogrel"
        print("[OK] insert_medication and get_medications verified.")

        # 6. Test insert_symptom
        sym = Symptom(
            symptom="Mild exertional chest tightness",
            severity="MILD",
            onset_date="2026-02-08",
            status="CURRENT",
            notes="Resolved upon rest"
        )
        sym_id = insert_symptom(sym, patient_id="P202", document_id=doc_id, db_path=test_db)
        assert sym_id is not None
        symptoms = get_symptoms("P202", db_path=test_db)
        assert len(symptoms) == 1
        assert symptoms[0]["symptom"] == "Mild exertional chest tightness"
        print("[OK] insert_symptom and get_symptoms verified.")

        # 7. Test insert_timeline_event
        evt = TimelineEvent(
            event_date="2026-02-10",
            category="Cardiology Follow-up",
            title="Cardiology Post-Procedure Evaluation",
            description="Patient asymptomatic at rest, vitals normal."
        )
        evt_id = insert_timeline_event(evt, patient_id="P202", document_id=doc_id, db_path=test_db)
        assert evt_id is not None
        events = get_timeline("P202", db_path=test_db)
        assert len(events) == 1
        assert events[0]["title"] == "Cardiology Post-Procedure Evaluation"
        print("[OK] insert_timeline_event and get_timeline verified.")

        # 8. Test save_extracted_document_bundle (Transactional Multi-table insert)
        bundle_doc = MedicalDocument(
            document_type="Discharge Summary",
            document_date="2026-02-15",
            patient_info=Patient(id="P303", name="Alice Morgan", age=45, gender="Female"),
            laboratory_results=[
                LabResult(test_name="Hemoglobin", value=13.5, unit="g/dL", flag="NORMAL", date="2026-02-15"),
                LabResult(test_name="Platelets", value=250.0, unit="x10^3/uL", flag="NORMAL", date="2026-02-15")
            ],
            medications=[
                Medication(name="Amoxicillin", dosage="500 mg", frequency="3x daily", status="ACTIVE")
            ],
            symptoms=[
                Symptom(symptom="Cough", severity="MILD", status="RESOLVING")
            ],
            summary="Discharged in stable condition."
        )
        bundle_res = save_extracted_document_bundle(
            document=bundle_doc,
            file_name="discharge_alice.pdf",
            patient_id="P303",
            db_path=test_db
        )
        assert bundle_res["labs_count"] == 2
        assert bundle_res["medications_count"] == 1
        assert bundle_res["symptoms_count"] == 1
        alice_pat = get_patient("P303", db_path=test_db)
        assert alice_pat["name"] == "Alice Morgan"
        assert len(get_lab_results("P303", db_path=test_db)) == 2
        assert len(get_timeline("P303", db_path=test_db)) == 1
        print("[OK] save_extracted_document_bundle transactional insert verified.")

        print("\nALL DATABASE LAYER TESTS PASSED SUCCESSFULLY!")

    finally:
        # Clean up temporary test db
        try:
            if os.path.exists(test_db):
                os.remove(test_db)
            os.rmdir(temp_dir)
        except Exception:
            pass


if __name__ == "__main__":
    run_database_tests()
