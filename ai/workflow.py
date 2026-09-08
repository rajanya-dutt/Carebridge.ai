"""Document Processing & Ingestion Workflow for CAREBRIDGE.
Orchestrates PDF saving, PyMuPDF extraction, Gemini structured parsing,
Pydantic model validation, and SQLite database persistence.
"""

import os
import uuid
from typing import Dict, Any, Optional, Union, BinaryIO
from ai.document_processor import DocumentProcessor, is_image_file
from ai.ai_engine import AIEngine
from database.models import MedicalDocument
from database.database import save_extracted_document_bundle, get_patient


class IngestionWorkflow:
    """Coordinates the end-to-end medical document ingestion pipeline."""

    def __init__(self, upload_dir: str = "data/uploads"):
        self.upload_dir = upload_dir
        self.doc_processor = DocumentProcessor(upload_dir=upload_dir)
        self.ai_engine = AIEngine()

    def process_and_persist_document(
        self,
        pdf_input: Union[str, bytes, BinaryIO],
        file_name: str,
        patient_id: str = "P101",
        on_status_update: Optional[callable] = None,
        persist: bool = True
    ) -> Dict[str, Any]:
        """Executes the complete 5-step ingestion and extraction pipeline for PDFs and images.

        Steps:
            1. Save file locally in data/uploads/
            2. Detect format: PDF (extract text/render) or Image (load vision buffer)
            3. AI structured extraction via Gemini API (Text or Vision)
            4. Pydantic schema validation
            5. Persist document, labs, meds, and symptoms to SQLite
        """
        def update_status(step: int, msg: str):
            if on_status_update:
                try:
                    on_status_update(step, msg)
                except Exception:
                    pass

        result_wrapper = {
            "success": False,
            "file_name": file_name,
            "saved_file_path": None,
            "extraction_result": None,
            "validated_document": None,
            "document_data": None,
            "db_bundle_result": None,
            "error": None
        }

        try:
            # -------------------------------------------------------------
            # STEP 1: Save file locally
            # -------------------------------------------------------------
            update_status(1, f"Saving `{file_name}` to upload directory...")
            sanitized_name = f"{uuid.uuid4().hex[:6]}_{os.path.basename(file_name)}"
            saved_path = self.doc_processor.save_uploaded_file(pdf_input, sanitized_name)
            result_wrapper["saved_file_path"] = saved_path

            # -------------------------------------------------------------
            # STEP 2 & 3: Format detection & AI Extraction
            # -------------------------------------------------------------
            if is_image_file(file_name):
                update_status(2, "Detecting image format (PNG/JPG/WEBP/HEIC) for Gemini Vision...")
                extraction_res = self.doc_processor.process_image(saved_path, file_name=file_name)
                result_wrapper["extraction_result"] = extraction_res

                if not extraction_res["success"] or not extraction_res.get("page_images"):
                    result_wrapper["error"] = f"Image Processing Error: {extraction_res.get('error', 'Unreadable image')}"
                    return result_wrapper

                extraction_method = "vision"
                update_status(3, "Synthesizing medical entities with Gemini Vision from image...")
                ai_res = self.ai_engine.extract_structured_medical_data_from_images(
                    page_images=extraction_res["page_images"],
                    file_name=file_name
                )
                raw_text = ""
            else:
                # PDF processing
                update_status(2, "Detecting document format & evaluating selectable text with PyMuPDF...")
                extraction_res = self.doc_processor.process_pdf(saved_path, file_name=file_name)
                result_wrapper["extraction_result"] = extraction_res

                if not extraction_res["success"] and not extraction_res.get("page_images"):
                    rendered_fallback = self.doc_processor.render_pdf_to_images(saved_path)
                    if rendered_fallback:
                        extraction_res["page_images"] = rendered_fallback
                        extraction_res["has_sufficient_text"] = False
                        extraction_res["extraction_method"] = "vision_ocr"
                    else:
                        result_wrapper["error"] = f"Document Processing Error: {extraction_res.get('error')}"
                        return result_wrapper

                has_sufficient_text = extraction_res.get("has_sufficient_text", False)
                raw_text = extraction_res.get("extracted_text", "")
                page_images = extraction_res.get("page_images", [])

                if has_sufficient_text and raw_text:
                    extraction_method = "text"
                    update_status(3, "Synthesizing medical entities with Gemini AI (Text Mode)...")
                    ai_res = self.ai_engine.extract_structured_medical_data(raw_text)
                else:
                    extraction_method = "vision_ocr"
                    update_status(3, "⚠️ Scanned prescription detected. Extracting clinical entities with Gemini Vision OCR...")
                    if not page_images:
                        page_images = self.doc_processor.render_pdf_to_images(saved_path)
                    
                    if not page_images:
                        result_wrapper["error"] = (
                            "Unable to extract text or render pages from this PDF. "
                            "The document may be corrupted, password-protected, or empty."
                        )
                        return result_wrapper

                    ai_res = self.ai_engine.extract_structured_medical_data_from_images(
                        page_images=page_images,
                        file_name=file_name
                    )

            if not ai_res["success"]:
                result_wrapper["error"] = f"AI Extraction Failed: {ai_res.get('error')}"
                return result_wrapper

            validated_doc: MedicalDocument = ai_res["model_instance"]
            validated_doc.file_name = file_name
            validated_doc.extraction_method = extraction_method

            # Anti-hallucination verification: Ensure at least some clinical entities or summary exist
            has_clinical_content = bool(
                (validated_doc.medications and len(validated_doc.medications) > 0) or
                (validated_doc.laboratory_results and len(validated_doc.laboratory_results) > 0) or
                (validated_doc.symptoms and len(validated_doc.symptoms) > 0) or
                (validated_doc.medical_conditions_history and len(validated_doc.medical_conditions_history) > 0) or
                (validated_doc.important_observations and len(validated_doc.important_observations) > 0) or
                (validated_doc.summary and len(validated_doc.summary.strip()) > 15) or
                (validated_doc.patient_info and validated_doc.patient_info.name and len(validated_doc.patient_info.name.strip()) > 1)
            )

            if not has_clinical_content:
                result_wrapper["error"] = (
                    "Document was received, but no sufficiently readable medical information could be extracted. "
                    "Please try another image with clearer lighting and readable prescription text."
                )
                return result_wrapper

            # Synthesize readable extracted text for image uploads so downstream translation/TTS can read it
            if not raw_text:
                def _v(item, attr, default=""):
                    if isinstance(item, dict):
                        val = item.get(attr)
                    else:
                        val = getattr(item, attr, None)
                    return val if val is not None else default

                text_segments = []
                if validated_doc.summary:
                    text_segments.append(f"DOCUMENT SUMMARY:\n{validated_doc.summary}")
                
                pat_name = _v(validated_doc.patient_info, "name", "")
                if pat_name:
                    pat_age = _v(validated_doc.patient_info, "age", "N/A")
                    pat_gender = _v(validated_doc.patient_info, "gender", "N/A")
                    text_segments.append(f"PATIENT: {pat_name} (Age: {pat_age}, Gender: {pat_gender})")
                
                if validated_doc.medications:
                    med_lines = [
                        f"- {_v(m, 'name', 'Medicine')} (Dosage: {_v(m, 'dosage', 'N/A')}, Frequency: {_v(m, 'frequency', 'N/A')})"
                        for m in validated_doc.medications
                    ]
                    text_segments.append("PRESCRIBED MEDICATIONS:\n" + "\n".join(med_lines))
                
                if validated_doc.laboratory_results:
                    lab_lines = [
                        f"- {_v(l, 'test_name', 'Test')}: {_v(l, 'raw_value') or _v(l, 'value', '')} {_v(l, 'unit', '')} ({_v(l, 'flag', 'NORMAL')})"
                        for l in validated_doc.laboratory_results
                    ]
                    text_segments.append("LABORATORY RESULTS:\n" + "\n".join(lab_lines))
                
                if validated_doc.symptoms:
                    sym_lines = [
                        f"- {_v(s, 'symptom', 'Symptom')} (Severity: {_v(s, 'severity', 'Reported')})"
                        for s in validated_doc.symptoms
                    ]
                    text_segments.append("REPORTED SYMPTOMS:\n" + "\n".join(sym_lines))
                
                if validated_doc.important_observations:
                    obs_lines = [
                        f"- {_v(o, 'observation', 'Note')} ({_v(o, 'category', 'Clinical Note')})"
                        for o in validated_doc.important_observations
                    ]
                    text_segments.append("OBSERVATIONS & ADVICE:\n" + "\n".join(obs_lines))
                
                raw_text = "\n\n".join(text_segments)

            validated_doc.extracted_text = raw_text

            result_wrapper["validated_document"] = validated_doc
            result_wrapper["document_data"] = validated_doc.model_dump()
            result_wrapper["structured_data"] = validated_doc.model_dump()
            result_wrapper["extraction_method"] = extraction_method

            # If persist is False, return extraction results immediately without SQLite writes
            if not persist:
                result_wrapper["success"] = True
                update_status(4, "Extraction complete (pre-verification mode). Ready for validation.")
                return result_wrapper

            # -------------------------------------------------------------
            # STEP 4: Resolve Patient Identity & Persist to SQLite
            # -------------------------------------------------------------
            update_status(4, "Resolving patient identity and persisting structured records to SQLite...")
            from database.database import resolve_or_create_patient

            pat_res = resolve_or_create_patient(
                patient_info=validated_doc.patient_info,
                current_active_patient_id=patient_id
            )
            target_patient_id = pat_res["patient_id"]
            target_patient_name = pat_res["patient_name"]

            # Ensure document has correct resolved patient ID
            if not validated_doc.patient_info:
                from database.models import Patient
                validated_doc.patient_info = Patient(id=target_patient_id, name=target_patient_name)
            else:
                validated_doc.patient_info.id = target_patient_id

            db_res = save_extracted_document_bundle(
                document=validated_doc,
                file_name=file_name,
                file_path=saved_path,
                raw_text=validated_doc.extracted_text,
                patient_id=target_patient_id
            )

            result_wrapper["resolved_patient"] = pat_res
            result_wrapper["target_patient_id"] = target_patient_id
            result_wrapper["db_bundle_result"] = db_res
            result_wrapper["success"] = True

            # -------------------------------------------------------------
            # STEP 5: Complete
            # -------------------------------------------------------------
            update_status(5, f"Processing complete! ({extraction_method.upper()}) Records synchronized.")
            return result_wrapper

        except Exception as e:
            result_wrapper["error"] = f"Pipeline execution error: {str(e)}"
            return result_wrapper
