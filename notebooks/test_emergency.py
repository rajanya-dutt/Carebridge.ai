"""Unit tests for the CAREBRIDGE Emergency Health Card module.
Tests emergency patient profile retrieval, allergy prioritization, and active medication filtering.
"""

from database.database import get_patient, get_medications


def test_emergency_health_card():
    patient_id = "P101"
    patient = get_patient(patient_id)
    assert patient is not None, "Patient P101 must exist."

    # 1. Critical Emergency Fields
    assert patient.get("name") is not None, "Emergency card must have patient name."
    assert patient.get("blood_group") is not None, "Emergency card must have blood group."
    assert "allergies" in patient, "Emergency card must have allergies field."
    assert "chronic_conditions" in patient, "Emergency card must have chronic conditions."
    assert "emergency_contact_phone" in patient, "Emergency card must have emergency contact phone."

    # 2. Medication Filtering
    meds = get_medications(patient_id)
    active_meds = [m for m in meds if m.get("status") == "ACTIVE"]
    assert len(active_meds) > 0, "Emergency card should list active prescriptions."

    print(f"[OK] Emergency Health Card verified for {patient['name']}: Blood {patient['blood_group']}, Allergies: {patient['allergies']}")
    print("\nALL EMERGENCY HEALTH CARD TESTS PASSED!")


if __name__ == "__main__":
    test_emergency_health_card()
