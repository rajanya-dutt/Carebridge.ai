import json
import os
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key)

sample_source = """
CLINICAL SUMMARY FOR ALAMGIR MANDAL
Age: 58, Gender: Male, Blood Group: A+
Chronic Conditions: Hypertension, Type 2 Diabetes Mellitus
Known Allergies: Penicillin, Sulfa drugs
Current Active Medications: Metformin 500mg (Twice daily with meals), Lisinopril 10mg (Once daily morning)
Clinical Advice: Maintain prescribed medication schedule regularly. Monitor blood glucose and blood pressure weekly.
"""

target_languages = [
    ("Tamil", "தமிழ்"),
    ("Telugu", "తెలుగు"),
    ("Marathi", "मराठी"),
    ("Gujarati", "ગુજરાતી"),
    ("Kannada", "ಕನ್ನಡ"),
    ("Malayalam", "മലയാളം"),
    ("Punjabi", "ਪੰਜਾਬੀ"),
    ("Bengali", "বাংলা"),
    ("Hindi", "हिन्दी")
]

for lang_name, script_name in target_languages:
    prompt = f"""You are an expert medical translator and health literacy educator for CAREBRIDGE.

Your task is to translate and simplify the medical brief below into {lang_name} ({script_name}).

CRITICAL INSTRUCTIONS:
1. All translated text, simplified explanations, and spoken speech scripts MUST be written entirely in the native {lang_name} script ({script_name}).
2. Do NOT leave sentences in English.
3. Transliterate or explain medication names clearly in {lang_name} script (e.g. மெட்ஃபோர்மின் / మెట్‌ఫార్మిన్ / মেটফর্মিন) alongside dosages so the speech synthesizer speaks the entire explanation smoothly in {lang_name}.
4. Provide a rich, full, caring medical explanation covering the patient's condition, all prescribed medicines, instructions, and follow-up advice.

SOURCE CLINICAL CONTENT:
{sample_source}

Respond ONLY with a JSON object:
{{
  "target_language": "{lang_name}",
  "translated_content": "Complete accurate medical translation in native {script_name} script",
  "simplified_explanation": "Complete, conversational, reassuring patient explanation written 100% in native {script_name} script",
  "speech_script": "Complete spoken narration in native {script_name} script suitable for full TTS read-aloud",
  "key_terms": [
    {{
      "original_term": "Medical term in English",
      "translated_term": "Term in {script_name}",
      "simple_explanation": "Meaning in {script_name}"
    }}
  ],
  "patient_action_points": [
    "Key action point 1 in {script_name}",
    "Key action point 2 in {script_name}"
  ]
}}
"""

    resp = client.models.generate_content(
        model="gemini-3.6-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json"
        )
    )
    parsed = json.loads(resp.text)
    print(f"=== {lang_name} ({script_name}) ===")
    print(f"Simplified chars: {len(parsed.get('simplified_explanation', ''))}")
    print(f"Speech script chars: {len(parsed.get('speech_script', ''))}")
    print(f"Preview: {parsed.get('simplified_explanation', '')[:80]}...")
