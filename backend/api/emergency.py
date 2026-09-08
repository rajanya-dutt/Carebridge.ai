"""One-Click Emergency Mode & ICE Clinical Triage API."""

from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database.database import (
    get_patient,
    get_emergency_profile,
    get_medications,
    insert_emergency_event,
    get_emergency_events,
    update_patient_emergency_contact
)

router = APIRouter()


class EmergencyContactRequest(BaseModel):
    name: str
    phone: Optional[str] = None
    relationship: Optional[str] = None


class LocationEventRequest(BaseModel):
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    accuracy: Optional[float] = None
    status: str = "ACQUIRED"
    action: str = "Location Dispatched"


@router.get("/patients/{patient_id}/emergency")
def get_emergency_mode_data(patient_id: str):
    """Retrieve instant high-contrast ICE medical emergency card for the active patient."""
    patient = get_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")

    meds = get_medications(patient_id)
    active_meds = [m for m in meds if (m.get("status") or "").upper() == "ACTIVE"]

    ec_name = patient.get("emergency_contact_name")
    ec_phone = patient.get("emergency_contact_phone")
    ec_rel = patient.get("emergency_contact_relationship")

    return {
        "success": True,
        "patient_id": patient_id,
        "profile": {
            "name": patient.get("name"),
            "age": patient.get("age"),
            "gender": patient.get("gender"),
            "blood_group": patient.get("blood_group") or "Unknown",
            "allergies": patient.get("allergies") or "None documented",
            "chronic_conditions": patient.get("chronic_conditions") or patient.get("important_conditions") or "None documented",
            "emergency_contact": {
                "name": ec_name if ec_name and ec_name.strip() else None,
                "phone": ec_phone if ec_phone and ec_phone.strip() else None,
                "relationship": ec_rel if ec_rel and ec_rel.strip() else None
            },
            "active_medications": active_meds
        }
    }


@router.put("/patients/{patient_id}/emergency-contact")
def set_emergency_contact_endpoint(patient_id: str, req: EmergencyContactRequest):
    """Update or configure the active patient's emergency contact."""
    patient = get_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")

    update_patient_emergency_contact(
        patient_id=patient_id,
        name=req.name,
        relationship=req.relationship,
        phone=req.phone
    )
    return {
        "success": True,
        "patient_id": patient_id,
        "emergency_contact": {
            "name": req.name,
            "relationship": req.relationship,
            "phone": req.phone
        },
        "message": "Emergency contact updated successfully."
    }


@router.post("/patients/{patient_id}/emergency/location")
def log_emergency_location(patient_id: str, req: LocationEventRequest):
    """Record a simulated or GPS emergency dispatch event in the audit trail."""
    patient = get_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")

    event_payload = {
        "latitude": req.latitude,
        "longitude": req.longitude,
        "location_accuracy": req.accuracy,
        "location_status": req.status,
        "actions": req.action,
        "status": "ACTIVE"
    }

    try:
        res = insert_emergency_event(event_payload, patient_id=patient_id)
        return {
            "success": True,
            "patient_id": patient_id,
            "event": event_payload,
            "message": "Emergency dispatch event logged successfully."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to record emergency event: {str(e)}")


@router.get("/patients/{patient_id}/emergency/events")
def get_patient_emergency_events(patient_id: str):
    """Retrieve audit history of emergency activations and dispatch events."""
    patient = get_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")

    events = get_emergency_events(patient_id)
    return {"success": True, "patient_id": patient_id, "events": events}
