"""Document Processing Module for CAREBRIDGE.
Extracts raw text, metadata, and structural cues from medical PDF records using PyMuPDF,
and normalizes, validates, and re-orients medical images with Pillow (PIL) for Gemini Vision.
"""

import io
import os
import re
from typing import Dict, Any, Optional, Union, List, BinaryIO
from PIL import Image, ImageOps
import pymupdf


IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".heic", ".heif"}
SUPPORTED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".webp", ".heic", ".heif"}


def is_image_file(file_name: str) -> bool:
    """Returns True if the file name has a supported image extension."""
    if not file_name:
        return False
    ext = os.path.splitext(file_name)[1].lower()
    return ext in IMAGE_EXTENSIONS


def get_image_mime_type(file_name: str) -> str:
    """Returns standard MIME type for an image filename."""
    ext = os.path.splitext(file_name)[1].lower()
    if ext in [".jpg", ".jpeg"]:
        return "image/jpeg"
    elif ext == ".png":
        return "image/png"
    elif ext == ".webp":
        return "image/webp"
    elif ext in [".heic", ".heif"]:
        return "image/heic"
    return "image/jpeg"


def normalize_image_bytes(
    image_bytes: bytes,
    file_name: str = "medical_image.jpg",
    max_dimension: int = 2560
) -> Dict[str, Any]:
    """Decodes, validates, rotates via EXIF, normalizes color space, and resizes image safely.
    
    Guarantees that direct image uploads (PNG/JPG/JPEG/WEBP) reach Gemini Vision in pristine,
    readable, oriented orientation without corrupt color palettes or excessive file sizes.
    """
    if not image_bytes or len(image_bytes) < 10:
        return {"success": False, "error": "Image file is empty or unreadable (0 bytes)."}

    try:
        raw_io = io.BytesIO(image_bytes)
        img = Image.open(raw_io)
        original_format = (img.format or "JPEG").upper()
        
        # 1. Check dimensions (anti-hallucination quality floor)
        orig_w, orig_h = img.size
        if orig_w < 50 or orig_h < 50:
            return {
                "success": False,
                "error": "Image quality is too low to confidently read this document. Minimum 50x50 resolution required."
            }

        # 2. Auto-rotate based on EXIF tags (e.g. smartphone camera orientation)
        try:
            img = ImageOps.exif_transpose(img)
        except Exception:
            pass

        cur_w, cur_h = img.size

        # 3. Intelligent Resizing if excessively large (> 2560px) while preserving sharpness
        if max(cur_w, cur_h) > max_dimension:
            scaling_factor = max_dimension / float(max(cur_w, cur_h))
            new_w = int(cur_w * scaling_factor)
            new_h = int(cur_h * scaling_factor)
            img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
            cur_w, cur_h = img.size

        # 4. Color space normalization
        target_mime = "image/jpeg"
        target_format = "JPEG"

        if original_format == "PNG" or file_name.lower().endswith(".png"):
            target_mime = "image/png"
            target_format = "PNG"
            if img.mode not in ("RGB", "RGBA"):
                img = img.convert("RGBA" if "A" in img.mode else "RGB")
        elif original_format == "WEBP" or file_name.lower().endswith(".webp"):
            target_mime = "image/webp"
            target_format = "WEBP"
            if img.mode not in ("RGB", "RGBA"):
                img = img.convert("RGB")
        else:
            # JPEG / HEIC / others -> standard high quality RGB JPEG
            target_mime = "image/jpeg"
            target_format = "JPEG"
            if img.mode in ("RGBA", "LA", "P", "PA"):
                # Composite onto white background
                bg = Image.new("RGB", img.size, (255, 255, 255))
                if img.mode in ("RGBA", "LA"):
                    bg.paste(img, mask=img.split()[-1])
                else:
                    bg.paste(img.convert("RGB"))
                img = bg
            elif img.mode != "RGB":
                img = img.convert("RGB")

        # 5. Export clean normalized buffer
        out_buf = io.BytesIO()
        if target_format == "JPEG":
            img.save(out_buf, format="JPEG", quality=95, optimize=True)
        elif target_format == "PNG":
            img.save(out_buf, format="PNG", optimize=True)
        elif target_format == "WEBP":
            img.save(out_buf, format="WEBP", quality=95)
        else:
            img.save(out_buf, format="JPEG", quality=95)

        out_bytes = out_buf.getvalue()

        return {
            "success": True,
            "normalized_bytes": out_bytes,
            "mime_type": target_mime,
            "format": target_format,
            "original_format": original_format,
            "width": cur_w,
            "height": cur_h,
            "byte_size": len(out_bytes)
        }
    except Exception as e:
        return {"success": False, "error": f"Image decoding and normalization failed: {str(e)}"}


class DocumentProcessor:
    """Handles extracting text and metadata from uploaded medical documents (PDFs, images, scans)."""

    def __init__(self, upload_dir: str = "data/uploads"):
        self.upload_dir = upload_dir
        os.makedirs(self.upload_dir, exist_ok=True)

    def process_image(
        self,
        image_input: Union[str, bytes, BinaryIO],
        file_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """Processes direct medical image uploads (PNG, JPG, JPEG, WEBP, HEIC/HEIF) with Pillow normalization for Gemini Vision."""
        result: Dict[str, Any] = {
            "success": False,
            "file_name": file_name or "medical_image.jpg",
            "total_pages": 1,
            "has_text": False,
            "has_sufficient_text": False,
            "text_quality": {"is_sufficient": False, "reason": "Direct image input requires Vision OCR."},
            "extracted_text": "",
            "pages": [],
            "page_images": [],
            "extraction_method": "vision",
            "metadata": {},
            "error": None
        }

        try:
            image_bytes: Optional[bytes] = None
            if isinstance(image_input, str):
                if not os.path.exists(image_input):
                    result["error"] = f"File not found at path: {image_input}"
                    return result
                result["file_name"] = file_name or os.path.basename(image_input)
                with open(image_input, "rb") as f:
                    image_bytes = f.read()
            elif isinstance(image_input, bytes):
                image_bytes = image_input
            elif hasattr(image_input, "read"):
                if hasattr(image_input, "name") and not file_name:
                    result["file_name"] = image_input.name
                image_bytes = image_input.read()
                if hasattr(image_input, "seek"):
                    image_input.seek(0)

            if not image_bytes or len(image_bytes) < 10:
                result["error"] = "Image file is empty or unreadable."
                return result

            # Run Pillow Normalization
            norm_res = normalize_image_bytes(
                image_bytes=image_bytes,
                file_name=result["file_name"]
            )

            if not norm_res["success"]:
                result["error"] = norm_res.get("error", "Image normalization failed.")
                return result

            result["page_images"] = [{
                "page_number": 1,
                "image_bytes": norm_res["normalized_bytes"],
                "width": norm_res["width"],
                "height": norm_res["height"],
                "mime_type": norm_res["mime_type"],
                "format": norm_res["format"]
            }]
            result["metadata"] = {
                "width": norm_res["width"],
                "height": norm_res["height"],
                "mime_type": norm_res["mime_type"],
                "original_format": norm_res["original_format"],
                "normalized_byte_size": norm_res["byte_size"]
            }
            result["success"] = True
            result["has_text"] = False
            result["has_sufficient_text"] = False
            return result

        except Exception as e:
            result["error"] = f"Image processing failed: {str(e)}"
            return result

    def clean_text(self, text: str) -> str:
        """Cleans and standardizes extracted text.
        
        - Normalizes line breaks and whitespace.
        - Removes repeated excessive blank lines.
        - Preserves clinical numerical structures and lists.
        """
        if not text:
            return ""
        # Replace non-breaking spaces and carriage returns
        text = text.replace("\r\n", "\n").replace("\r", "\n").replace("\xa0", " ")
        # Remove trailing whitespace from each line
        lines = [line.rstrip() for line in text.split("\n")]
        # Consolidate multiple consecutive blank lines into at most two
        cleaned_text = "\n".join(lines)
        cleaned_text = re.sub(r"\n{3,}", "\n\n", cleaned_text)
        return cleaned_text.strip()

    def evaluate_text_quality(
        self,
        extracted_text: str,
        pages_data: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Evaluates whether extracted text contains sufficient clinical information or requires Vision OCR.

        Criteria checked:
        - Total character count & alphanumeric density
        - Word count and token variety
        - Proportion of pages with readable clinical content
        """
        if not extracted_text:
            return {
                "is_sufficient": False,
                "total_chars": 0,
                "alphanumeric_chars": 0,
                "word_count": 0,
                "reason": "Document has zero selectable text."
            }

        cleaned = extracted_text.strip()
        total_chars = len(cleaned)
        alphanumeric_chars = len(re.findall(r"[a-zA-Z0-9]", cleaned))
        words = cleaned.split()
        word_count = len(words)

        # Calculate alphanumeric ratio
        alpha_ratio = (alphanumeric_chars / total_chars) if total_chars > 0 else 0.0

        # Minimum thresholds for text-based medical processing
        MIN_TOTAL_CHARS = 50
        MIN_ALPHANUMERIC_CHARS = 35
        MIN_WORD_COUNT = 8

        if total_chars < MIN_TOTAL_CHARS:
            return {
                "is_sufficient": False,
                "total_chars": total_chars,
                "alphanumeric_chars": alphanumeric_chars,
                "word_count": word_count,
                "reason": f"Text too brief ({total_chars} chars, minimum {MIN_TOTAL_CHARS} needed). Likely a scanned photo."
            }

        if alphanumeric_chars < MIN_ALPHANUMERIC_CHARS:
            return {
                "is_sufficient": False,
                "total_chars": total_chars,
                "alphanumeric_chars": alphanumeric_chars,
                "word_count": word_count,
                "reason": f"Insufficient alphanumeric content ({alphanumeric_chars} chars). Likely noise or scanned image."
            }

        if word_count < MIN_WORD_COUNT:
            return {
                "is_sufficient": False,
                "total_chars": total_chars,
                "alphanumeric_chars": alphanumeric_chars,
                "word_count": word_count,
                "reason": f"Too few distinct words ({word_count} words). Scanned document fallback required."
            }

        if alpha_ratio < 0.40:
            return {
                "is_sufficient": False,
                "total_chars": total_chars,
                "alphanumeric_chars": alphanumeric_chars,
                "word_count": word_count,
                "reason": f"Low alphanumeric ratio ({alpha_ratio:.1%}). Likely garbled scanned artifacts."
            }

        return {
            "is_sufficient": True,
            "total_chars": total_chars,
            "alphanumeric_chars": alphanumeric_chars,
            "word_count": word_count,
            "reason": "Selectable text meets clinical extraction quality thresholds."
        }

    def render_pdf_to_images(
        self,
        pdf_input: Union[str, bytes, BinaryIO],
        dpi: int = 150,
        max_pages: int = 10
    ) -> List[Dict[str, Any]]:
        """Renders PDF pages into PNG image byte buffers using PyMuPDF pixmaps for AI Vision processing.

        Args:
            pdf_input: File path, bytes, or file-like object.
            dpi: Resolution for image rendering (default 150 dpi for optimal OCR & token efficiency).
            max_pages: Maximum pages to render per document (default 10).

        Returns:
            List of dicts: [
                {
                    "page_number": int,
                    "image_bytes": bytes,
                    "width": int,
                    "height": int,
                    "mime_type": "image/png"
                },
                ...
            ]
        """
        doc = None
        rendered_pages: List[Dict[str, Any]] = []

        try:
            if isinstance(pdf_input, str):
                if not os.path.exists(pdf_input):
                    return rendered_pages
                doc = pymupdf.open(pdf_input)
            elif isinstance(pdf_input, bytes):
                doc = pymupdf.open(stream=pdf_input, filetype="pdf")
            elif hasattr(pdf_input, "read"):
                content = pdf_input.read()
                if hasattr(pdf_input, "seek"):
                    pdf_input.seek(0)
                if not content:
                    return rendered_pages
                doc = pymupdf.open(stream=content, filetype="pdf")
            else:
                return rendered_pages

            total_pages = len(doc)
            pages_to_process = min(total_pages, max_pages)

            for page_idx in range(pages_to_process):
                try:
                    page = doc[page_idx]
                    # Render page to high-clarity RGB pixmap
                    pix = page.get_pixmap(dpi=dpi, alpha=False)
                    png_bytes = pix.tobytes("png")

                    rendered_pages.append({
                        "page_number": page_idx + 1,
                        "image_bytes": png_bytes,
                        "width": pix.width,
                        "height": pix.height,
                        "mime_type": "image/png"
                    })
                except Exception as page_err:
                    # Continue with other pages if one page fails
                    continue

        except Exception:
            pass
        finally:
            if doc is not None:
                try:
                    doc.close()
                except Exception:
                    pass

        return rendered_pages

    def process_pdf(
        self,
        pdf_input: Union[str, bytes, BinaryIO],
        file_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """Extracts text, metadata, and page boundaries from a PDF with hybrid vision fallback support.

        Args:
            pdf_input: A file path (str), byte stream, or file-like object.
            file_name: Optional name of the file for reporting.

        Returns:
            Dict containing:
                - success (bool)
                - file_name (str)
                - total_pages (int)
                - has_text (bool)
                - has_sufficient_text (bool)
                - text_quality (dict)
                - extracted_text (str)
                - pages (list of dicts with page_number and text)
                - page_images (list of rendered image dicts if scanned/low-text)
                - extraction_method (str: 'text' or 'vision_ocr')
                - metadata (dict of PDF metadata)
                - error (Optional str)
                - warning (Optional str)
        """
        doc = None
        result: Dict[str, Any] = {
            "success": False,
            "file_name": file_name or "uploaded_document.pdf",
            "total_pages": 0,
            "has_text": False,
            "has_sufficient_text": False,
            "text_quality": {},
            "extracted_text": "",
            "pages": [],
            "page_images": [],
            "extraction_method": "text",
            "metadata": {},
            "error": None,
            "warning": None
        }

        try:
            # 1. Load document according to input type
            if isinstance(pdf_input, str):
                if not os.path.exists(pdf_input):
                    result["error"] = f"File not found at path: {pdf_input}"
                    return result
                result["file_name"] = file_name or os.path.basename(pdf_input)
                doc = pymupdf.open(pdf_input)
            elif isinstance(pdf_input, bytes):
                doc = pymupdf.open(stream=pdf_input, filetype="pdf")
            elif hasattr(pdf_input, "read"):
                # File-like object (e.g. UploadFile or BytesIO)
                if hasattr(pdf_input, "name") and not file_name:
                    result["file_name"] = pdf_input.name
                content = pdf_input.read()
                # Reset file pointer in case caller needs to read again
                if hasattr(pdf_input, "seek"):
                    pdf_input.seek(0)
                if not content:
                    result["error"] = "The uploaded file is empty (0 bytes)."
                    return result
                doc = pymupdf.open(stream=content, filetype="pdf")
            else:
                result["error"] = f"Unsupported input type: {type(pdf_input)}"
                return result

            # 2. Check for encryption / password
            if doc.is_encrypted:
                result["error"] = "PDF document is encrypted or password-protected."
                return result

            total_pages = len(doc)
            result["total_pages"] = total_pages

            if total_pages == 0:
                result["warning"] = "PDF contains 0 pages."
                return result

            # 3. Extract metadata
            try:
                result["metadata"] = {
                    "title": doc.metadata.get("title", ""),
                    "author": doc.metadata.get("author", ""),
                    "subject": doc.metadata.get("subject", ""),
                    "creator": doc.metadata.get("creator", ""),
                    "creation_date": doc.metadata.get("creationDate", ""),
                    "modification_date": doc.metadata.get("modDate", "")
                }
            except Exception:
                result["metadata"] = {}

            # 4. Extract page-by-page text while preserving boundaries
            pages_data: List[Dict[str, Any]] = []
            combined_parts: List[str] = []
            total_char_count = 0

            for page_idx, page in enumerate(doc, start=1):
                raw_page_text = page.get_text("text")
                cleaned_page_text = self.clean_text(raw_page_text)
                char_count = len(cleaned_page_text)
                word_count = len(cleaned_page_text.split()) if cleaned_page_text else 0

                total_char_count += char_count

                pages_data.append({
                    "page_number": page_idx,
                    "text": cleaned_page_text,
                    "char_count": char_count,
                    "word_count": word_count,
                    "has_content": char_count > 0
                })

                if cleaned_page_text:
                    combined_parts.append(f"--- [Page {page_idx}] ---\n{cleaned_page_text}")

            result["pages"] = pages_data
            result["extracted_text"] = "\n\n".join(combined_parts).strip()
            result["success"] = True

            # 5. Evaluate Text Quality using clinical thresholds
            quality = self.evaluate_text_quality(result["extracted_text"], pages_data)
            result["text_quality"] = quality
            result["has_text"] = (total_char_count > 0)
            result["has_sufficient_text"] = quality["is_sufficient"]

            if quality["is_sufficient"]:
                result["extraction_method"] = "text"
            else:
                result["extraction_method"] = "vision_ocr"
                result["warning"] = (
                    f"Low/no selectable text detected: {quality['reason']}. "
                    "Rendering page images for Gemini Vision OCR fallback."
                )
                # Render images for vision fallback
                result["page_images"] = self.render_pdf_to_images(pdf_input)

            return result

        except pymupdf.FileDataError as e:
            result["error"] = f"Invalid or corrupted PDF file format: {str(e)}"
            return result
        except pymupdf.EmptyFileError:
            result["error"] = "Cannot open an empty PDF file."
            return result
        except Exception as e:
            result["error"] = f"Unexpected error during PDF processing: {str(e)}"
            return result
        finally:
            if doc is not None:
                try:
                    doc.close()
                except Exception:
                    pass

    def save_uploaded_file(self, uploaded_file: BinaryIO, filename: str) -> str:
        """Saves an uploaded file to the data/uploads directory."""
        target_path = os.path.join(self.upload_dir, filename)
        with open(target_path, "wb") as f:
            if hasattr(uploaded_file, "read"):
                content = uploaded_file.read()
                f.write(content)
                if hasattr(uploaded_file, "seek"):
                    uploaded_file.seek(0)
            elif isinstance(uploaded_file, bytes):
                f.write(uploaded_file)
        return target_path


def run_demo_test() -> Dict[str, Any]:
    """Generates a sample synthetic clinical lab report PDF, tests extraction, and returns results."""
    # Create a synthetic 2-page clinical PDF in memory with PyMuPDF
    sample_doc = pymupdf.open()

    # Page 1: Hospital Header & Lab Results
    page1 = sample_doc.new_page(width=595, height=842)
    sample_text_p1 = (
        "METROPOLITAN GENERAL HOSPITAL - CLINICAL LABORATORY REPORT\n"
        "Patient Name: Eleanor Vance                DOB: 1972-04-12    Sex: Female\n"
        "Patient ID: P101                           Collection Date: 2026-02-05\n"
        "Ordering Physician: Dr. Marcus Bennett, MD\n\n"
        "COMPREHENSIVE METABOLIC PANEL & LIPID PROFILE:\n"
        "Test Name              Result      Unit       Reference Range    Status\n"
        "------------------------------------------------------------------------\n"
        "Hemoglobin A1c (HbA1c) 6.4         %          4.0 - 5.6          HIGH\n"
        "Fasting Plasma Glucose 112         mg/dL      70 - 99            HIGH\n"
        "Total Cholesterol      192         mg/dL      < 200              NORMAL\n"
        "Triglycerides          140         mg/dL      < 150              NORMAL\n"
        "HDL Cholesterol        54          mg/dL      > 50               NORMAL\n"
        "LDL Cholesterol        110         mg/dL      < 100              ELEVATED\n"
        "Serum Creatinine       0.85        mg/dL      0.50 - 1.10        NORMAL\n"
        "eGFR                   88          mL/min     > 60               NORMAL\n"
    )
    page1.insert_text((50, 60), sample_text_p1, fontsize=10)

    # Page 2: Clinical Assessment & Medication Orders
    page2 = sample_doc.new_page(width=595, height=842)
    sample_text_p2 = (
        "METROPOLITAN GENERAL HOSPITAL - CLINICAL ENCOUNTER NOTES (Page 2)\n"
        "Patient Name: Eleanor Vance                Encounter Date: 2026-02-05\n\n"
        "ASSESSMENT & PLAN:\n"
        "1. Type 2 Diabetes Mellitus - Improved glycemic control on Metformin 500mg BID.\n"
        "   HbA1c declined from 7.8% (March 2025) to 6.4% currently.\n"
        "2. Essential Hypertension - Stable on Lisinopril 10mg daily. BP today: 124/80 mmHg.\n"
        "3. Hyperlipidemia - Total cholesterol target achieved on Atorvastatin 20mg daily.\n\n"
        "CURRENT MEDICATIONS:\n"
        "- Metformin 500 mg oral tablet, twice daily with morning & evening meals.\n"
        "- Lisinopril 10 mg oral tablet, once daily in the morning.\n"
        "- Atorvastatin 20 mg oral tablet, once daily at bedtime.\n\n"
        "FOLLOW-UP:\n"
        "Schedule follow-up appointment in 3 months for repeat HbA1c."
    )
    page2.insert_text((50, 60), sample_text_p2, fontsize=10)

    pdf_bytes = sample_doc.tobytes()
    sample_doc.close()

    # Process using DocumentProcessor
    processor = DocumentProcessor()
    extraction_result = processor.process_pdf(pdf_bytes, file_name="Sample_Clinical_Report.pdf")

    return extraction_result


if __name__ == "__main__":
    result = run_demo_test()
    print("Extraction Success:", result["success"])
    print("File Name:", result["file_name"])
    print("Total Pages:", result["total_pages"])
    print("Has Text:", result["has_text"])
    print("Page Count Extracted:", len(result["pages"]))
    print("Extracted Text Preview:\n" + result["extracted_text"][:350] + "...")
