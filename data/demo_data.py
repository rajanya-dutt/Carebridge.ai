"""Synthetic Demo Patient Generator for CAREBRIDGE.
Creates 5 realistic clinical PDF documents demonstrating longitudinal health records,
repeated lab measurements, medication changes, symptoms, and trend evolutions,
and populates the SQLite database for a complete out-of-the-box demo experience.
"""

import os
import pymupdf
import uuid
from typing import Dict, Any, List
from database.database import (
    get_db_connection,
    insert_patient,
    insert_medical_document,
    insert_lab_result,
    insert_medication,
    insert_symptom,
    insert_timeline_event,
    DB_PATH
)
from database.models import Patient, LabResult, Medication, Symptom, TimelineEvent


def generate_synthetic_pdfs(upload_dir: str = "data/uploads") -> List[Dict[str, Any]]:
    """Generates 5 realistic synthetic PDF medical documents on disk using PyMuPDF."""
    os.makedirs(upload_dir, exist_ok=True)

    demo_docs_config = [
        {
            "file_name": "MetroHealth_Annual_Wellness_2025-03-15.pdf",
            "doc_type": "Annual Wellness & Baseline Panel",
            "doc_date": "2025-03-15",
            "p1_header": "METROPOLITAN GENERAL HEALTH SYSTEM - ANNUAL WELLNESS REPORT",
            "p1_content": (
                "Patient Name: Eleanor Vance                DOB: 1972-04-12 (Age: 54)\n"
                "MRN / Patient ID: P101                    Encounter Date: 2025-03-15\n"
                "Physician: Dr. Marcus Bennett, MD          Department: Internal Medicine\n\n"
                "CHIEF COMPLAINT & SYMPTOMS:\n"
                "Patient presents for routine annual physical. Reports persistent fatigue and mild polyuria over the past 3 months.\n\n"
                "LABORATORY EVALUATION:\n"
                "- Hemoglobin A1c (HbA1c): 7.8 % (Ref: 4.0 - 5.6) [HIGH]\n"
                "- Fasting Plasma Glucose: 162 mg/dL (Ref: 70 - 99) [HIGH]\n"
                "- Blood Pressure: 148/92 mmHg (Ref: 90 - 120) [HIGH]\n"
                "- Total Cholesterol: 235 mg/dL (Ref: < 200) [HIGH]\n"
                "- Serum Creatinine: 0.90 mg/dL (Ref: 0.50 - 1.10) [NORMAL]\n"
                "- eGFR: 82 mL/min (Ref: > 60) [NORMAL]\n"
            ),
            "p2_content": (
                "ASSESSMENT & ORDERS:\n"
                "1. Newly diagnosed Type 2 Diabetes Mellitus with elevated HbA1c (7.8%).\n"
                "2. Stage 1 Essential Hypertension (BP 148/92).\n"
                "3. Hypercholesterolemia.\n\n"
                "INITIAL PRESCRIPTION REGIMEN:\n"
                "- Metformin 500 mg oral tablet, twice daily with meals (Initiated 2025-03-15)\n"
                "- Hydrochlorothiazide 12.5 mg oral tablet, once daily morning (Initiated 2025-03-15)\n\n"
                "PLAN:\n"
                "Dietary modifications, structured aerobic exercise, and follow-up cardiology/lipid panel in 3 months."
            )
        },
        {
            "file_name": "CardioCare_Specialist_Consult_2025-06-20.pdf",
            "doc_type": "Cardiology & Lipid Consult",
            "doc_date": "2025-06-20",
            "p1_header": "CARDIOCARE SPECIALISTS - CARDIOLOGY CLINICAL CONSULTATION",
            "p1_content": (
                "Patient: Eleanor Vance                    DOB: 1972-04-12\n"
                "MRN: P101                                  Consult Date: 2025-06-20\n"
                "Consultant: Dr. Elena Rostova, FACC\n\n"
                "SYMPTOMS & EVALUATION:\n"
                "Patient notes occasional morning orthostatic lightheadedness on Hydrochlorothiazide. Denies palpitations or angina.\n\n"
                "CARDIOVASCULAR & LIPID LABS:\n"
                "- Blood Pressure: 138/88 mmHg [ELEVATED]\n"
                "- Total Cholesterol: 220 mg/dL (Ref: < 200) [HIGH]\n"
                "- LDL Cholesterol: 135 mg/dL (Ref: < 100) [HIGH]\n"
                "- HDL Cholesterol: 48 mg/dL (Ref: > 50) [BORDERLINE LOW]\n"
                "- Triglycerides: 165 mg/dL (Ref: < 150) [HIGH]\n"
            ),
            "p2_content": (
                "THERAPEUTIC ADJUSTMENTS:\n"
                "1. Discontinue Hydrochlorothiazide 12.5mg due to orthostatic lightheadedness.\n"
                "2. Initiate Lisinopril 10 mg oral tablet, once daily morning for hypertension and renal protection.\n"
                "3. Initiate Atorvastatin 20 mg oral tablet, once daily at bedtime for hyperlipidemia.\n"
                "4. Continue Metformin 500 mg twice daily."
            )
        },
        {
            "file_name": "QuestDiagnostics_Metabolic_Panel_2025-10-10.pdf",
            "doc_type": "Laboratory Diagnostic Report",
            "doc_date": "2025-10-10",
            "p1_header": "QUEST DIAGNOSTICS - COMPREHENSIVE METABOLIC & LIPID PANEL",
            "p1_content": (
                "Patient: Eleanor Vance                    Collection Date: 2025-10-10\n"
                "Patient ID: P101                           Ordering MD: Dr. Marcus Bennett\n\n"
                "LABORATORY TEST RESULTS:\n"
                "Test Name                  Result    Unit       Reference Range    Status\n"
                "-------------------------------------------------------------------------\n"
                "Hemoglobin A1c (HbA1c)     7.1       %          4.0 - 5.6          HIGH (Prior: 7.8)\n"
                "Fasting Blood Glucose      138       mg/dL      70 - 99            HIGH (Prior: 162)\n"
                "Blood Pressure             132/84    mmHg       90 - 120           NORMAL\n"
                "Total Cholesterol          204       mg/dL      < 200              BORDERLINE (Prior: 220)\n"
                "Serum Creatinine           0.88      mg/dL      0.50 - 1.10        NORMAL\n"
                "eGFR                       85        mL/min     > 60               NORMAL\n\n"
                "CLINICAL NOTE:\n"
                "HbA1c demonstrates positive trend reduction from 7.8% down to 7.1%. Blood pressure improved on Lisinopril."
            ),
            "p2_content": ""
        },
        {
            "file_name": "Endocrine_Associates_Review_2026-01-15.pdf",
            "doc_type": "Endocrinology Progress Note",
            "doc_date": "2026-01-15",
            "p1_header": "ENDOCRINE & METABOLIC ASSOCIATES - PROGRESS ENCOUNTER",
            "p1_content": (
                "Patient: Eleanor Vance                    DOB: 1972-04-12\n"
                "ID: P101                                   Encounter Date: 2026-01-15\n"
                "Provider: Dr. Marcus Bennett, MD\n\n"
                "CURRENT STATUS & SYMPTOMS:\n"
                "Patient reports sustained improvement in daily energy. Mentions mild morning joint stiffness.\n\n"
                "LABORATORY & VITAL READINGS:\n"
                "- Hemoglobin A1c (HbA1c): 6.5 % (Ref: 4.0 - 5.6) [HIGH -> IMPROVING]\n"
                "- Fasting Plasma Glucose: 118 mg/dL (Ref: 70 - 99) [HIGH]\n"
                "- Blood Pressure: 126/80 mmHg [NORMAL]\n"
                "- Total Cholesterol: 194 mg/dL (Ref: < 200) [NORMAL (Goal Met)]\n"
                "- Triglycerides: 145 mg/dL (Ref: < 150) [NORMAL]\n"
                "- HDL Cholesterol: 52 mg/dL (Ref: > 50) [NORMAL]\n"
            ),
            "p2_content": (
                "ASSESSMENT:\n"
                "Substantial glycemic control optimization (HbA1c 7.8% -> 7.1% -> 6.5%).\n"
                "Lipid targets achieved on Atorvastatin 20mg.\n\n"
                "ACTIVE REGIMEN:\n"
                "- Metformin 500 mg BID (Oral)\n"
                "- Lisinopril 10 mg QD (Oral)\n"
                "- Atorvastatin 20 mg QHS (Oral)"
            )
        },
        {
            "file_name": "MetroHealth_Quarterly_Review_2026-02-16.pdf",
            "doc_type": "Clinical Encounter & Follow-up",
            "doc_date": "2026-02-16",
            "p1_header": "METROPOLITAN HEALTH SYSTEM - QUARTERLY COMPREHENSIVE SUMMARY",
            "p1_content": (
                "Patient: Eleanor Vance                    DOB: 1972-04-12\n"
                "Patient ID: P101                           Visit Date: 2026-02-16\n"
                "Attending Physician: Dr. Marcus Bennett, MD\n\n"
                "CHIEF COMPLAINT:\n"
                "Quarterly review. Occasional late afternoon tiredness, otherwise feeling energetic.\n\n"
                "CURRENT BIOMARKER STATUS:\n"
                "- Hemoglobin A1c (HbA1c): 6.2 % [IMPROVED]\n"
                "- Fasting Blood Sugar: 106 mg/dL [MILD ELEVATION]\n"
                "- Blood Pressure: 122/78 mmHg [NORMAL]\n"
                "- Total Cholesterol: 188 mg/dL [NORMAL]\n"
                "- eGFR: 88 mL/min [NORMAL]\n"
                "- Serum Potassium: 4.2 mmol/L [NORMAL]\n"
            ),
            "p2_content": (
                "ACTIVE MEDICATIONS:\n"
                "- Metformin 500 mg BID (Oral)\n"
                "- Lisinopril 10 mg QD (Oral)\n"
                "- Atorvastatin 20 mg QHS (Oral)\n"
                "- CoQ10 100 mg QD (Dietary Supplement)\n\n"
                "SUMMARY & DISCUSSION TOPICS FOR PATIENT:\n"
                "Glycemic control has reached near-normal range (6.2%). Continue lifestyle maintenance."
            )
        }
    ]

    generated_docs = []
    for cfg in demo_docs_config:
        doc = pymupdf.open()
        p1 = doc.new_page(width=595, height=842)
        p1.insert_text((40, 45), cfg["p1_header"], fontsize=11)
        p1.insert_text((40, 75), cfg["p1_content"], fontsize=9.5)

        if cfg["p2_content"]:
            p2 = doc.new_page(width=595, height=842)
            p2.insert_text((40, 45), cfg["p1_header"] + " (Page 2)", fontsize=11)
            p2.insert_text((40, 75), cfg["p2_content"], fontsize=9.5)

        file_path = os.path.join(upload_dir, cfg["file_name"])
        doc.save(file_path)
        doc.close()

        cfg["file_path"] = file_path
        generated_docs.append(cfg)

    return generated_docs


DEMO_PATIENT_ID = "DEMO_P101"
DEMO_PATIENT_NAME = "Eleanor Vance (Demo Patient)"


def load_demo_patient(db_path: str = DB_PATH) -> Dict[str, Any]:
    """Populates the SQLite database with full synthetic patient profile, 5 documents, and clinical history.
    
    ADDITIVE & NON-DESTRUCTIVE:
    Only creates or updates records for DEMO_PATIENT_ID ('DEMO_P101').
    Never touches, modifies, or deletes any other patient records.
    """
    conn = get_db_connection(db_path)
    cursor = conn.cursor()

    # Check if demo patient exists to determine patient_created flag
    cursor.execute("SELECT id FROM patients WHERE id = ?", (DEMO_PATIENT_ID,))
    existing_demo = cursor.fetchone()
    patient_created = (existing_demo is None)

    # 1. Reset ONLY DEMO records for idempotent reloading (Never touch other patients!)
    with conn:
        conn.execute("DELETE FROM emergency_events WHERE patient_id = ?", (DEMO_PATIENT_ID,))
        conn.execute("DELETE FROM timeline_events WHERE patient_id = ?", (DEMO_PATIENT_ID,))
        conn.execute("DELETE FROM symptoms WHERE patient_id = ?", (DEMO_PATIENT_ID,))
        conn.execute("DELETE FROM medications WHERE patient_id = ?", (DEMO_PATIENT_ID,))
        conn.execute("DELETE FROM lab_results WHERE patient_id = ?", (DEMO_PATIENT_ID,))
        conn.execute("DELETE FROM documents WHERE patient_id = ?", (DEMO_PATIENT_ID,))
        conn.execute("DELETE FROM patients WHERE id = ?", (DEMO_PATIENT_ID,))
    conn.close()

    # 2. Insert Core Demo Patient
    patient = Patient(
        id=DEMO_PATIENT_ID,
        name=DEMO_PATIENT_NAME,
        age=54,
        gender="Female",
        blood_group="A+",
        emergency_contact_name="David Vance (Spouse)",
        emergency_contact_phone="+1 (555) 019-2834",
        emergency_contact_relationship="Spouse",
        allergies="Penicillin, Sulfa drugs",
        chronic_conditions="Type 2 Diabetes Mellitus, Essential Hypertension, Dyslipidemia"
    )
    insert_patient(patient, db_path=db_path)

    # 3. Generate physical PDF files on disk
    generated_pdfs = generate_synthetic_pdfs()

    # 4. Insert Structured Medical Documents into SQLite
    doc_ids = []
    for pdf_info in generated_pdfs:
        doc_id = f"DOC_DEMO_{uuid.uuid4().hex[:8]}"
        doc_ids.append(doc_id)
        insert_medical_document(
            {
                "id": doc_id,
                "file_name": pdf_info["file_name"],
                "file_path": pdf_info["file_path"],
                "document_type": pdf_info["doc_type"],
                "document_date": pdf_info["doc_date"],
                "extracted_text": pdf_info["p1_content"] + "\n\n" + pdf_info.get("p2_content", ""),
            },
            patient_id=DEMO_PATIENT_ID,
            db_path=db_path
        )

    # 5. Insert Longitudinal Laboratory Measurements (5 Timepoints demonstrating trajectory)
    lab_records = [
        # March 2025 (Baseline)
        ("HbA1c", "Metabolic", 7.8, "%", "4.0 - 5.6", "HIGH", "2025-03-15", doc_ids[0]),
        ("Fasting Glucose", "Metabolic", 162.0, "mg/dL", "70 - 99", "HIGH", "2025-03-15", doc_ids[0]),
        ("Blood Pressure", "Vitals", 148.0, "mmHg", "90 - 120", "HIGH", "2025-03-15", doc_ids[0]),
        ("Total Cholesterol", "Lipid", 235.0, "mg/dL", "< 200", "HIGH", "2025-03-15", doc_ids[0]),
        ("Serum Creatinine", "Renal", 0.90, "mg/dL", "0.50 - 1.10", "NORMAL", "2025-03-15", doc_ids[0]),
        ("eGFR", "Renal", 82.0, "mL/min", "> 60", "NORMAL", "2025-03-15", doc_ids[0]),

        # June 2025 (Cardio Consult)
        ("Blood Pressure", "Vitals", 138.0, "mmHg", "90 - 120", "HIGH", "2025-06-20", doc_ids[1]),
        ("Total Cholesterol", "Lipid", 220.0, "mg/dL", "< 200", "HIGH", "2025-06-20", doc_ids[1]),
        ("LDL Cholesterol", "Lipid", 135.0, "mg/dL", "< 100", "HIGH", "2025-06-20", doc_ids[1]),
        ("HDL Cholesterol", "Lipid", 48.0, "mg/dL", "> 50", "BORDERLINE", "2025-06-20", doc_ids[1]),
        ("Triglycerides", "Lipid", 165.0, "mg/dL", "< 150", "HIGH", "2025-06-20", doc_ids[1]),

        # October 2025 (Mid-Year Progress)
        ("HbA1c", "Metabolic", 7.1, "%", "4.0 - 5.6", "HIGH", "2025-10-10", doc_ids[2]),
        ("Fasting Glucose", "Metabolic", 138.0, "mg/dL", "70 - 99", "HIGH", "2025-10-10", doc_ids[2]),
        ("Blood Pressure", "Vitals", 132.0, "mmHg", "90 - 120", "NORMAL", "2025-10-10", doc_ids[2]),
        ("Total Cholesterol", "Lipid", 204.0, "mg/dL", "< 200", "BORDERLINE", "2025-10-10", doc_ids[2]),
        ("Serum Creatinine", "Renal", 0.88, "mg/dL", "0.50 - 1.10", "NORMAL", "2025-10-10", doc_ids[2]),
        ("eGFR", "Renal", 85.0, "mL/min", "> 60", "NORMAL", "2025-10-10", doc_ids[2]),

        # January 2026 (Endo Progress)
        ("HbA1c", "Metabolic", 6.5, "%", "4.0 - 5.6", "HIGH", "2026-01-15", doc_ids[3]),
        ("Fasting Glucose", "Metabolic", 118.0, "mg/dL", "70 - 99", "HIGH", "2026-01-15", doc_ids[3]),
        ("Blood Pressure", "Vitals", 126.0, "mmHg", "90 - 120", "NORMAL", "2026-01-15", doc_ids[3]),
        ("Total Cholesterol", "Lipid", 194.0, "mg/dL", "< 200", "NORMAL", "2026-01-15", doc_ids[3]),
        ("HDL Cholesterol", "Lipid", 52.0, "mg/dL", "> 50", "NORMAL", "2026-01-15", doc_ids[3]),
        ("Triglycerides", "Lipid", 145.0, "mg/dL", "< 150", "NORMAL", "2026-01-15", doc_ids[3]),

        # February 2026 (Recent Review)
        ("HbA1c", "Metabolic", 6.2, "%", "4.0 - 5.6", "NORMAL", "2026-02-16", doc_ids[4]),
        ("Fasting Glucose", "Metabolic", 106.0, "mg/dL", "70 - 99", "HIGH", "2026-02-16", doc_ids[4]),
        ("Blood Pressure", "Vitals", 122.0, "mmHg", "90 - 120", "NORMAL", "2026-02-16", doc_ids[4]),
        ("Total Cholesterol", "Lipid", 188.0, "mg/dL", "< 200", "NORMAL", "2026-02-16", doc_ids[4]),
        ("eGFR", "Renal", 88.0, "mL/min", "> 60", "NORMAL", "2026-02-16", doc_ids[4]),
        ("Serum Potassium", "Metabolic", 4.2, "mmol/L", "3.5 - 5.0", "NORMAL", "2026-02-16", doc_ids[4]),
    ]

    for name, cat, val, unit, ref, flag, dt, d_id in lab_records:
        insert_lab_result(
            LabResult(
                test_name=name,
                category=cat,
                value=val,
                raw_value=str(val),
                unit=unit,
                reference_range=ref,
                flag=flag,
                test_date=dt
            ),
            patient_id=DEMO_PATIENT_ID,
            document_id=d_id,
            db_path=db_path
        )

    # 6. Insert Medications
    med_records = [
        ("Metformin", "500 mg", "Twice daily with meals", "Oral", "Blood glucose regulation", "2025-03-15", None, "ACTIVE", doc_ids[0]),
        ("Hydrochlorothiazide", "12.5 mg", "Once daily morning", "Oral", "Initial blood pressure diuretic", "2025-03-15", "2025-06-20", "DISCONTINUED", doc_ids[0]),
        ("Lisinopril", "10 mg", "Once daily morning", "Oral", "Blood pressure regulation (ACE-inhibitor)", "2025-06-20", None, "ACTIVE", doc_ids[1]),
        ("Atorvastatin", "20 mg", "Once daily at bedtime", "Oral", "Lipid and cholesterol management", "2025-06-20", None, "ACTIVE", doc_ids[1]),
        ("CoQ10", "100 mg", "Once daily", "Oral", "Cardiovascular dietary supplement", "2026-02-16", None, "ACTIVE", doc_ids[4]),
    ]

    for name, dose, freq, route, purp, s_date, e_date, stat, d_id in med_records:
        insert_medication(
            Medication(
                name=name,
                dosage=dose,
                frequency=freq,
                route=route,
                purpose=purp,
                start_date=s_date,
                end_date=e_date,
                status=stat
            ),
            patient_id=DEMO_PATIENT_ID,
            document_id=d_id,
            db_path=db_path
        )

    # 7. Insert Symptoms
    symptom_records = [
        ("Persistent fatigue & polyuria", "MODERATE", "2025-03-01", "RESOLVED", "Baseline pre-treatment complaint", doc_ids[0]),
        ("Morning orthostatic lightheadedness", "MILD", "2025-06-10", "RESOLVED", "Resolved upon discontinuing Hydrochlorothiazide", doc_ids[1]),
        ("Mild morning joint stiffness", "MILD", "2026-01-05", "CURRENT", "Reported at endocrinology review", doc_ids[3]),
        ("Occasional late afternoon tiredness", "MILD", "2026-02-10", "CURRENT", "Documented at quarterly wellness follow-up", doc_ids[4]),
    ]

    for sym, sev, onset, stat, notes, d_id in symptom_records:
        insert_symptom(
            Symptom(
                symptom=sym,
                severity=sev,
                onset_date=onset,
                status=stat,
                notes=notes
            ),
            patient_id=DEMO_PATIENT_ID,
            document_id=d_id,
            db_path=db_path
        )

    # 8. Insert Timeline Events
    timeline_records = [
        ("2026-02-16", "Clinical Encounter", "Quarterly Follow-up Review", "HbA1c sustained at 6.2%. Total cholesterol down to 188 mg/dL. All vitals at goal.", doc_ids[4]),
        ("2026-01-15", "Doctor Visit", "Endocrinology & Metabolic Review", "Confirmed substantial HbA1c reduction (6.5%). Lipid target achieved on Atorvastatin 20mg.", doc_ids[3]),
        ("2025-10-10", "Lab Report", "Comprehensive Metabolic & Lipid Panel", "HbA1c reduced to 7.1% (from 7.8%). Fasting glucose decreased to 138 mg/dL.", doc_ids[2]),
        ("2025-06-20", "Prescription", "Cardiology Regimen Optimization", "Switched diuretic to Lisinopril 10mg. Initiated Atorvastatin 20mg nightly.", doc_ids[1]),
        ("2025-03-15", "Hospital Report", "Annual Wellness & Baseline Panel", "Baseline diagnosis of Type 2 Diabetes (HbA1c 7.8%) and Hypertension (BP 148/92).", doc_ids[0]),
    ]

    for dt, cat, title, desc, d_id in timeline_records:
        insert_timeline_event(
            TimelineEvent(
                event_date=dt,
                category=cat,
                title=title,
                description=desc,
                document_id=d_id
            ),
            patient_id=DEMO_PATIENT_ID,
            document_id=d_id,
            db_path=db_path
        )

    return {
        "success": True,
        "patient_id": DEMO_PATIENT_ID,
        "patient_created": patient_created,
        "patient_name": DEMO_PATIENT_NAME,
        "documents_count": len(generated_pdfs),
        "lab_results_count": len(lab_records),
        "medications_count": len(med_records),
        "symptoms_count": len(symptom_records),
        "timeline_events_count": len(timeline_records)
    }


if __name__ == "__main__":
    result = load_demo_patient()
    print("Demo Patient Loaded Successfully:")
    print(result)
