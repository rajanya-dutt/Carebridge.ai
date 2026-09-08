"""AI Doctor Brief Generation & Clinical Summary API."""

from datetime import datetime
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException
from database.database import (
    get_patient,
    get_documents,
    get_lab_results,
    get_medications,
    get_symptoms,
    get_timeline
)
from backend.api.trends import calculate_biomarker_shifts
from ai.ai_engine import AIEngine

router = APIRouter()
ai_engine = AIEngine()


def build_brief_bundle(patient_id: str) -> Dict[str, Any]:
    """Assembles all relevant clinical facts from SQLite for the patient."""
    patient = get_patient(patient_id) or {}
    documents = get_documents(patient_id)
    labs = get_lab_results(patient_id)
    meds = get_medications(patient_id)
    symptoms = get_symptoms(patient_id)
    timeline = get_timeline(patient_id)

    shifts = calculate_biomarker_shifts(labs)
    active_meds = [m for m in meds if (m.get("status") or "").upper() == "ACTIVE"]
    disc_meds = [m for m in meds if (m.get("status") or "").upper() in ["DISCONTINUED", "INACTIVE", "PRIOR", "SUPERSEDED", "HISTORICAL"]]

    recent_docs = [
        {"file_name": d.get("file_name"), "type": d.get("file_type"), "date": d.get("document_date")}
        for d in documents[:5]
    ]

    ec_name = patient.get('emergency_contact_name')
    ec_phone = patient.get('emergency_contact_phone')
    ec_str = f"{ec_name} ({ec_phone})" if ec_name else "None documented"

    return {
        "patient_profile": {
            "id": patient_id,
            "name": patient.get("name") or "Unnamed Patient",
            "age": patient.get("age"),
            "gender": patient.get("gender"),
            "blood_group": patient.get("blood_group"),
            "chronic_conditions": patient.get("chronic_conditions") or patient.get("important_conditions") or "None documented",
            "known_allergies": patient.get("allergies") or "None documented",
            "emergency_contact": ec_str
        },
        "recent_encounters": timeline[:5],
        "key_biomarker_shifts": shifts,
        "recent_labs": labs[-10:] if labs else [],
        "active_medications": active_meds,
        "discontinued_medications": disc_meds,
        "reported_symptoms": symptoms[:6],
        "important_documents": recent_docs,
        "generated_timestamp": datetime.now().strftime("%Y-%m-%d %H:%M")
    }


@router.get("/patients/{patient_id}/doctor-brief")
def get_doctor_brief_data(patient_id: str):
    """Retrieve structured clinical encounter facts for the patient."""
    patient = get_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")

    bundle = build_brief_bundle(patient_id)
    return {"success": True, "patient_id": patient_id, "data_bundle": bundle}


import hashlib
import json

# In-memory Doctor Brief Cache (keyed by patient_id:bundle_data_hash)
_DOCTOR_BRIEF_CACHE: Dict[str, Dict[str, Any]] = {}


@router.post("/patients/{patient_id}/doctor-brief/generate")
def generate_ai_doctor_brief(patient_id: str, force: bool = False):
    """Invoke Gemini 3.6 Flash to synthesize an appointment-ready, 1-page clinician brief."""
    patient = get_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")

    bundle = build_brief_bundle(patient_id)

    # Compute stable hash of patient clinical facts (excluding fluctuating timestamp)
    hashable_bundle = {k: v for k, v in bundle.items() if k != "generated_timestamp"}
    bundle_hash = hashlib.md5(json.dumps(hashable_bundle, sort_keys=True, default=str).encode("utf-8")).hexdigest()
    cache_key = f"{patient_id}:{bundle_hash}"

    # Return cached brief if patient records have not changed and force is False
    if not force and cache_key in _DOCTOR_BRIEF_CACHE:
        cached_result = _DOCTOR_BRIEF_CACHE[cache_key]
        return {
            "success": True,
            "patient_id": patient_id,
            "brief": cached_result["brief"],
            "raw_bundle": bundle,
            "cached": True
        }

    try:
        ai_brief = ai_engine.generate_doctor_brief(bundle)
        if ai_brief.get("success"):
            _DOCTOR_BRIEF_CACHE[cache_key] = {
                "brief": ai_brief,
                "timestamp": bundle.get("generated_timestamp")
            }

        return {
            "success": True,
            "patient_id": patient_id,
            "brief": ai_brief,
            "raw_bundle": bundle,
            "cached": False
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate doctor brief: {str(e)}")
