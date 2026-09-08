import sys
import os
import time

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from ai.ai_engine import AIEngine

engine = AIEngine()
sample_text = """CLINICAL SUMMARY FOR PRIYA SHARMA
Age: 38, Gender: Female, Blood Group: O+
Chronic Conditions: Asthma
Known Allergies: Penicillin allergy suspected
Current Active Medications: Amoxicillin 500mg (twice daily)
Clinical Advice: Follow-up in 2 weeks. Maintain prescribed medication schedule regularly."""

t0 = time.time()
res = engine.translate_and_explain_medical_content(
    content=sample_text,
    target_language="Bengali"
)
t1 = time.time()
print(f"Translation completed in {t1 - t0:.2f}s, Success: {res.get('success')}")
if res.get("success"):
    print("Translated text:", res.get("translated_content")[:200])
else:
    print("Error:", res.get("error"))
