"""Unit tests for the CAREBRIDGE Dashboard component and biomarker shift computations.
"""

from components.dashboard import compute_informational_shifts
from database.database import get_patient, get_documents, get_lab_results, get_medications, get_timeline


def test_dashboard_logic():
    # 1. Test biomarker shifts calculation
    mock_labs = [
        {"test_name": "HbA1c", "value": 7.8, "unit": "%", "flag": "HIGH", "test_date": "2025-03-15"},
        {"test_name": "HbA1c", "value": 7.2, "unit": "%", "flag": "HIGH", "test_date": "2025-07-20"},
        {"test_name": "HbA1c", "value": 6.4, "unit": "%", "flag": "HIGH", "test_date": "2026-02-05"},
        {"test_name": "Total Cholesterol", "value": 235.0, "unit": "mg/dL", "flag": "HIGH", "test_date": "2025-03-15"},
        {"test_name": "Total Cholesterol", "value": 192.0, "unit": "mg/dL", "flag": "NORMAL", "test_date": "2026-02-05"},
        {"test_name": "Serum Creatinine", "value": 0.85, "unit": "mg/dL", "flag": "NORMAL", "test_date": "2026-02-05"}
    ]

    shifts = compute_informational_shifts(mock_labs)
    assert len(shifts) == 3, "Should compute shifts for HbA1c, Total Cholesterol, and Creatinine"

    hba1c_shift = next(s for s in shifts if s["test_name"] == "HbA1c")
    assert hba1c_shift["latest_value"] == 6.4
    assert hba1c_shift["prior_value"] == 7.2
    assert hba1c_shift["delta"] == -0.8
    print("[OK] compute_informational_shifts correctly calculated consecutive biomarker shifts.")

    # 2. Test database query retrieval for Dashboard
    patient = get_patient("P101")
    assert patient is not None
    docs = get_documents("P101")
    meds = get_medications("P101")
    labs = get_lab_results("P101")
    timeline = get_timeline("P101")

    assert len(meds) > 0
    assert len(labs) > 0
    assert len(timeline) > 0
    print(f"[OK] Dashboard queries verified: {len(docs)} docs, {len(meds)} meds, {len(labs)} labs, {len(timeline)} events.")

    print("\nALL DASHBOARD UNIT TESTS PASSED!")


if __name__ == "__main__":
    test_dashboard_logic()
