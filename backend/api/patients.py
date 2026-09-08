import os
import uuid
import re
from typing import Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from database.database import (
    get_all_patients,
    get_patient,
    get_documents,
    get_medications,
    get_lab_results,
    get_timeline,
    insert_patient,
    delete_patient as db_delete_patient,
    find_patient_by_name,
    normalize_name,
    save_extracted_document_bundle,
    cleanup_orphaned_patient
)
from database.models import Patient as PatientModel
from ai.workflow import IngestionWorkflow
from data.demo_data import load_demo_patient

router = APIRouter()
workflow = IngestionWorkflow()

ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".webp", ".heic", ".heif"}


@router.get("/patients")
def list_patients():
    """Retrieve all patients registered in the database."""
    patients = get_all_patients()
    return {"success": True, "patients": patients}


@router.get("/patients/{patient_id}/dashboard-stats")
def get_patient_dashboard_stats(patient_id: str):
    """Retrieve consolidated counts and status indicators for the executive dashboard."""
    patient = get_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")

    docs = get_documents(patient_id)
    meds = get_medications(patient_id)
    labs = get_lab_results(patient_id)
    timeline = get_timeline(patient_id)

    active_meds = [m for m in meds if m.get("status") == "ACTIVE"]
    latest_doc_date = docs[0].get("document_date") if (docs and docs[0].get("document_date")) else None

    return {
        "success": True,
        "patient": patient,
        "stats": {
            "documents_count": len(docs),
            "active_medications_count": len(active_meds),
            "total_medications_count": len(meds),
            "lab_results_count": len(labs),
            "timeline_events_count": len(timeline),
            "active_emergency_alerts_count": 0,
            "has_records": len(docs) > 0 or len(meds) > 0 or len(labs) > 0,
            "latest_document_date": latest_doc_date
        }
    }


@router.get("/patients/{patient_id}")
def get_patient_profile(patient_id: str):
    """Retrieve complete demographic and clinical profile for a specific patient."""
    patient = get_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")
    return {"success": True, "patient": patient}


@router.delete("/patients/{patient_id}")
def delete_patient_endpoint(patient_id: str):
    """Permanently deletes a patient profile and cascades deletion across all associated clinical records."""
    patient = get_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found.")

    res = db_delete_patient(patient_id)
    if not res.get("success"):
        raise HTTPException(status_code=500, detail=res.get("error", "Failed to delete patient."))

    return {
        "success": True,
        "patient_id": patient_id,
        "patient_name": res.get("patient_name") or patient.get("name"),
        "message": f"Patient `{patient.get('name')}` and all associated records permanently removed."
    }


@router.post("/patients/create-with-document")
async def create_patient_with_document(
    file: UploadFile = File(...),
    name: str = Form(...),
    age: Optional[int] = Form(None),
    gender: Optional[str] = Form(None),
    blood_group: Optional[str] = Form(None),
    emergency_contact_name: Optional[str] = Form(None),
    emergency_contact_relationship: Optional[str] = Form(None),
    emergency_contact_phone: Optional[str] = Form(None),
    allergies: Optional[str] = Form(None),
    chronic_conditions: Optional[str] = Form(None),
    force_create: bool = Form(False),
    ignore_name_mismatch: bool = Form(False)
):
    """Creates a new patient profile atomically with their mandatory first medical document.
    
    Validates document presence, checks for duplicate patient names, verifies patient name on
    the document against the form input, extracts structured clinical entities with Gemini AI,
    and creates the patient + records in SQLite.
    Rolls back patient creation if document processing fails to prevent empty orphan profiles.
    """
    # 1. Validate mandatory fields
    cleaned_name = name.strip() if name else ""
    if not cleaned_name:
        raise HTTPException(status_code=400, detail="Patient Full Name is mandatory to create a profile.")

    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="A mandatory first medical document (PDF or image) is required.")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Accepted formats: PDF, PNG, JPG, JPEG, WEBP."
        )

    # 2. Enforce one-person-one-ID: existing patient will be matched and updated in step 5
    # without creating duplicate IDs for the same name.

    # 3. Read document bytes and extract with IngestionWorkflow (persist=False to prevent DB writes before name check)
    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="The uploaded file is empty (0 bytes).")

    temp_patient_id = f"PAT_{uuid.uuid4().hex[:6].upper()}"

    # Extract document entities without database persistence
    workflow_res = workflow.process_and_persist_document(
        pdf_input=file_bytes,
        file_name=file.filename,
        patient_id=temp_patient_id,
        persist=False
    )

    if not workflow_res.get("success") or not workflow_res.get("validated_document"):
        # Processing failed: do NOT create an empty patient
        return JSONResponse(
            status_code=422,
            content={
                "success": False,
                "error_type": "PROCESSING_FAILED",
                "message": f"Unable to process first medical document: {workflow_res.get('error', 'Unreadable or unsupported content')}."
            }
        )

    validated_doc = workflow_res["validated_document"]

    # 4. Check for patient name mismatch against document text BEFORE database writes
    doc_patient_name = validated_doc.patient_info.name if (validated_doc.patient_info and validated_doc.patient_info.name) else None
    
    # Filter out placeholder names
    is_valid_doc_name = False
    if doc_patient_name and str(doc_patient_name).strip():
        upper_doc_name = str(doc_patient_name).strip().upper()
        if upper_doc_name not in ["UNKNOWN", "NULL", "NONE", "UNABLE TO CONFIDENTLY READ", "UNCERTAIN — VERIFY MANUALLY", "UNREADABLE", "PATIENT"]:
            is_valid_doc_name = True

    if is_valid_doc_name and not ignore_name_mismatch:
        norm_form = normalize_name(cleaned_name)
        norm_doc = normalize_name(doc_patient_name)
        
        # Check if names are distinct
        if norm_form != norm_doc and (norm_form not in norm_doc and norm_doc not in norm_form):
            return JSONResponse(
                status_code=409,
                content={
                    "success": False,
                    "error_type": "NAME_MISMATCH",
                    "entered_name": cleaned_name,
                    "document_patient_name": doc_patient_name,
                    "message": f"Patient name mismatch: Form entered '{cleaned_name}' but prescription indicates '{doc_patient_name}'."
                }
            )

    # 5. Commit patient profile and document bundle ONLY AFTER name confirmation
    existing_p = find_patient_by_name(cleaned_name)
    if existing_p and not force_create:
        target_id = existing_p["id"]
        # Update existing patient with form-entered specifics if provided
        patient_payload = {
            "id": target_id,
            "name": existing_p.get("name") or cleaned_name,
            "age": age or existing_p.get("age") or (validated_doc.patient_info.age if validated_doc.patient_info else None),
            "gender": gender or existing_p.get("gender") or (validated_doc.patient_info.gender if validated_doc.patient_info else None),
            "blood_group": blood_group or existing_p.get("blood_group") or (validated_doc.patient_info.blood_group if validated_doc.patient_info else None),
            "emergency_contact_name": emergency_contact_name or existing_p.get("emergency_contact_name"),
            "emergency_contact_relationship": emergency_contact_relationship or existing_p.get("emergency_contact_relationship"),
            "emergency_contact_phone": emergency_contact_phone or existing_p.get("emergency_contact_phone"),
            "allergies": allergies or existing_p.get("allergies") or (validated_doc.patient_info.allergies if validated_doc.patient_info else None),
            "chronic_conditions": chronic_conditions or existing_p.get("chronic_conditions") or (validated_doc.patient_info.chronic_conditions if validated_doc.patient_info else None)
        }
    else:
        target_id = temp_patient_id
        patient_payload = {
            "id": target_id,
            "name": cleaned_name,
            "age": age or (validated_doc.patient_info.age if validated_doc.patient_info else None),
            "gender": gender or (validated_doc.patient_info.gender if validated_doc.patient_info else None),
            "blood_group": blood_group or (validated_doc.patient_info.blood_group if validated_doc.patient_info else None),
            "emergency_contact_name": emergency_contact_name,
            "emergency_contact_relationship": emergency_contact_relationship,
            "emergency_contact_phone": emergency_contact_phone,
            "allergies": allergies or (validated_doc.patient_info.allergies if validated_doc.patient_info else None),
            "chronic_conditions": chronic_conditions or (validated_doc.patient_info.chronic_conditions if validated_doc.patient_info else None)
        }

    insert_patient(patient_payload)

    # Update document patient info
    if not validated_doc.patient_info:
        validated_doc.patient_info = PatientModel(id=target_id, name=cleaned_name)
    else:
        validated_doc.patient_info.id = target_id
        validated_doc.patient_info.name = cleaned_name

    try:
        db_res = save_extracted_document_bundle(
            document=validated_doc,
            file_name=file.filename,
            file_path=workflow_res["saved_file_path"],
            raw_text=validated_doc.extracted_text,
            patient_id=target_id
        )
    except Exception as db_err:
        cleanup_orphaned_patient(target_id)
        raise HTTPException(status_code=500, detail=f"Failed to persist clinical bundle: {str(db_err)}")

    # Fetch created patient and records for response
    created_patient = get_patient(target_id)
    meds = get_medications(target_id)
    docs = get_documents(target_id)

    return {
        "success": True,
        "patient_id": target_id,
        "patient": created_patient,
        "document": db_res,
        "current_medications": meds,
        "documents_count": len(docs),
        "message": f"Patient '{cleaned_name}' created successfully with their first medical document."
    }


@router.post("/demo/load")
def load_demo():
    """Generate synthetic multi-document longitudinal medical history additively without touching existing patients."""
    try:
        res = load_demo_patient()
        all_patients = get_all_patients()
        return {
            "success": True,
            "patient_id": res["patient_id"],
            "patient_created": res.get("patient_created", True),
            "patient_name": res.get("patient_name", "Eleanor Vance (Demo Patient)"),
            "message": "Demo patient loaded successfully without modifying existing patient records.",
            "stats": res,
            "patients": all_patients
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load demo data: {str(e)}")

