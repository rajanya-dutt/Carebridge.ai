import os
import sys

_PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from ai.ai_engine import AIEngine

engine = AIEngine()
test_text = """CLINICAL SUMMARY FOR PRIYA SHARMA
Age: 48, Gender: Female, Blood Group: B+
Chronic Conditions: Type 2 Diabetes, Essential Hypertension
Known Allergies: Penicillin
Current Active Medications: Metformin (500 mg), Lisinopril (10 mg)
Clinical Advice: Follow-up required. Maintain prescribed medication schedule regularly."""

test_langs = [
    "English",
    "Hindi",
    "Bengali",
    "Assamese",
    "Odia",
    "Tamil",
    "Telugu",
    "Marathi",
    "Gujarati",
    "Kannada",
    "Malayalam",
    "Punjabi",
    "Urdu"
]

print(f"Engine configured: {engine.is_configured()}")
for lang in test_langs:
    try:
        res = engine.translate_and_explain_medical_content(test_text, target_language=lang)
        trans = res.get("translated_content", "")
        simp = res.get("simplified_explanation", "")
        terms = res.get("key_terms", [])
        print(f"[{lang}] Success: {res.get('success')} | Model: {res.get('model_used')} | Trans len: {len(trans)} | Simp len: {len(simp)} | Terms count: {len(terms)}")
    except Exception as e:
        print(f"[{lang}] Error: {e}")
