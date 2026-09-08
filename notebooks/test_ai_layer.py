"""Unit tests for CAREBRIDGE Pydantic Models and AI Layer.
Tests client initialization, structured extraction, JSON sanitization, Pydantic validation, and error handling.
"""

from ai.ai_engine import AIEngine
from database.models import (
    Patient,
    MedicalDocument,
    LabResult,
    Medication,
    Symptom,
    TimelineEvent
)


def test_pydantic_models():
    # 1. Test Patient model with partial optional fields
    p = Patient(name="Eleanor Vance", age=54, gender="Female")
    assert p.name == "Eleanor Vance"
    assert p.blood_group is None
    assert p.allergies is None
    print("[OK] Patient model handles optional fields without inventing data.")

    # 2. Test LabResult model with numeric and raw values
    lab1 = LabResult(test_name="HbA1c", value="6.4", unit="%", flag="HIGH")
    assert lab1.value == 6.4
    assert lab1.flag == "HIGH"
    
    lab_non_numeric = LabResult(test_name="Urine Protein", raw_value="Negative", value=None)
    assert lab_non_numeric.value is None
    assert lab_non_numeric.raw_value == "Negative"
    print("[OK] LabResult model parses numeric and non-numeric values properly.")

    # 3. Test Medication model
    med = Medication(name="Metformin", dosage="500 mg", frequency="Twice daily")
    assert med.name == "Metformin"
    assert med.status == "ACTIVE"
    assert med.end_date is None
    print("[OK] Medication model validation passed.")

    # 4. Test Symptom model
    sym = Symptom(symptom="Mild dizziness", severity="MILD")
    assert sym.symptom == "Mild dizziness"
    assert sym.status == "UNKNOWN"
    print("[OK] Symptom model validation passed.")

    # 5. Test MedicalDocument composite validation
    doc_payload = {
        "document_type": "Lab Report",
        "document_date": "2026-02-05",
        "patient_info": {"name": "Eleanor Vance", "age": 54},
        "laboratory_results": [
            {"test_name": "Total Cholesterol", "value": 192.0, "unit": "mg/dL", "flag": "NORMAL"}
        ],
        "medications": [
            {"name": "Atorvastatin", "dosage": "20 mg"}
        ],
        "symptoms": [],
        "medical_conditions_history": [],
        "important_observations": [],
        "summary": "Routine lipid check."
    }
    med_doc = MedicalDocument.model_validate(doc_payload)
    assert med_doc.document_type == "Lab Report"
    assert len(med_doc.laboratory_results) == 1
    assert med_doc.laboratory_results[0].value == 192.0
    assert len(med_doc.medications) == 1
    print("[OK] MedicalDocument composite model validation passed.")


def test_ai_layer_error_handling():
    # 1. Missing API Key
    engine_no_key = AIEngine(api_key="")
    res_no_key = engine_no_key.extract_structured_medical_data("Sample medical text")
    assert not res_no_key["success"], "Should fail gracefully when API key is missing."
    assert "missing or empty" in res_no_key["error"].lower(), "Error message should mention missing key."
    print("[OK] Missing API Key handled properly.")

    # 2. Empty Input Text
    engine = AIEngine()
    res_empty = engine.extract_structured_medical_data("   ")
    assert not res_empty["success"], "Should fail when input text is empty."
    assert "empty" in res_empty["error"].lower(), "Error message should mention empty input."
    print("[OK] Empty input text handled properly.")

    # 3. Malformed / Markdown-wrapped JSON Sanitization & Pydantic Validation
    raw_markdown_json = """
    ```json
    {
      "document_type": "Lab Report",
      "document_date": "2026-02-05",
      "laboratory_results": [
        {"test_name": "HbA1c", "value": 6.4, "unit": "%", "flag": "HIGH"}
      ]
    }
    ```
    """
    parsed = engine._parse_and_sanitize_json(raw_markdown_json)
    doc = engine.validate_with_pydantic(parsed)
    assert isinstance(doc, MedicalDocument)
    assert doc.document_type == "Lab Report"
    assert len(doc.laboratory_results) == 1
    assert doc.laboratory_results[0].test_name == "HbA1c"
    print("[OK] Markdown & malformed JSON repair + Pydantic validation handled properly.")


if __name__ == "__main__":
    test_pydantic_models()
    test_ai_layer_error_handling()
    print("\nALL CAREBRIDGE PYDANTIC & AI TESTS PASSED!")
