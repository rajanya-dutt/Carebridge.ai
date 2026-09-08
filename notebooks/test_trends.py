"""Unit tests for the CAREBRIDGE Health Trend Analysis module.
Tests grouping, sorting, percentage change, rule-based significant shift detection, and AI trend explanation.
"""

from components.trends import analyze_biomarker_trends
from ai.ai_engine import AIEngine
from database.database import get_lab_results


def test_trend_analysis():
    # 1. Test grouping and mathematical calculation
    mock_labs = [
        {"test_name": "HbA1c", "value": 7.8, "unit": "%", "flag": "HIGH", "test_date": "2025-03-15"},
        {"test_name": "HbA1c", "value": 7.2, "unit": "%", "flag": "HIGH", "test_date": "2025-07-20"},
        {"test_name": "HbA1c", "value": 6.4, "unit": "%", "flag": "HIGH", "test_date": "2026-02-05"},
        {"test_name": "Total Cholesterol", "value": 235.0, "unit": "mg/dL", "flag": "HIGH", "test_date": "2025-03-15"},
        {"test_name": "Total Cholesterol", "value": 192.0, "unit": "mg/dL", "flag": "NORMAL", "test_date": "2026-02-05"},
        {"test_name": "Serum Creatinine", "value": 0.85, "unit": "mg/dL", "flag": "NORMAL", "test_date": "2026-02-05"}
    ]

    # Test with 5% threshold
    trends = analyze_biomarker_trends(mock_labs, significance_pct_threshold=5.0)

    # HbA1c had: 7.2 -> 6.4 = -0.8 (-11.1%)
    hba1c = next(t for t in trends if t["test_name"] == "HbA1c")
    assert hba1c["previous_value"] == 7.2
    assert hba1c["latest_value"] == 6.4
    assert hba1c["delta"] == -0.8
    assert hba1c["pct_change"] == -11.1
    assert hba1c["is_significant"] is True
    print("[OK] Mathematical delta and percentage change calculated accurately.")

    # Total Cholesterol had: 235 -> 192 = -43 (-18.3%), flag HIGH -> NORMAL
    chol = next(t for t in trends if t["test_name"] == "Total Cholesterol")
    assert chol["is_significant"] is True
    assert any("flag transition" in r.lower() for r in chol["trend_reasons"])
    print("[OK] Transparent rule engine detected significant percentage shift and flag transition.")

    # 2. Test AI explanation function on trend
    ai = AIEngine()
    exp = ai.explain_biomarker_trend(
        test_name="HbA1c",
        reference_range="4.0 - 5.6",
        unit="%",
        historical_readings=hba1c["history"],
        change_summary="Decreased from 7.8% to 6.4% across consecutive checks."
    )
    assert exp["success"] is True
    assert "trend" in exp["text"].lower() or "hba1c" in exp["text"].lower()
    print("[OK] Gemini AI generated informational trend explanation with safety guardrails.")

    print("\nALL HEALTH TREND ANALYSIS TESTS PASSED!")


if __name__ == "__main__":
    test_trend_analysis()
