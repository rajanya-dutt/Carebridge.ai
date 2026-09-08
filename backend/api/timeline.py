"""Longitudinal Health Timeline API."""

from fastapi import APIRouter, HTTPException
from database.database import get_timeline, get_patient

router = APIRouter()


@router.get("/patients/{patient_id}/timeline")
def get_patient_timeline(patient_id: str):
    """Retrieve chronological longitudinal health milestones, clinical encounters, and events."""
    patient = get_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")

    events = get_timeline(patient_id)
    return {"success": True, "patient_id": patient_id, "timeline": events}
