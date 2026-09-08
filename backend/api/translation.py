"""Multilingual Medical Translation & Full-Text TTS Narration API."""

import io
import re
import base64
from typing import Dict, Any, Optional, List, Tuple
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database.database import (
    get_patient,
    get_documents,
    get_medications,
    get_symptoms,
    get_timeline,
    get_active_prescription_info
)
from backend.api.doctor_brief import build_brief_bundle
from ai.ai_engine import AIEngine

try:
    from gtts import gTTS
    GTTS_AVAILABLE = True
except ImportError:
    GTTS_AVAILABLE = False

router = APIRouter()
ai_engine = AIEngine()

# =====================================================================
# CENTRALIZED 13 SUPPORTED LANGUAGE CONFIGURATION
# =====================================================================
LANGUAGE_CONFIG = {
    "English": {
        "display_name": "English",
        "native_name": "English",
        "translation_code": "en",
        "tts_code": "en",
        "enabled": True,
        "code": "en-US",
        "gtts_code": "en",
        "label": "English",
        "name": "English"
    },
    "हिन्दी / Hindi": {
        "display_name": "Hindi",
        "native_name": "हिन्दी",
        "translation_code": "hi",
        "tts_code": "hi",
        "enabled": True,
        "code": "hi-IN",
        "gtts_code": "hi",
        "label": "Hindi",
        "name": "Hindi (हिन्दी)"
    },
    "বাংলা / Bengali": {
        "display_name": "Bengali",
        "native_name": "বাংলা",
        "translation_code": "bn",
        "tts_code": "bn",
        "enabled": True,
        "code": "bn-IN",
        "gtts_code": "bn",
        "label": "Bengali",
        "name": "Bengali (বাংলা)"
    },
    "অসমীয়া / Assamese": {
        "display_name": "Assamese",
        "native_name": "অসমীয়া",
        "translation_code": "as",
        "tts_code": None,
        "enabled": True,
        "code": "as-IN",
        "gtts_code": None,
        "label": "Assamese",
        "name": "Assamese (অসমীয়া)"
    },
    "ଓଡ଼ିଆ / Odia": {
        "display_name": "Odia",
        "native_name": "ଓଡ଼ିଆ",
        "translation_code": "or",
        "tts_code": None,
        "enabled": True,
        "code": "or-IN",
        "gtts_code": None,
        "label": "Odia",
        "name": "Odia (ଓଡ଼ିଆ)"
    },
    "தமிழ் / Tamil": {
        "display_name": "Tamil",
        "native_name": "தமிழ்",
        "translation_code": "ta",
        "tts_code": "ta",
        "enabled": True,
        "code": "ta-IN",
        "gtts_code": "ta",
        "label": "Tamil",
        "name": "Tamil (தமிழ்)"
    },
    "తెలుగు / Telugu": {
        "display_name": "Telugu",
        "native_name": "తెలుగు",
        "translation_code": "te",
        "tts_code": "te",
        "enabled": True,
        "code": "te-IN",
        "gtts_code": "te",
        "label": "Telugu",
        "name": "Telugu (తెలుగు)"
    },
    "मराठी / Marathi": {
        "display_name": "Marathi",
        "native_name": "मराठी",
        "translation_code": "mr",
        "tts_code": "mr",
        "enabled": True,
        "code": "mr-IN",
        "gtts_code": "mr",
        "label": "Marathi",
        "name": "Marathi (मराठी)"
    },
    "ગુજરાતી / Gujarati": {
        "display_name": "Gujarati",
        "native_name": "ગુજરાતી",
        "translation_code": "gu",
        "tts_code": "gu",
        "enabled": True,
        "code": "gu-IN",
        "gtts_code": "gu",
        "label": "Gujarati",
        "name": "Gujarati (ગુજરાતી)"
    },
    "ಕನ್ನಡ / Kannada": {
        "display_name": "Kannada",
        "native_name": "ಕನ್ನಡ",
        "translation_code": "kn",
        "tts_code": "kn",
        "enabled": True,
        "code": "kn-IN",
        "gtts_code": "kn",
        "label": "Kannada",
        "name": "Kannada (ಕನ್ನಡ)"
    },
    "മലയാളം / Malayalam": {
        "display_name": "Malayalam",
        "native_name": "മലയാളം",
        "translation_code": "ml",
        "tts_code": "ml",
        "enabled": True,
        "code": "ml-IN",
        "gtts_code": "ml",
        "label": "Malayalam",
        "name": "Malayalam (മലയാളം)"
    },
    "ਪੰਜਾਬੀ / Punjabi": {
        "display_name": "Punjabi",
        "native_name": "ਪੰਜਾਬੀ",
        "translation_code": "pa",
        "tts_code": "pa",
        "enabled": True,
        "code": "pa-IN",
        "gtts_code": "pa",
        "label": "Punjabi",
        "name": "Punjabi (ਪੰਜਾਬੀ)"
    },
    "اردو / Urdu": {
        "display_name": "Urdu",
        "native_name": "اردو",
        "translation_code": "ur",
        "tts_code": "ur",
        "enabled": True,
        "code": "ur-IN",
        "gtts_code": "ur",
        "label": "Urdu",
        "name": "Urdu (اردو)"
    }
}


def clean_text_for_tts(text: str) -> str:
    """Strips markdown and HTML artifacts while preserving complete Unicode text and punctuation."""
    if not text:
        return ""
    t = re.sub(r'<[^>]+>', ' ', text)
    t = re.sub(r'#+\s*', '', t)
    t = re.sub(r'\*\*([^*]+)\*\*', r'\1', t)
    t = re.sub(r'\*([^*]+)\*', r'\1', t)
    t = t.replace('`', '')
    t = re.sub(r'[-•*]\s+', '', t)
    t = re.sub(r'[\r\t]+', ' ', t)
    t = re.sub(r'\s+', ' ', t).strip()
    return t


def chunk_text_for_tts(text: str, max_chunk_chars: int = 350) -> List[str]:
    """Splits full-length text into safe sentence/paragraph boundaries for continuous speech synthesis."""
    cleaned = clean_text_for_tts(text)
    if not cleaned:
        return []

    sentences = re.split(r'([।\.?!;\n]+)', cleaned)
    reconstructed = []
    for i in range(0, len(sentences) - 1, 2):
        s = (sentences[i] + sentences[i+1]).strip()
        if s:
            reconstructed.append(s)
    if len(sentences) % 2 == 1 and sentences[-1].strip():
        reconstructed.append(sentences[-1].strip())

    if not reconstructed:
        reconstructed = [cleaned]

    chunks: List[str] = []
    current_chunk = ""
    for s in reconstructed:
        if not s:
            continue
        if len(current_chunk) + len(s) + 1 <= max_chunk_chars:
            current_chunk = (current_chunk + " " + s).strip() if current_chunk else s
        else:
            if current_chunk:
                chunks.append(current_chunk)
            current_chunk = s
    if current_chunk:
        chunks.append(current_chunk)

    return chunks


def generate_complete_tts_audio(full_text: str, gtts_lang: str) -> Tuple[Optional[bytes], List[str], int, int]:
    """Generates continuous full-text MP3 audio by synthesizing natural sentence chunks and merging them."""
    if not GTTS_AVAILABLE or not full_text or not full_text.strip() or not gtts_lang:
        return None, [], 0, 0

    cleaned_text = clean_text_for_tts(full_text)
    chunks = chunk_text_for_tts(cleaned_text, max_chunk_chars=350)

    if not chunks:
        return None, [], len(full_text), 0

    audio_segments: List[bytes] = []
    for chunk in chunks:
        try:
            tts = gTTS(text=chunk, lang=gtts_lang)
            fp = io.BytesIO()
            tts.write_to_fp(fp)
            fp.seek(0)
            chunk_bytes = fp.read()
            if chunk_bytes and len(chunk_bytes) > 100:
                audio_segments.append(chunk_bytes)
        except Exception:
            continue

    if not audio_segments:
        return None, chunks, len(full_text), len(cleaned_text)

    combined_audio = b"".join(audio_segments)
    return combined_audio, chunks, len(full_text), len(cleaned_text)


def build_patient_source_content(patient_id: str, content_type: str) -> Dict[str, Any]:
    """Retrieves patient-specific medical text for the selected content category."""
    patient = get_patient(patient_id) or {}
    pat_name = patient.get("name", "Patient")

    if "Doctor Brief" in content_type:
        brief_data = build_brief_bundle(patient_id)
        active_meds_str = ", ".join([f"{m['name']} ({m.get('dosage', '')})" for m in brief_data.get("active_medications", [])]) or "None recorded"
        conditions_str = patient.get("chronic_conditions") or patient.get("important_conditions") or "None documented"
        allergies_str = patient.get("allergies") or "None documented"
        recent_encounters = "; ".join([f"{e.get('event_date', '')}: {e.get('title', '')} - {e.get('description', '')}" for e in brief_data.get("recent_encounters", [])[:3]]) or "No recent encounters"

        return {
            "title": f"Doctor Brief for {pat_name}",
            "text": (
                f"CLINICAL SUMMARY FOR {pat_name.upper()}\n"
                f"Age: {patient.get('age', 'N/A')}, Gender: {patient.get('gender', 'N/A')}, Blood Group: {patient.get('blood_group', 'N/A')}\n"
                f"Chronic Conditions: {conditions_str}\n"
                f"Known Allergies: {allergies_str}\n"
                f"Current Active Medications: {active_meds_str}\n"
                f"Recent Clinical Encounters: {recent_encounters}\n"
                f"Clinical Advice: Follow-up required. Maintain prescribed medication schedule regularly. Report any new adverse symptoms to your physician."
            )
        }
    elif "Prescription" in content_type:
        rx_info = get_active_prescription_info(patient_id)
        meds = rx_info.get("medications", [])
        if not meds:
            meds = [m for m in get_medications(patient_id) if m.get("status") == "ACTIVE"]

        if not meds:
            return {
                "title": f"Prescription for {pat_name}",
                "text": f"No active prescription currently recorded for {pat_name}."
            }

        lines = [f"PRESCRIPTION DETAILS FOR {pat_name.upper()}"]
        if rx_info.get("document_date"):
            lines.append(f"Prescription Date: {rx_info['document_date']}")
        lines.append("\nPRESCRIBED THERAPEUTIC REGIMEN:")
        for idx, m in enumerate(meds, 1):
            dosage = m.get("dosage") or "As directed"
            freq = m.get("frequency") or "Daily"
            purpose = f" (Indication: {m.get('purpose')})" if m.get("purpose") else ""
            lines.append(f"{idx}. {m.get('name')} — Dosage: {dosage}, Frequency: {freq}{purpose}")

        lines.append("\nINSTRUCTIONS: Take medications strictly as scheduled. Do not discontinue without medical advice.")
        return {
            "title": f"Active Prescription for {pat_name}",
            "text": "\n".join(lines)
        }
    elif "Document" in content_type:
        docs = get_documents(patient_id)
        if not docs:
            return {"title": f"Medical Documents for {pat_name}", "text": f"No ingested documents found for {pat_name}."}
        latest_doc = docs[0]
        text_content = latest_doc.get("extracted_text") or "No detailed extracted text available."
        return {
            "title": f"Document: {latest_doc.get('file_name')}",
            "text": f"DOCUMENT: {latest_doc.get('file_name')}\nDate: {latest_doc.get('document_date') or 'N/A'}\n\n{text_content}"
        }
    else:
        symptoms = get_symptoms(patient_id)
        sym_str = ", ".join([f"{s.get('symptom')} (Severity: {s.get('severity')})" for s in symptoms]) or "No active symptoms reported."
        return {
            "title": f"Reported Symptoms for {pat_name}",
            "text": f"PATIENT: {pat_name}\nReported Symptoms and Clinical Observations: {sym_str}"
        }


class TranslationRequest(BaseModel):
    content_type: str = "👨‍⚕️ Doctor Brief"
    target_language_key: str = "বাংলা / Bengali"
    custom_text: Optional[str] = None


class TTSRequest(BaseModel):
    text: str
    target_language_key: str = "বাংলা / Bengali"


@router.get("/languages")
def get_supported_languages():
    """Retrieve list of all 11 supported languages and their locale configurations."""
    return {"success": True, "languages": LANGUAGE_CONFIG}


@router.get("/patients/{patient_id}/source-content")
def get_source_content(patient_id: str, content_type: str = "👨‍⚕️ Doctor Brief"):
    """Retrieve patient-specific medical source content for the given category."""
    patient = get_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")

    bundle = build_patient_source_content(patient_id, content_type)
    return {"success": True, "source": bundle}


import hashlib
import time

# In-memory caches with strict patient-isolation
_TRANSLATION_CACHE: Dict[str, Dict[str, Any]] = {}
_TERMS_CACHE: Dict[str, Dict[str, Any]] = {}
_TTS_CACHE: Dict[str, Dict[str, Any]] = {}


@router.post("/patients/{patient_id}/translate")
def translate_medical_content(patient_id: str, req: TranslationRequest):
    """Translate and simplify medical records in patient-friendly native script with caching."""
    patient = get_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")

    # Resolve target language with fuzzy key matching fallback
    lang_meta = LANGUAGE_CONFIG.get(req.target_language_key)
    if not lang_meta:
        for k, v in LANGUAGE_CONFIG.items():
            if (req.target_language_key.lower() in k.lower() or 
                req.target_language_key.lower() in v.get("name", "").lower() or 
                req.target_language_key.lower() in v.get("display_name", "").lower() or
                req.target_language_key.lower() in v.get("label", "").lower()):
                lang_meta = v
                break

    if not lang_meta:
        raise HTTPException(status_code=400, detail="Translation for this language is not currently available.")

    source_bundle = build_patient_source_content(patient_id, req.content_type)
    source_text = req.custom_text if req.custom_text else source_bundle["text"]

    if not source_text or not source_text.strip():
        return {
            "success": True,
            "patient_id": patient_id,
            "target_language": lang_meta,
            "source_title": source_bundle["title"],
            "source_text": "",
            "result": {
                "simplified_explanation": "No medical content available to translate for this patient.",
                "patient_friendly_explanation": "No medical content available.",
                "translated_content": "",
                "translated_text": "",
                "speech_script": "",
                "key_terms": [],
                "key_terms_explained": [],
                "patient_action_points": []
            }
        }

    # Generate patient-isolated cache key
    text_hash = hashlib.md5(source_text.strip().encode("utf-8")).hexdigest()
    cache_key = f"{patient_id}:{lang_meta['name']}:{text_hash}"

    if cache_key in _TRANSLATION_CACHE:
        cached_result = _TRANSLATION_CACHE[cache_key]
        return {
            "success": True,
            "patient_id": patient_id,
            "target_language": lang_meta,
            "source_title": source_bundle["title"],
            "source_text": source_text,
            "from_cache": True,
            "result": cached_result
        }

    t0 = time.time()
    try:
        res = ai_engine.translate_and_explain_medical_content(
            content=source_text,
            target_language=lang_meta.get("display_name") or lang_meta["name"]
        )
        gen_duration = round(time.time() - t0, 2)
        
        result_payload = {
            **res,
            "simplified_explanation": res.get("simplified_explanation") or res.get("translated_content") or "",
            "patient_friendly_explanation": res.get("simplified_explanation") or res.get("translated_content") or "",
            "translated_content": res.get("translated_content") or "",
            "translated_text": res.get("translated_content") or "",
            "speech_script": res.get("speech_script") or res.get("simplified_explanation") or res.get("translated_content") or "",
            "key_terms": res.get("key_terms") or [],
            "key_terms_explained": res.get("key_terms") or [],
            "patient_action_points": res.get("patient_action_points") or [],
            "generation_duration_sec": gen_duration
        }

        # Cache successful translation
        if res.get("success"):
            _TRANSLATION_CACHE[cache_key] = result_payload

        return {
            "success": True,
            "patient_id": patient_id,
            "target_language": lang_meta,
            "source_title": source_bundle["title"],
            "source_text": source_text,
            "generation_duration_sec": gen_duration,
            "result": result_payload
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Translation failed: {str(e)}")


class ExplainTermsRequest(BaseModel):
    content_type: str = "👨‍⚕️ Doctor Brief"
    content_id: Optional[str] = None
    language: Optional[str] = None
    target_language_key: Optional[str] = "বাংলা / Bengali"
    custom_text: Optional[str] = None


@router.post("/patients/{patient_id}/explain-terms")
def explain_medical_terms_endpoint(patient_id: str, req: ExplainTermsRequest):
    """Extracts and explains key clinical terms in simple language for the active patient."""
    patient = get_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")

    # Resolve target language
    lang_key = req.target_language_key
    if not lang_key and req.language:
        for k, v in LANGUAGE_CONFIG.items():
            if (req.language.lower() in v.get("label", "").lower() or 
                req.language.lower() in v.get("name", "").lower() or 
                req.language.lower() in v.get("display_name", "").lower() or 
                req.language.lower() in k.lower()):
                lang_key = k
                break

    if not lang_key:
        lang_key = "বাংলা / Bengali"

    lang_meta = LANGUAGE_CONFIG.get(lang_key, LANGUAGE_CONFIG["বাংলা / Bengali"])

    # Resolve source text
    source_text = req.custom_text
    if not source_text:
        source_bundle = build_patient_source_content(patient_id, req.content_type)
        source_text = source_bundle["text"]

    if not source_text or not source_text.strip():
        return {
            "success": True,
            "patient_id": patient_id,
            "target_language": lang_meta,
            "terms": [],
            "message": "No clinical text available to extract terms."
        }

    # Generate cache key
    text_hash = hashlib.md5(source_text.strip().encode("utf-8")).hexdigest()
    cache_key = f"{patient_id}:{lang_meta['name']}:{text_hash}"

    if cache_key in _TERMS_CACHE:
        return {
            "success": True,
            "patient_id": patient_id,
            "target_language": lang_meta,
            "terms": _TERMS_CACHE[cache_key]["terms"],
            "cached": True
        }

    try:
        res = ai_engine.explain_medical_terms(
            content=source_text,
            target_language=lang_meta.get("display_name") or lang_meta["name"],
            patient_name=patient.get("name", "Patient")
        )
        terms = res.get("terms", [])
        
        # Cache terms under patient isolation key
        _TERMS_CACHE[cache_key] = {
            "terms": terms
        }

        return {
            "success": True,
            "patient_id": patient_id,
            "target_language": lang_meta,
            "terms": terms,
            "cached": False
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to explain medical terms: {str(e)}")



@router.post("/patients/{patient_id}/tts")
def synthesize_full_narration(patient_id: str, req: TTSRequest):
    """Synthesize complete full-text audio stream in the selected language."""
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="Text for TTS narration cannot be empty.")

    lang_meta = LANGUAGE_CONFIG.get(req.target_language_key)
    if not lang_meta:
        for k, v in LANGUAGE_CONFIG.items():
            if (req.target_language_key.lower() in k.lower() or 
                req.target_language_key.lower() in v.get("name", "").lower() or 
                req.target_language_key.lower() in v.get("display_name", "").lower()):
                lang_meta = v
                break

    if not lang_meta:
        raise HTTPException(status_code=400, detail=f"Unsupported language: {req.target_language_key}")

    gtts_lang = lang_meta.get("gtts_code") or lang_meta.get("tts_code")
    if not gtts_lang or not GTTS_AVAILABLE:
        return {
            "success": False,
            "tts_supported": False,
            "patient_id": patient_id,
            "language": lang_meta,
            "audio_base64": None,
            "message": f"Text-to-Speech audio is not currently available for {lang_meta.get('display_name')}, but full written translation and clinical explanation are available above."
        }

    text_hash = hashlib.md5(req.text.strip().encode("utf-8")).hexdigest()
    cache_key = f"{patient_id}:{gtts_lang}:{text_hash}"

    # Return cached audio if available for this patient and exact text
    if cache_key in _TTS_CACHE:
        cached_entry = _TTS_CACHE[cache_key]
        return {
            "success": True,
            "patient_id": patient_id,
            "language": lang_meta,
            "audio_base64": cached_entry["audio_base64"],
            "audio_size_bytes": cached_entry["audio_size_bytes"],
            "chunks_count": cached_entry["chunks_count"],
            "orig_chars": cached_entry["orig_chars"],
            "clean_chars": cached_entry["clean_chars"],
            "cached": True
        }

    audio_bytes, chunks, orig_len, clean_len = generate_complete_tts_audio(
        full_text=req.text,
        gtts_lang=gtts_lang
    )

    if not audio_bytes or len(audio_bytes) < 100:
        return {
            "success": False,
            "tts_supported": False,
            "patient_id": patient_id,
            "language": lang_meta,
            "audio_base64": None,
            "message": f"Voice generation could not complete audio stream for {lang_meta['name']}."
        }

    b64_str = base64.b64encode(audio_bytes).decode("utf-8")
    
    # Store in cache
    _TTS_CACHE[cache_key] = {
        "audio_base64": b64_str,
        "audio_size_bytes": len(audio_bytes),
        "chunks_count": len(chunks),
        "orig_chars": orig_len,
        "clean_chars": clean_len
    }

    return {
        "success": True,
        "patient_id": patient_id,
        "language": lang_meta,
        "audio_base64": b64_str,
        "audio_size_bytes": len(audio_bytes),
        "chunks_count": len(chunks),
        "orig_chars": orig_len,
        "clean_chars": clean_len,
        "cached": False
    }
