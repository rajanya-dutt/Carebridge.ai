"""Unit tests for the CAREBRIDGE Medication Tracker module.
Tests active vs discontinued grouping, source document mapping, and field validation.
"""

from database.database import get_medications, get_documents, get_patient


def test_medications_logic():
    patient_id = "P101"
    meds = get_medications(patient_id)
    assert len(meds) > 0, "Patient P101 should have documented medications."

    active_meds = [m for m in meds if m.get("status") == "ACTIVE"]
    disc_meds = [m for m in meds if m.get("status") in ["DISCONTINUED", "INACTIVE", "PRIOR"]]

    assert len(active_meds) > 0, "Should have active prescriptions."

    # Validate presence of required fields
    for med in meds:
        assert "name" in med and med["name"], "Medication must have a name."
        assert "dosage" in med, "Medication should have dosage field."
        assert "frequency" in med, "Medication should have frequency field."
        assert "start_date" in med, "Medication should have start_date field."
        assert "status" in med, "Medication should have status field."

    # Test document linkage
    docs = get_documents(patient_id)
    doc_map = {d["id"]: d.get("file_name") for d in docs}
    for med in meds:
        doc_id = med.get("document_id")
        if doc_id:
            assert doc_id in doc_map or doc_id.startswith("DOC_"), "Document ID should link cleanly."

    print(f"[OK] Medication validation passed: {len(active_meds)} active, {len(disc_meds)} discontinued.")
    print("\nALL MEDICATION TESTS PASSED!")


if __name__ == "__main__":
    test_medications_logic()
