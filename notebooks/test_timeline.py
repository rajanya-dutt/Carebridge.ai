"""Unit tests for the CAREBRIDGE Health Timeline component.
Tests chronological ordering, event retrieval, and historical biomarker trajectory lookup.
"""

from components.timeline import get_historical_test_readings
from database.database import get_timeline, get_lab_results, get_medications, get_documents


def test_timeline_logic():
    # 1. Test Historical Readings lookup across multiple reports
    mock_labs = [
        {"test_name": "HbA1c", "value": 7.8, "raw_value": "7.8", "unit": "%", "test_date": "2025-03-15"},
        {"test_name": "Fasting Glucose", "value": 162.0, "raw_value": "162", "unit": "mg/dL", "test_date": "2025-03-15"},
        {"test_name": "HbA1c", "value": 7.2, "raw_value": "7.2", "unit": "%", "test_date": "2025-07-20"},
        {"test_name": "HbA1c", "value": 6.4, "raw_value": "6.4", "unit": "%", "test_date": "2026-02-05"},
    ]

    hba1c_history = get_historical_test_readings(mock_labs, "HbA1c")
    assert len(hba1c_history) == 3
    assert hba1c_history[0]["test_date"] == "2025-03-15"
    assert hba1c_history[-1]["test_date"] == "2026-02-05"
    print("[OK] Historical lab readings correctly aggregated across reports.")

    # 2. Test database retrieval for timeline
    events = get_timeline("P101")
    assert len(events) > 0, "Should retrieve timeline events from database."

    # Verify chronological sorting
    dates = [e.get("event_date") for e in events if e.get("event_date")]
    assert dates == sorted(dates, reverse=True), "Default database retrieval should be newest first."
    print(f"[OK] Retrieved and validated {len(events)} chronological timeline milestones.")

    print("\nALL TIMELINE TESTS PASSED!")


if __name__ == "__main__":
    test_timeline_logic()
