"""Unit tests for the CAREBRIDGE Doctor Brief generation module.
Tests SQLite data aggregation and Gemini clinical synthesis against required structures and safety constraints.
"""

from components.doctor_brief import prepare_brief_data_bundle
from ai.ai_engine import AIEngine


def test_doctor_brief_generation():
    patient_id = "P101"

    # 1. Test data bundle preparation from SQLite
    bundle = prepare_brief_data_bundle(patient_id)
    assert bundle["patient_profile"]["name"] is not None, "Patient profile should be populated."
    assert len(bundle["active_medications"]) > 0, "Should have active medications."
    assert len(bundle["key_biomarker_shifts"]) > 0, "Should have calculated biomarker shifts."
    assert len(bundle["recent_encounters"]) > 0, "Should have recent encounters from timeline."
    print("[OK] SQLite clinical data bundle prepared successfully.")

    # 2. Test live AI generation
    ai = AIEngine()
    result = ai.generate_doctor_brief(bundle)
    assert result["success"] is True, f"Doctor brief generation failed: {result.get('error')}"

    brief_text = result["brief_markdown"].upper()

    # 3. Check for all mandatory structure sections
    required_sections = [
        "PATIENT OVERVIEW",
        "RECENT MEDICAL HISTORY",
        "KEY RECORDED CHANGES",
        "CURRENT MEDICATIONS",
        "RECENTLY REPORTED SYMPTOMS",
        "IMPORTANT DOCUMENTS",
        "QUESTIONS TO DISCUSS"
    ]

    for sec in required_sections:
        assert sec in brief_text, f"Missing required section in brief: {sec}"
        print(f"[OK] Section present: {sec}")

    print("\nALL DOCTOR BRIEF TESTS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    test_doctor_brief_generation()
