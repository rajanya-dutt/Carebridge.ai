"""Comprehensive Regression & Patient Isolation Test Suite for CAREBRIDGE."""

import os
import sys
import unittest

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from database.database import (
    init_db,
    get_patient,
    get_all_patients,
    get_documents,
    get_medications,
    get_lab_results,
    get_timeline,
    get_symptoms,
    get_emergency_profile,
    get_doctor_brief_data,
    delete_prescription,
    insert_patient,
    insert_medical_document,
    insert_medication
)
from components.translation import build_source_content, SUPPORTED_LANGUAGES
from components.doctor_brief import prepare_brief_data_bundle
from components.dashboard import compute_informational_shifts
from components.trends import analyze_biomarker_trends


class TestCareBridgeRegression(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()

    def test_patients_exist(self):
        patients = get_all_patients()
        self.assertGreaterEqual(len(patients), 2, "Must have at least 2 patients for isolation testing")
        p_ids = [p["id"] for p in patients]
        self.assertIn("P101", p_ids)
        self.assertIn("P102", p_ids)

    def test_patient_isolation_demographics(self):
        p101 = get_patient("P101")
        p102 = get_patient("P102")

        self.assertIsNotNone(p101)
        self.assertIsNotNone(p102)
        self.assertNotEqual(p101["name"], p102["name"])
        self.assertNotEqual(p101["id"], p102["id"])

        print(f"\n[PASS] Patient P101: {p101['name']} (Blood: {p101.get('blood_group')}, Allergies: {p101.get('allergies')})")
        print(f"[PASS] Patient P102: {p102['name']} (Blood: {p102.get('blood_group')}, Allergies: {p102.get('allergies')})")

    def test_patient_isolation_medications(self):
        meds101 = get_medications("P101")
        meds102 = get_medications("P102")

        for m in meds101:
            self.assertEqual(m["patient_id"], "P101", "Medication leaked into P101 from another patient")
        for m in meds102:
            self.assertEqual(m["patient_id"], "P102", "Medication leaked into P102 from another patient")

        print(f"[PASS] Medications isolated: P101 has {len(meds101)} meds, P102 has {len(meds102)} meds")

    def test_patient_isolation_timeline(self):
        timeline101 = get_timeline("P101")
        timeline102 = get_timeline("P102")

        for e in timeline101:
            self.assertEqual(e["patient_id"], "P101", "Timeline event leaked into P101")
        for e in timeline102:
            self.assertEqual(e["patient_id"], "P102", "Timeline event leaked into P102")

        print(f"[PASS] Timeline isolated: P101 has {len(timeline101)} events, P102 has {len(timeline102)} events")

    def test_patient_isolation_labs(self):
        labs101 = get_lab_results("P101")
        labs102 = get_lab_results("P102")

        for l in labs101:
            self.assertEqual(l["patient_id"], "P101", "Lab result leaked into P101")
        for l in labs102:
            self.assertEqual(l["patient_id"], "P102", "Lab result leaked into P102")

        print(f"[PASS] Lab results isolated: P101 has {len(labs101)} readings, P102 has {len(labs102)} readings")

    def test_doctor_brief_data_bundle_isolation(self):
        bundle101 = prepare_brief_data_bundle("P101")
        bundle102 = prepare_brief_data_bundle("P102")

        self.assertEqual(bundle101["patient_profile"]["name"], get_patient("P101")["name"])
        self.assertEqual(bundle102["patient_profile"]["name"], get_patient("P102")["name"])
        self.assertNotEqual(bundle101["patient_profile"]["name"], bundle102["patient_profile"]["name"])

        print("[PASS] Doctor brief data bundle strictly scoped by active_patient_id")

    def test_translation_source_content_isolation(self):
        for content_type in ["👨‍⚕️ Doctor Brief", "💊 Latest Prescription", "📄 Most Recent Medical Document", "🧬 Recent Timeline & Health Milestones"]:
            c101 = build_source_content("P101", content_type)
            c102 = build_source_content("P102", content_type)

            p101_name = get_patient("P101")["name"]
            p102_name = get_patient("P102")["name"]

            # Content for P101 must not contain P102's name, and vice versa
            self.assertNotIn(p102_name.upper(), c101["text"].upper())
            self.assertNotIn(p101_name.upper(), c102["text"].upper())

        print("[PASS] Translation source content strictly scoped by active_patient_id for all 4 content types")

    def test_delete_prescription_scoping(self):
        # Insert a temporary test doc and medication for P101
        doc_id = "DOC_TEST_ISOLATION_999"
        insert_medical_document({
            "id": doc_id,
            "patient_id": "P101",
            "file_name": "test_isolation.pdf",
            "document_type": "Prescription",
            "document_date": "2026-08-20",
            "extracted_text": "Amoxicillin 500mg"
        }, patient_id="P101")
        insert_medication({
            "id": "MED_TEST_ISOLATION_999",
            "patient_id": "P101",
            "document_id": doc_id,
            "name": "TestAmoxicillin",
            "dosage": "500mg",
            "status": "ACTIVE"
        }, patient_id="P101", document_id=doc_id)

        p102_meds_before = len(get_medications("P102"))
        
        # Delete using patient_id="P101"
        del_res = delete_prescription(doc_id, patient_id="P101")
        self.assertTrue(del_res.get("success"), f"Deletion failed: {del_res}")

        # Verify P102 meds count is unchanged
        p102_meds_after = len(get_medications("P102"))
        self.assertEqual(p102_meds_before, p102_meds_after, "Deleting P101 prescription affected P102!")

        # Verify test medication is deleted for P101
        p101_med_names = [m["name"] for m in get_medications("P101")]
        self.assertNotIn("TestAmoxicillin", p101_med_names)

        print("[PASS] Delete prescription is strictly isolated by document_id and patient_id")

    def test_supported_languages(self):
        self.assertIn("বাংলা / Bengali", SUPPORTED_LANGUAGES)
        self.assertIn("हिन्दी / Hindi", SUPPORTED_LANGUAGES)
        self.assertIn("English (Patient Simplified)", SUPPORTED_LANGUAGES)
        print(f"[PASS] {len(SUPPORTED_LANGUAGES)} regional languages supported with TTS voice mappings")

    def test_biomarker_trend_analysis(self):
        labs = get_lab_results("P101")
        shifts = compute_informational_shifts(labs)
        trends = analyze_biomarker_trends(labs, significance_pct_threshold=5.0)
        self.assertIsInstance(shifts, list)
        self.assertIsInstance(trends, list)
        print(f"[PASS] Computed {len(shifts)} biomarker shifts and {len(trends)} biomarker trajectories for P101")


if __name__ == "__main__":
    unittest.main(verbosity=2)
