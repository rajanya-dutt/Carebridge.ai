"""Prescription Management, Deletion & Status API."""

from fastapi import APIRouter, HTTPException
from database.database import (
    get_patient,
    get_prescriptions,
    get_active_prescription_info,
    delete_prescription,
    set_prescription_as_current
)

router = APIRouter()


@router.get("/patients/{patient_id}/prescriptions")
def list_patient_prescriptions(patient_id: str):
    """Retrieve all stored prescriptions with active/historical status."""
    patient = get_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")

    rx_list = get_prescriptions(patient_id)
    active_info = get_active_prescription_info(patient_id)
    current_doc_id = active_info.get("document_id")

    enriched = []
    for rx in rx_list:
        rx_dict = dict(rx)
        rx_dict["is_current"] = (rx_dict.get("id") == current_doc_id or rx_dict.get("document_id") == current_doc_id)
        enriched.append(rx_dict)

    return {
        "success": True,
        "patient_id": patient_id,
        "active_prescription_info": active_info,
        "prescriptions": enriched
    }


@router.delete("/patients/{patient_id}/prescriptions/{document_id}")
def remove_prescription(patient_id: str, document_id: str):
    """Delete a prescription and associated extracted medications/events for the patient."""
    patient = get_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")

    res = delete_prescription(document_id=document_id, patient_id=patient_id)
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error", "Prescription deletion failed."))

    from database.database import get_all_patients
    remaining_patients = get_all_patients()

    return {
        "success": True,
        "patient_id": patient_id,
        "document_id": document_id,
        "patient_cleaned": res.get("patient_cleaned", False),
        "cleanup_details": res.get("cleanup_details"),
        "remaining_patients": remaining_patients,
        "message": "Prescription successfully deleted and patient profile updated."
    }


@router.post("/patients/{patient_id}/prescriptions/{document_id}/set-current")
def make_prescription_current(patient_id: str, document_id: str):
    """Promote a historical or pending prescription to be the active therapeutic regimen."""
    patient = get_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")

    set_prescription_as_current(document_id=document_id, patient_id=patient_id)
    return {
        "success": True,
        "patient_id": patient_id,
        "document_id": document_id,
        "message": "Prescription promoted to current active regimen."
    }
