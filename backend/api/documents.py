"""Medical Document Ingestion & Storage API."""

import io
import os
from typing import Optional, List, Union
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from database.database import get_documents, get_patient
from ai.workflow import IngestionWorkflow
from ai.document_processor import SUPPORTED_EXTENSIONS

router = APIRouter()
workflow = IngestionWorkflow()


@router.get("/patients/{patient_id}/documents")
def list_patient_documents(patient_id: str):
    """Retrieve all ingested clinical documents and reports for the active patient."""
    patient = get_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")

    docs = get_documents(patient_id)
    return {"success": True, "patient_id": patient_id, "documents": docs}


@router.post("/documents/upload")
async def upload_medical_document(
    file: Optional[UploadFile] = File(None),
    files: Optional[List[UploadFile]] = File(None),
    patient_id: Optional[str] = Form(None)
):
    """
    Ingest medical records, prescriptions, or lab reports in multi-format (PDF, PNG, JPG, JPEG, WEBP, HEIC, HEIF).
    Supports single-file or multi-document batch uploads.
    Executes PyMuPDF text extraction or Gemini Vision OCR,
    extracts structured clinical entities, and synchronizes the longitudinal profile.
    """
    upload_list: List[UploadFile] = []
    if files and len(files) > 0:
        upload_list.extend(files)
    if file:
        upload_list.append(file)

    if not upload_list:
        raise HTTPException(status_code=400, detail="No medical document file provided for upload.")

    processed_results = []
    errors = []

    for item in upload_list:
        filename = item.filename or "uploaded_document"
        ext = os.path.splitext(filename)[1].lower()

        if ext not in SUPPORTED_EXTENSIONS:
            errors.append(f"File `{filename}` has unsupported format ({ext}). Supported: PDF, PNG, JPG, JPEG, WEBP, HEIC, HEIF.")
            continue

        try:
            content = await item.read()
            if not content or len(content) < 5:
                errors.append(f"File `{filename}` is empty.")
                continue

            file_obj = io.BytesIO(content)

            # Execute end-to-end ingestion pipeline
            result = workflow.process_and_persist_document(
                pdf_input=file_obj,
                file_name=filename,
                patient_id=patient_id
            )

            if not result.get("success"):
                errors.append(f"Failed to process `{filename}`: {result.get('error', 'Ingestion failed.')}")
                continue

            processed_results.append({
                "file_name": filename,
                "patient_id": patient_id,
                "target_patient_id": result.get("target_patient_id") or patient_id,
                "extraction_method": result.get("extraction_method"),
                "structured_data": result.get("structured_data"),
                "db_bundle_result": result.get("db_bundle_result"),
                "resolved_patient": result.get("resolved_patient")
            })

        except Exception as e:
            errors.append(f"Error processing `{filename}`: {str(e)}")

    if not processed_results and errors:
        raise HTTPException(status_code=500, detail="; ".join(errors))

    # If single document uploaded, return single format with backward compatibility
    if len(upload_list) == 1 and processed_results:
        res = processed_results[0]
        target_pid = res["target_patient_id"]
        from database.database import get_current_medications
        patient_obj = get_patient(target_pid)

        return {
            "success": True,
            "patient_id": target_pid,
            "target_patient_id": target_pid,
            "patient": patient_obj,
            "patient_created": res.get("resolved_patient", {}).get("is_new_patient", False),
            "file_name": res["file_name"],
            "extraction_method": res["extraction_method"],
            "structured_data": res["structured_data"],
            "db_bundle_result": res["db_bundle_result"],
            "resolved_patient": res.get("resolved_patient"),
            "current_medications": get_current_medications(target_pid),
            "timeline_updated": True,
            "dashboard_refresh_required": True,
            "message": "Prescription processed and synchronized with patient health record.",
            "warnings": errors if errors else None
        }

    from database.database import get_current_medications
    first_pid = processed_results[0]["target_patient_id"] if processed_results else patient_id
    patient_obj = get_patient(first_pid)

    return {
        "success": True,
        "patient_id": first_pid,
        "target_patient_id": first_pid,
        "patient": patient_obj,
        "total_uploaded": len(upload_list),
        "total_processed": len(processed_results),
        "processed_documents": processed_results,
        "current_medications": get_current_medications(first_pid),
        "timeline_updated": True,
        "dashboard_refresh_required": True,
        "errors": errors if errors else None,
        "message": f"Processed {len(processed_results)} of {len(upload_list)} uploaded documents successfully."
    }

