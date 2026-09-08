import os
import sys
import unittest

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.api.translation import LANGUAGE_CONFIG
from database.database import normalize_name, get_all_patients
from ai.ai_engine import AIEngine


class TestTargetedFixes(unittest.TestCase):

    def test_centralized_13_languages(self):
        """Verify all 13 supported languages exist in centralized config with all required keys."""
        required_languages = [
            "English",
            "हिन्दी / Hindi",
            "বাংলা / Bengali",
            "অসমীয়া / Assamese",
            "ଓଡ଼ିଆ / Odia",
            "தமிழ் / Tamil",
            "తెలుగు / Telugu",
            "मराठी / Marathi",
            "ગુજરાતી / Gujarati",
            "ಕನ್ನಡ / Kannada",
            "മലയാളം / Malayalam",
            "ਪੰਜਾਬੀ / Punjabi",
            "اردو / Urdu"
        ]
        self.assertEqual(len(LANGUAGE_CONFIG), 13)
        for lang_name in required_languages:
            self.assertIn(lang_name, LANGUAGE_CONFIG, f"Missing language: {lang_name}")
            entry = LANGUAGE_CONFIG[lang_name]
            self.assertIn("display_name", entry)
            self.assertIn("native_name", entry)
            self.assertIn("translation_code", entry)
            self.assertIn("tts_code", entry)
            self.assertIn("enabled", entry)
            self.assertTrue(entry["enabled"])

        # Check Assamese and Odia have tts_code None
        self.assertIsNone(LANGUAGE_CONFIG["অসমীয়া / Assamese"]["tts_code"])
        self.assertIsNone(LANGUAGE_CONFIG["ଓଡ଼ିଆ / Odia"]["tts_code"])

    def test_normalize_name(self):
        """Verify robust normalization for name comparison."""
        self.assertEqual(normalize_name("Priya Sharma"), "priya sharma")
        self.assertEqual(normalize_name("  PRIYA   SHARMA  "), "priya sharma")
        self.assertEqual(normalize_name("Dr. Priya Sharma"), "priya sharma")
        self.assertEqual(normalize_name("Mrs. Priya Sharma."), "priya sharma")
        self.assertEqual(normalize_name("Mr. Rahul Sharma"), "rahul sharma")
        self.assertNotEqual(normalize_name("Priya Sharma"), normalize_name("Rahul Sharma"))

    def test_ai_engine_translation_synthesis(self):
        """Verify AI Engine produces translations across regional languages."""
        engine = AIEngine()
        sample_text = "Diagnosis: Acute Bronchitis. Prescribed: Amoxicillin 500mg TDS for 5 days. Paracetamol 650mg SOS for fever."
        
        # Test translation across multiple languages
        test_languages = [
            "Hindi", "Bengali", "Tamil", "Telugu", "Marathi",
            "Gujarati", "Kannada", "Malayalam", "Punjabi", "Urdu",
            "Assamese", "Odia", "English"
        ]
        
        for lang in test_languages:
            res = engine.translate_and_explain_medical_content(sample_text, lang)
            self.assertTrue(res.get("success"), f"Failed translation for {lang}")
            explanation = res.get("simplified_explanation") or res.get("translated_content")
            self.assertTrue(bool(explanation), f"Empty explanation for {lang}")
            print(f"[OK] Verified {lang}: length={len(explanation)}")


if __name__ == "__main__":
    unittest.main()
