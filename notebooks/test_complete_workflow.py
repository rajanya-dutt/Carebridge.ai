"""End-to-end integration test for the CAREBRIDGE document ingestion workflow.
Tests the complete sequence: PDF save -> PyMuPDF extract -> Gemini parse -> Pydantic validate -> SQLite persist.
"""

import os
import pymupdf
from ai.workflow import IngestionWorkflow
from database.database import (
    get_patient,
    get_documents,
    get_lab_results,
    get_medications,
    get_symptoms,
    get_timeline
)


def create_synthetic_pdf_bytes() -> bytes:
    """Generates an in-memory 2-page medical report PDF for end-to-end testing."""
    doc = pymupdf.open()

    # Page 1: Hospital Header & Lab Results
    page1 = doc.new_page(width=595, height=842)
    text1 = (
        "VALLEY HEALTH CLINICAL LABORATORY REPORT\n"
        "Patient: Eleanor Vance          DOB: 1972-04-12    Sex: Female\n"
        "Patient ID: P101               Encounter Date: 2026-02-16\n"
        "Ordering Physician: Dr. Sarah Jenkins, MD\n\n"
        "LABORATORY RESULTS:\n"
        "- Hemoglobin A1c (HbA1c): 6.2 % (Ref: 4.0 - 5.6) [High]\n"
        "- Fasting Blood Sugar: 105 mg/dL (Ref: 70 - 99) [High]\n"
        "- Serum Potassium: 4.2 mmol/L (Ref: 3.5 - 5.0) [Normal]\n"
        "- Serum Creatinine: 0.80 mg/dL (Ref: 0.50 - 1.10) [Normal]\n"
    )
    page1.insert_text((50, 60), text1, fontsize=10)

    # Page 2: Clinical Assessment & Rx
    page2 = doc.new_page(width=595, height=842)
    text2 = (
        "VALLEY HEALTH CLINICAL ENCOUNTER SUMMARY (Page 2)\n"
        "Patient: Eleanor Vance          Date: 2026-02-16\n\n"
        "CLINICAL ASSESSMENT:\n"
        "Patient shows further steady improvement in glycemic parameters (HbA1c 6.2%).\n"
        "Blood pressure is stable at 122/78 mmHg.\n"
        "Patient reports occasional fatigue during late afternoons.\n\n"
        "PRESCRIPTION ORDERS:\n"
        "- Metformin 500 mg oral tablet, twice daily with meals\n"
        "- Lisinopril 10 mg oral tablet, once daily in the morning\n"
        "- CoQ10 100 mg oral capsule, once daily (Dietary supplement)\n\n"
        "PLAN:\n"
        "Continue current therapy. Re-check metabolic panel in 6 months."
    )
    page2.insert_text((50, 60), text2, fontsize=10)

    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def run_e2e_workflow_test():
    print("--- Starting CAREBRIDGE End-to-End Workflow Test ---")
    pdf_bytes = create_synthetic_pdf_bytes()
    file_name = "ValleyHealth_Encounter_2026.pdf"

    workflow = IngestionWorkflow()

    step_log = []
    def log_step(step, msg):
        print(f"  [Step {step}/5] {msg}")
        step_log.append((step, msg))

    # Execute end-to-end workflow
    result = workflow.process_and_persist_document(
        pdf_input=pdf_bytes,
        file_name=file_name,
        patient_id="P101",
        on_status_update=log_step
    )

    # 1. Verify Pipeline Execution Status
    assert result["success"], f"Workflow failed with error: {result.get('error')}"
    print("[OK] Pipeline executed successfully.")

    # 2. Verify Saved File
    saved_path = result["saved_file_path"]
    assert saved_path and os.path.exists(saved_path), "File should be saved in data/uploads/"
    print(f"[OK] File saved to: {saved_path}")

    # 3. Verify PyMuPDF Extraction
    ext_res = result["extraction_result"]
    assert ext_res["has_text"] is True
    assert ext_res["total_pages"] == 2
    print(f"[OK] PyMuPDF extracted {ext_res['total_pages']} pages cleanly.")

    # 4. Verify Pydantic Validated Document
    val_doc = result["validated_document"]
    assert val_doc is not None
    assert len(val_doc.laboratory_results) >= 2, "Should extract at least 2 lab results."
    assert len(val_doc.medications) >= 2, "Should extract at least 2 medications."
    print(f"[OK] Gemini & Pydantic validated: {len(val_doc.laboratory_results)} labs, {len(val_doc.medications)} meds.")

    # 5. Verify Database Records
    db_stats = result["db_bundle_result"]
    assert db_stats["document_id"] is not None
    print(f"[OK] Saved to SQLite document ID: {db_stats['document_id']}")

    # Verify queryability from SQLite
    docs = get_documents("P101")
    assert any(d["id"] == db_stats["document_id"] for d in docs), "Document should appear in SQLite query."

    labs = get_lab_results("P101")
    assert len(labs) > 0, "Lab results should be queryable in SQLite."

    meds = get_medications("P101")
    assert len(meds) > 0, "Medications should be queryable in SQLite."

    timeline = get_timeline("P101")
    assert any(t["document_id"] == db_stats["document_id"] for t in timeline), "Timeline should reflect ingested document."

    print("\n--- ALL END-TO-END WORKFLOW INTEGRATION TESTS PASSED! ---")


if __name__ == "__main__":
    run_e2e_workflow_test()
