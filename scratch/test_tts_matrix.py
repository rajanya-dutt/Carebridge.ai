"""Comprehensive Full-Text Multilingual TTS Test Matrix for CAREBRIDGE."""

import os
import sys
import unittest

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from components.translation import (
    LANGUAGE_CONFIG,
    clean_text_for_tts,
    chunk_text_for_tts,
    generate_complete_tts_audio,
    build_source_content
)
from database.database import init_db, get_patient


class TestFullTextTTSMatrix(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()

    def test_clean_text_for_tts(self):
        """Verify markdown and HTML stripping without losing text content."""
        raw = "### **জরুরি নির্দেশনা**\n- আপনার **উচ্চ রক্তচাপ** আছে। `মেটফর্মিন` নিয়মিত গ্রহণ করুন।\n<div class='note'>ডাক্তারের পরামর্শ মেনে চলুন।</div>"
        cleaned = clean_text_for_tts(raw)
        self.assertNotIn("**", cleaned)
        self.assertNotIn("###", cleaned)
        self.assertNotIn("<div", cleaned)
        self.assertIn("জরুরি নির্দেশনা", cleaned)
        self.assertIn("উচ্চ রক্তচাপ", cleaned)
        self.assertIn("মেটফর্মিন", cleaned)
        print("\n[PASS] clean_text_for_tts successfully stripped markdown symbols without loss of words")

    def test_chunk_text_for_tts(self):
        """Verify natural sentence boundary chunking."""
        long_bengali_doc = (
            "আপনার সাম্প্রতিক রক্ত পরীক্ষার ফলাফল অনুযায়ী রক্তে শর্করার মাত্রা কিছুটা বেশি পাওয়া গেছে। "
            "ডাক্তার আপনাকে মেটফর্মিন ৫০০ মিলিগ্রাম ওষুধটি নিয়মিত খাবারের সাথে গ্রহণ করার পরামর্শ দিয়েছেন। "
            "এর পাশাপাশি প্রতিদিন অন্তত ৩০ মিনিট হালকা ব্যায়াম এবং সুষম খাদ্য গ্রহণ আপনার স্বাস্থ্যের উন্নতি ঘটাবে। "
            "পরবর্তী ৩ মাস পর পুনরায় রক্ত পরীক্ষা করানোর জন্য ডাক্তারের সাথে দেখা করবেন। "
            "কোনো রকম অসুবিধা বা মাথা ঘোরার অনুভূতি হলে তৎক্ষণাৎ চিকিৎসকের সাথে যোগাযোগ করুন।"
        )
        chunks = chunk_text_for_tts(long_bengali_doc, max_chunk_chars=250)
        self.assertGreaterEqual(len(chunks), 2, "Long text must be split into multiple chunks")
        
        # Verify no words are clipped
        reconstructed_text = " ".join(chunks)
        for word in ["রক্ত", "মেটফর্মিন", "ব্যায়াম", "পরীক্ষা"]:
            self.assertIn(word, reconstructed_text)

        print(f"[PASS] chunk_text_for_tts divided text into {len(chunks)} safe sentence chunks")

    def test_bengali_full_text_audio_generation(self):
        """Verify complete full-text Bengali narration without any truncation."""
        long_bengali_doc = (
            "আপনার উচ্চ রক্তচাপ আছে। ডাক্তার যে রক্তচাপের ওষুধ দিয়েছেন, সেটি নিয়মিত চালিয়ে যেতে হবে। "
            "আপনার চিকিৎসকের পরামর্শ অনুযায়ী নিয়মিত রক্তচাপ পরীক্ষা করুন এবং পরবর্তী অ্যাপয়েন্টমেন্ট মিস করবেন না।"
        )
        meta = LANGUAGE_CONFIG["বাংলা / Bengali"]
        audio_bytes, chunks, orig_len, clean_len = generate_complete_tts_audio(long_bengali_doc, meta["gtts_code"])
        
        self.assertIsNotNone(audio_bytes, "Bengali complete audio synthesis returned None")
        self.assertGreater(len(audio_bytes), 20000, "Bengali audio size is too small for full text")
        self.assertEqual(orig_len, len(long_bengali_doc))
        self.assertGreater(clean_len, 0)
        print(f"[PASS] Complete Bengali Full-Text Audio Generated: {len(audio_bytes)} bytes ({round(len(audio_bytes)/1024, 1)} KB), {len(chunks)} chunks")

    def test_all_languages_full_text_narration(self):
        """Verify complete audio synthesis for all 11 languages with multi-sentence input."""
        test_paragraph = (
            "CAREBRIDGE health summary report. Your blood pressure and vital signs have been successfully updated. "
            "Please follow the prescribed schedule and consult your primary care doctor for follow-up evaluation."
        )

        print("\n" + "=" * 80)
        print(f"{'Language':<30} | {'TTS Code':<10} | {'Status':<8} | {'Chunks':<8} | {'Audio Size':<12}")
        print("=" * 80)

        for lang_name, meta in LANGUAGE_CONFIG.items():
            tts_code = meta["gtts_code"]
            audio_bytes, chunks, orig_len, clean_len = generate_complete_tts_audio(test_paragraph, tts_code)
            
            self.assertIsNotNone(audio_bytes, f"Audio failed for {lang_name}")
            self.assertGreater(len(audio_bytes), 1000, f"Audio too small for {lang_name}")
            
            size_kb = f"{round(len(audio_bytes)/1024, 1)} KB"
            print(f"{meta['label']:<30} | {tts_code:<10} | {'[PASS]':<8} | {len(chunks):<8} | {size_kb:<12}")

        print("=" * 80)

    def test_patient_isolation_full_text(self):
        """Verify complete text audio generation produces distinct content for distinct patients."""
        c101 = build_source_content("P101", "👨‍⚕️ Doctor Brief")
        c102 = build_source_content("P102", "👨‍⚕️ Doctor Brief")

        audio_101, _, _, _ = generate_complete_tts_audio(c101["text"], "bn")
        audio_102, _, _, _ = generate_complete_tts_audio(c102["text"], "bn")

        self.assertIsNotNone(audio_101)
        self.assertIsNotNone(audio_102)
        self.assertNotEqual(audio_101, audio_102, "Patient audio streams must be distinct")
        print("[PASS] Patient isolation verified: Rahul (P101) and Priya (P102) produced distinct audio")


if __name__ == "__main__":
    unittest.main(verbosity=2)
