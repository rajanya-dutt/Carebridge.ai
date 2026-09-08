"""Medication & Prescription Regimen Tracking API."""

from fastapi import APIRouter, HTTPException
from database.database import get_medications, get_patient, get_documents

router = APIRouter()


@router.get("/patients/{patient_id}/medications")
def get_patient_medications(patient_id: str):
    """Retrieve all current active, superseded/historical, and pending prescription medications."""
    patient = get_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")

    meds = get_medications(patient_id)
    docs = get_documents(patient_id)
    doc_map = {d["id"]: d.get("file_name") or "Medical Record" for d in docs}

    # Enrich medications with source document name
    enriched_meds = []
    for m in meds:
        m_dict = dict(m)
        m_dict["source_document_name"] = doc_map.get(m.get("document_id"), "Prescription Document")
        enriched_meds.append(m_dict)

    active_meds = [m for m in enriched_meds if (m.get("status") or "").upper() == "ACTIVE"]
    disc_meds = [m for m in enriched_meds if (m.get("status") or "").upper() in ["DISCONTINUED", "INACTIVE", "PRIOR", "SUPERSEDED", "HISTORICAL"]]
    pending_meds = [m for m in enriched_meds if (m.get("status") or "").upper() == "PENDING_VERIFICATION"]

    return {
        "success": True,
        "patient_id": patient_id,
        "active_medications": active_meds,
        "historical_medications": disc_meds,
        "pending_medications": pending_meds,
        "all_medications": enriched_meds,
        "allergies": patient.get("allergies")
    }
