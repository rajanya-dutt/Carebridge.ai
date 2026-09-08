import os, sys, json, time
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
Clinical Advice: Follow-up in 3 months. Maintain prescribed medication schedule regularly."""

test_langs = [
    "English", "Hindi", "Bengali", "Assamese", "Odia", "Tamil", 
    "Telugu", "Marathi", "Gujarati", "Kannada", "Malayalam", "Punjabi", "Urdu"
]

results = {}
for lang in test_langs:
    t0 = time.time()
    try:
        res = engine.translate_and_explain_medical_content(test_text, target_language=lang)
        duration = round(time.time() - t0, 2)
        results[lang] = {
            "success": res.get("success"),
            "model_used": res.get("model_used"),
            "duration": duration,
            "translated_snippet": (res.get("translated_content") or "")[:120],
            "explanation_snippet": (res.get("simplified_explanation") or "")[:120],
            "key_terms_count": len(res.get("key_terms") or [])
        }
    except Exception as e:
        results[lang] = {"success": False, "error": str(e)}

with open(os.path.join(_PROJECT_ROOT, "scratch", "translation_test_output.json"), "w", encoding="utf-8") as f:
    json.dump(results, f, indent=2, ensure_ascii=False)

print("Translation testing complete!")
