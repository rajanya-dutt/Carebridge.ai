"""SQLite Database Layer for CAREBRIDGE.
Provides local, serverless relational persistence for patients, medical documents,
lab results, medications, symptoms, and longitudinal timeline events using parameterized queries.
"""

import sqlite3
import os
import json
import uuid
import re
import datetime
from typing import Optional, List, Dict, Any, Union
from database.models import (
    SCHEMA_SQL,
    Patient,
    EmergencyEvent,
    MedicalDocument,
    LabResult,
    Medication,
    Symptom,
    TimelineEvent
)

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "carebridge.db")


def get_db_connection(db_path: str = DB_PATH) -> sqlite3.Connection:
    """Returns a SQLite connection with sqlite3.Row factory enabled."""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


def create_tables(conn: sqlite3.Connection) -> None:
    """Executes the DDL schema script to create required tables."""
    conn.executescript(SCHEMA_SQL)


def run_migrations(conn: sqlite3.Connection) -> None:
    """Safely runs backward-compatible schema migrations without data loss."""
    cursor = conn.cursor()

    # 1. Check patients table columns
    cursor.execute("PRAGMA table_info(patients)")
    patient_cols = {row[1] for row in cursor.fetchall()}

    if "emergency_contact_relationship" not in patient_cols:
        try:
            cursor.execute("ALTER TABLE patients ADD COLUMN emergency_contact_relationship TEXT")
        except Exception:
            pass

    if "important_conditions" not in patient_cols:
        try:
            cursor.execute("ALTER TABLE patients ADD COLUMN important_conditions TEXT")
        except Exception:
            pass

    # 2. Check documents table columns
    cursor.execute("PRAGMA table_info(documents)")
    doc_cols = {row[1] for row in cursor.fetchall()}

    if "extraction_method" not in doc_cols:
        try:
            cursor.execute("ALTER TABLE documents ADD COLUMN extraction_method TEXT DEFAULT 'text'")
        except Exception:
            pass

    # 3. Ensure emergency_events table exists
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS emergency_events (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        latitude REAL,
        longitude REAL,
        location_accuracy REAL,
        location_status TEXT,
        actions TEXT,
        status TEXT DEFAULT 'ACTIVE',
        FOREIGN KEY(patient_id) REFERENCES patients(id)
    );
    """)


def init_db(db_path: str = DB_PATH) -> None:
    """Initializes database schema and applies migrations without injecting synthetic demo patients."""
    conn = get_db_connection(db_path)
    with conn:
        create_tables(conn)
        run_migrations(conn)
    conn.close()


# =====================================================================
# INSERT OPERATIONS (PARAMETERIZED SQL)
# =====================================================================

def insert_patient(
    patient_data: Union[Patient, Dict[str, Any]],
    db_path: str = DB_PATH
) -> str:
    """Inserts or updates a patient record."""
    data = patient_data.model_dump() if isinstance(patient_data, Patient) else dict(patient_data)
    patient_id = data.get("id") or data.get("patient_id") or f"P{uuid.uuid4().hex[:6].upper()}"

    # Serialize list fields (e.g. allergies, chronic_conditions, important_conditions) to comma-separated text
    allergies = data.get("allergies")
    if isinstance(allergies, list):
        allergies = ", ".join(str(a) for a in allergies if a)

    conditions = data.get("chronic_conditions") or data.get("important_conditions")
    if isinstance(conditions, list):
        conditions = ", ".join(str(c) for c in conditions if c)

    sql = """
    INSERT INTO patients (
        id, name, age, gender, blood_group, emergency_contact_name,
        emergency_contact_relationship, emergency_contact_phone, allergies,
        chronic_conditions, important_conditions
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
        name = COALESCE(excluded.name, patients.name),
        age = COALESCE(excluded.age, patients.age),
        gender = COALESCE(excluded.gender, patients.gender),
        blood_group = COALESCE(excluded.blood_group, patients.blood_group),
        emergency_contact_name = COALESCE(excluded.emergency_contact_name, patients.emergency_contact_name),
        emergency_contact_relationship = COALESCE(excluded.emergency_contact_relationship, patients.emergency_contact_relationship),
        emergency_contact_phone = COALESCE(excluded.emergency_contact_phone, patients.emergency_contact_phone),
        allergies = COALESCE(excluded.allergies, patients.allergies),
        chronic_conditions = COALESCE(excluded.chronic_conditions, patients.chronic_conditions),
        important_conditions = COALESCE(excluded.important_conditions, patients.important_conditions);
    """

    conn = get_db_connection(db_path)
    with conn:
        conn.execute(sql, (
            patient_id,
            data.get("name") or "Unnamed Patient",
            data.get("age"),
            data.get("gender"),
            data.get("blood_group"),
            data.get("emergency_contact_name"),
            data.get("emergency_contact_relationship"),
            data.get("emergency_contact_phone"),
            allergies,
            conditions,
            conditions
        ))
    conn.close()
    return patient_id


def update_patient_emergency_contact(
    patient_id: str,
    name: str,
    relationship: Optional[str] = None,
    phone: Optional[str] = None,
    db_path: str = DB_PATH
) -> bool:
    """Explicitly updates the emergency contact for a specific patient."""
    conn = get_db_connection(db_path)
    with conn:
        conn.execute(
            """
            UPDATE patients
            SET emergency_contact_name = ?,
                emergency_contact_relationship = ?,
                emergency_contact_phone = ?
            WHERE id = ?
            """,
            (name, relationship or "", phone or "", patient_id)
        )
    conn.close()
    return True


def insert_medical_document(
    doc_data: Union[MedicalDocument, Dict[str, Any]],
    patient_id: str = "P101",
    db_path: str = DB_PATH
) -> str:
    """Inserts a medical document record."""
    data = doc_data.model_dump() if isinstance(doc_data, MedicalDocument) else dict(doc_data)
    doc_id = data.get("id") or f"DOC_{uuid.uuid4().hex[:8]}"

    sql = """
    INSERT INTO documents (
        id, patient_id, file_name, file_path, file_type, extraction_method,
        document_date, extracted_text, raw_json_data
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """

    conn = get_db_connection(db_path)
    with conn:
        conn.execute(sql, (
            doc_id,
            patient_id,
            data.get("file_name") or "clinical_document.pdf",
            data.get("file_path") or "",
            data.get("document_type") or "Medical Record",
            data.get("extraction_method") or "text",
            data.get("document_date"),
            data.get("extracted_text") or "",
            json.dumps(data)
        ))
    conn.close()
    return doc_id


def insert_emergency_event(
    event_data: Union[EmergencyEvent, Dict[str, Any]],
    patient_id: str = "P101",
    db_path: str = DB_PATH
) -> str:
    """Inserts an emergency event log into SQLite."""
    data = event_data.model_dump() if isinstance(event_data, EmergencyEvent) else dict(event_data)
    event_id = data.get("id") or f"EMERG_{uuid.uuid4().hex[:8]}"

    sql = """
    INSERT INTO emergency_events (
        id, patient_id, latitude, longitude, location_accuracy,
        location_status, actions, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """

    conn = get_db_connection(db_path)
    with conn:
        conn.execute(sql, (
            event_id,
            patient_id,
            data.get("latitude"),
            data.get("longitude"),
            data.get("location_accuracy"),
            data.get("location_status") or "ACQUIRED",
            data.get("actions") or "Emergency Mode Activated",
            data.get("status") or "ACTIVE"
        ))
    conn.close()
    return event_id


def get_emergency_events(
    patient_id: str = "P101",
    limit: int = 10,
    db_path: str = DB_PATH
) -> List[Dict[str, Any]]:
    """Retrieves chronological emergency events for a patient."""
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM emergency_events WHERE patient_id = ? ORDER BY timestamp DESC LIMIT ?",
        (patient_id, limit)
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def insert_lab_result(
    lab_data: Union[LabResult, Dict[str, Any]],
    patient_id: str = "P101",
    document_id: Optional[str] = None,
    db_path: str = DB_PATH
) -> str:
    """Inserts a laboratory test record."""
    data = lab_data.model_dump() if isinstance(lab_data, LabResult) else dict(lab_data)
    lab_id = data.get("id") or f"LAB_{uuid.uuid4().hex[:8]}"
    test_date = data.get("date") or data.get("test_date")

    raw_val = data.get("raw_value")
    val = data.get("value")
    if val is None and raw_val:
        try:
            val = float(str(raw_val).strip().replace(",", ""))
        except ValueError:
            val = None

    sql = """
    INSERT INTO lab_results (
        id, patient_id, document_id, test_name, test_category,
        value, raw_value, unit, reference_range, flag, test_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """

    conn = get_db_connection(db_path)
    with conn:
        try:
            conn.execute(sql, (
                lab_id,
                patient_id,
                document_id or data.get("document_id"),
                data.get("test_name"),
                data.get("category") or data.get("test_category") or "General",
                val,
                str(raw_val) if raw_val is not None else (str(val) if val is not None else None),
                data.get("unit"),
                data.get("reference_range"),
                data.get("flag") or "NORMAL",
                test_date
            ))
        except sqlite3.OperationalError:
            # Fallback if table does not yet have raw_value column
            conn.execute(
                """
                INSERT INTO lab_results (
                    id, patient_id, document_id, test_name, test_category,
                    value, unit, reference_range, flag, test_date
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    lab_id,
                    patient_id,
                    document_id or data.get("document_id"),
                    data.get("test_name"),
                    data.get("category") or data.get("test_category") or "General",
                    val,
                    data.get("unit"),
                    data.get("reference_range"),
                    data.get("flag") or "NORMAL",
                    test_date
                )
            )
    conn.close()
    return lab_id


def insert_medication(
    med_data: Union[Medication, Dict[str, Any]],
    patient_id: str = "P101",
    document_id: Optional[str] = None,
    db_path: str = DB_PATH
) -> str:
    """Inserts a medication record."""
    data = med_data.model_dump() if isinstance(med_data, Medication) else dict(med_data)
    med_id = data.get("id") or f"MED_{uuid.uuid4().hex[:8]}"

    sql = """
    INSERT INTO medications (
        id, patient_id, name, dosage, frequency, route,
        purpose, start_date, end_date, status, document_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """

    conn = get_db_connection(db_path)
    with conn:
        conn.execute(sql, (
            med_id,
            patient_id,
            data.get("name"),
            data.get("dosage"),
            data.get("frequency"),
            data.get("route"),
            data.get("purpose"),
            data.get("start_date"),
            data.get("end_date"),
            data.get("status") or "ACTIVE",
            document_id or data.get("document_id")
        ))
    conn.close()
    return med_id


def insert_symptom(
    symptom_data: Union[Symptom, Dict[str, Any]],
    patient_id: str = "P101",
    document_id: Optional[str] = None,
    db_path: str = DB_PATH
) -> str:
    """Inserts a reported symptom record."""
    data = symptom_data.model_dump() if isinstance(symptom_data, Symptom) else dict(symptom_data)
    symptom_id = data.get("id") or f"SYM_{uuid.uuid4().hex[:8]}"

    sql = """
    INSERT INTO symptoms (
        id, patient_id, symptom, severity, onset_date,
        status, notes, document_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """

    conn = get_db_connection(db_path)
    with conn:
        conn.execute(sql, (
            symptom_id,
            patient_id,
            data.get("symptom"),
            data.get("severity") or "UNKNOWN",
            data.get("onset_date"),
            data.get("status") or "UNKNOWN",
            data.get("notes"),
            document_id or data.get("document_id")
        ))
    conn.close()
    return symptom_id


def insert_timeline_event(
    event_data: Union[TimelineEvent, Dict[str, Any]],
    patient_id: str = "P101",
    document_id: Optional[str] = None,
    db_path: str = DB_PATH
) -> str:
    """Inserts a longitudinal timeline event."""
    data = event_data.model_dump() if isinstance(event_data, TimelineEvent) else dict(event_data)
    event_id = data.get("id") or f"EVT_{uuid.uuid4().hex[:8]}"

    sql = """
    INSERT INTO timeline_events (
        id, patient_id, event_date, category, title, description, document_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    """

    conn = get_db_connection(db_path)
    with conn:
        conn.execute(sql, (
            event_id,
            patient_id,
            data.get("event_date") or "",
            data.get("category") or "General",
            data.get("title") or "Clinical Event",
            data.get("description") or "",
            document_id or data.get("document_id")
        ))
    conn.close()
    return event_id


# =====================================================================
# RETRIEVAL OPERATIONS (PARAMETERIZED SQL)
# =====================================================================

def normalize_name(name: Optional[str]) -> str:
    """Normalizes patient name for robust case-insensitive comparison, handling titles, punctuation, and spacing."""
    if not name:
        return ""
    cleaned = str(name).strip().lower()
    cleaned = re.sub(r'^(dr\.|mr\.|mrs\.|ms\.|miss|master|baby|dr|mr|mrs|ms)\s+', '', cleaned)
    cleaned = re.sub(r'[^\w\s]', '', cleaned)
    return re.sub(r"\s+", " ", cleaned).strip()


def find_patient_by_name(name: str, db_path: str = DB_PATH) -> Optional[Dict[str, Any]]:
    """Searches existing patients by normalized name."""
    if not name or not str(name).strip():
        return None
    target_norm = normalize_name(name)
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM patients")
    rows = cursor.fetchall()
    conn.close()
    for r in rows:
        p = dict(r)
        if normalize_name(p.get("name")) == target_norm:
            return p
    return None


def resolve_or_create_patient(
    patient_info: Optional[Union[Patient, Dict[str, Any]]],
    current_active_patient_id: Optional[str] = None,
    db_path: str = DB_PATH
) -> Dict[str, Any]:
    """Resolves patient identity: matches existing by ID or Name, or creates a new isolated patient."""
    p_dict = patient_info.model_dump() if isinstance(patient_info, Patient) else (dict(patient_info) if patient_info else {})
    raw_name = p_dict.get("name")
    raw_id = p_dict.get("id") or p_dict.get("patient_id")

    # 1. If explicit ID provided and exists in DB
    if raw_id:
        existing_by_id = get_patient(raw_id, db_path=db_path)
        if existing_by_id:
            return {
                "patient_id": raw_id,
                "patient_name": existing_by_id.get("name") or raw_name or "Unnamed Patient",
                "is_new_patient": False,
                "matched_existing": True
            }

    # 2. If name provided, search by normalized name
    if raw_name and raw_name.strip():
        existing_by_name = find_patient_by_name(raw_name, db_path=db_path)
        if existing_by_name:
            return {
                "patient_id": existing_by_name["id"],
                "patient_name": existing_by_name["name"],
                "is_new_patient": False,
                "matched_existing": True
            }
        else:
            import re
            clean_id = re.sub(r'[^A-Za-z0-9_-]', '_', raw_id) if raw_id else None
            new_id = clean_id or f"PAT_{uuid.uuid4().hex[:6].upper()}"
            new_patient_payload = {
                "id": new_id,
                "name": raw_name.strip(),
                "age": p_dict.get("age"),
                "gender": p_dict.get("gender"),
                "blood_group": p_dict.get("blood_group"),
                "emergency_contact_name": p_dict.get("emergency_contact_name"),
                "emergency_contact_relationship": p_dict.get("emergency_contact_relationship"),
                "emergency_contact_phone": p_dict.get("emergency_contact_phone"),
                "allergies": p_dict.get("allergies"),
                "chronic_conditions": p_dict.get("chronic_conditions") or p_dict.get("important_conditions")
            }
            insert_patient(new_patient_payload, db_path=db_path)
            return {
                "patient_id": new_id,
                "patient_name": raw_name.strip(),
                "is_new_patient": True,
                "matched_existing": False
            }

    # 3. If no name in doc, use current_active_patient_id if it exists
    if current_active_patient_id:
        existing_active = get_patient(current_active_patient_id, db_path=db_path)
        if existing_active:
            return {
                "patient_id": current_active_patient_id,
                "patient_name": existing_active.get("name", "Active Patient"),
                "is_new_patient": False,
                "matched_existing": True
            }

    # 4. Fallback: generate new patient
    fallback_id = f"PAT_{uuid.uuid4().hex[:6].upper()}"
    insert_patient({"id": fallback_id, "name": "Unnamed Patient"}, db_path=db_path)
    return {
        "patient_id": fallback_id,
        "patient_name": "Unnamed Patient",
        "is_new_patient": True,
        "matched_existing": False
    }


def cleanup_orphaned_patient(patient_id: str, db_path: str = DB_PATH) -> Dict[str, Any]:
    """Checks whether a patient has any remaining meaningful records (documents, medications,
    labs, timeline events, symptoms, emergency events). If 0 records remain, removes the orphaned
    patient profile from the database.
    """
    if not patient_id:
        return {"cleaned": False, "patient_id": patient_id, "reason": "No patient ID provided"}

    conn = get_db_connection(db_path)
    cursor = conn.cursor()

    # Count all linked clinical entities
    cursor.execute("SELECT COUNT(*) as c FROM documents WHERE patient_id = ?", (patient_id,))
    docs_cnt = cursor.fetchone()["c"]

    cursor.execute("SELECT COUNT(*) as c FROM medications WHERE patient_id = ?", (patient_id,))
    meds_cnt = cursor.fetchone()["c"]

    cursor.execute("SELECT COUNT(*) as c FROM lab_results WHERE patient_id = ?", (patient_id,))
    labs_cnt = cursor.fetchone()["c"]

    cursor.execute("SELECT COUNT(*) as c FROM timeline_events WHERE patient_id = ?", (patient_id,))
    events_cnt = cursor.fetchone()["c"]

    cursor.execute("SELECT COUNT(*) as c FROM symptoms WHERE patient_id = ?", (patient_id,))
    syms_cnt = cursor.fetchone()["c"]

    cursor.execute("SELECT COUNT(*) as c FROM emergency_events WHERE patient_id = ?", (patient_id,))
    emg_cnt = cursor.fetchone()["c"]

    total_records = docs_cnt + meds_cnt + labs_cnt + events_cnt + syms_cnt + emg_cnt

    if total_records == 0:
        with conn:
            cursor.execute("DELETE FROM patients WHERE id = ?", (patient_id,))
        conn.close()
        return {
            "cleaned": True,
            "patient_id": patient_id,
            "message": f"Patient `{patient_id}` has no remaining records and was removed."
        }

    conn.close()
    return {
        "cleaned": False,
        "patient_id": patient_id,
        "remaining_records": total_records,
        "details": {
            "documents": docs_cnt,
            "medications": meds_cnt,
            "labs": labs_cnt,
            "timeline": events_cnt,
            "symptoms": syms_cnt
        }
    }


def delete_prescription(
    document_id: str,
    patient_id: str,
    db_path: str = DB_PATH
) -> Dict[str, Any]:
    """Explicitly deletes a prescription document and its associated records for a specific patient.
    
    If the deleted prescription contained active medications, automatically promotes the next most
    recent valid prescription for the SAME patient to active status.
    If no meaningful records remain for this patient, automatically cleans up the orphan patient.
    """
    conn = get_db_connection(db_path)
    cursor = conn.cursor()

    # 1. Verify document belongs to patient
    cursor.execute("SELECT * FROM documents WHERE id = ? AND patient_id = ?", (document_id, patient_id))
    doc_row = cursor.fetchone()
    if not doc_row:
        conn.close()
        return {"success": False, "error": f"Document `{document_id}` not found for patient `{patient_id}`."}

    # 2. Check if this document had active medications
    cursor.execute(
        "SELECT COUNT(*) as cnt FROM medications WHERE document_id = ? AND patient_id = ? AND UPPER(status) = 'ACTIVE'",
        (document_id, patient_id)
    )
    had_active_meds = cursor.fetchone()["cnt"] > 0

    # 3. Perform atomic deletion of document and its linked records
    with conn:
        cursor.execute("DELETE FROM medications WHERE document_id = ? AND patient_id = ?", (document_id, patient_id))
        cursor.execute("DELETE FROM timeline_events WHERE document_id = ? AND patient_id = ?", (document_id, patient_id))
        cursor.execute("DELETE FROM lab_results WHERE document_id = ? AND patient_id = ?", (document_id, patient_id))
        cursor.execute("DELETE FROM symptoms WHERE document_id = ? AND patient_id = ?", (document_id, patient_id))
        cursor.execute("DELETE FROM documents WHERE id = ? AND patient_id = ?", (document_id, patient_id))

    new_active_doc_id = None
    # 4. If active medications were deleted, promote next most recent prescription for the same patient
    if had_active_meds:
        cursor.execute(
            """
            SELECT d.id, d.document_date
            FROM documents d
            JOIN medications m ON m.document_id = d.id
            WHERE d.patient_id = ?
            ORDER BY d.document_date DESC, d.uploaded_at DESC
            LIMIT 1
            """,
            (patient_id,)
        )
        next_rx = cursor.fetchone()
        if next_rx:
            new_active_doc_id = next_rx["id"]
            set_prescription_as_current(new_active_doc_id, patient_id=patient_id, db_path=db_path)

    conn.close()

    # 5. Check if the patient has become orphaned (0 remaining records)
    cleanup_res = cleanup_orphaned_patient(patient_id=patient_id, db_path=db_path)

    return {
        "success": True,
        "deleted_document_id": document_id,
        "patient_id": patient_id,
        "had_active_meds": had_active_meds,
        "new_active_document_id": new_active_doc_id,
        "patient_cleaned": cleanup_res.get("cleaned", False),
        "cleanup_details": cleanup_res
    }


def delete_patient(patient_id: str, db_path: str = DB_PATH) -> Dict[str, Any]:
    """Completely and permanently deletes a patient profile and all linked records in a single transaction.
    
    Deletes in strict dependency order:
    1. emergency_events
    2. timeline_events
    3. medications
    4. lab_results
    5. symptoms
    6. documents
    7. patients
    """
    if not patient_id:
        return {"success": False, "error": "No patient ID provided."}

    conn = get_db_connection(db_path)
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM patients WHERE id = ?", (patient_id,))
    pat_row = cursor.fetchone()
    if not pat_row:
        conn.close()
        return {"success": False, "error": f"Patient `{patient_id}` not found."}

    pat_name = pat_row["name"]

    with conn:
        cursor.execute("DELETE FROM emergency_events WHERE patient_id = ?", (patient_id,))
        cursor.execute("DELETE FROM timeline_events WHERE patient_id = ?", (patient_id,))
        cursor.execute("DELETE FROM medications WHERE patient_id = ?", (patient_id,))
        cursor.execute("DELETE FROM lab_results WHERE patient_id = ?", (patient_id,))
        cursor.execute("DELETE FROM symptoms WHERE patient_id = ?", (patient_id,))
        cursor.execute("DELETE FROM documents WHERE patient_id = ?", (patient_id,))
        cursor.execute("DELETE FROM patients WHERE id = ?", (patient_id,))

    conn.close()
    return {
        "success": True,
        "patient_id": patient_id,
        "patient_name": pat_name,
        "message": f"Patient `{pat_name}` (ID: {patient_id}) and all clinical records deleted permanently."
    }


def cleanup_all_orphaned_patients(db_path: str = DB_PATH) -> int:
    """Removes all patients from the database who have zero remaining documents, medications, or lab results."""
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("""
        DELETE FROM patients
        WHERE NOT EXISTS (SELECT 1 FROM documents d WHERE d.patient_id = patients.id)
          AND NOT EXISTS (SELECT 1 FROM medications m WHERE m.patient_id = patients.id)
          AND NOT EXISTS (SELECT 1 FROM lab_results l WHERE l.patient_id = patients.id)
          AND NOT EXISTS (SELECT 1 FROM timeline_events t WHERE t.patient_id = patients.id)
    """)
    deleted_count = cursor.rowcount
    conn.commit()
    conn.close()
    return deleted_count


def get_patient(patient_id: str, db_path: str = DB_PATH) -> Optional[Dict[str, Any]]:
    """Fetch patient details by patient ID."""
    if not patient_id:
        return None
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM patients WHERE id = ?", (patient_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def get_patients(db_path: str = DB_PATH) -> List[Dict[str, Any]]:
    """Fetch registered patient profiles that have associated clinical records (prescriptions/documents/labs)."""
    # First purge any orphaned profiles
    cleanup_all_orphaned_patients(db_path=db_path)

    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("""
        SELECT DISTINCT p.* 
        FROM patients p
        WHERE EXISTS (SELECT 1 FROM documents d WHERE d.patient_id = p.id)
           OR EXISTS (SELECT 1 FROM medications m WHERE m.patient_id = p.id)
           OR EXISTS (SELECT 1 FROM lab_results l WHERE l.patient_id = p.id)
           OR EXISTS (SELECT 1 FROM timeline_events t WHERE t.patient_id = p.id)
        ORDER BY p.name ASC
    """)
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_all_patients(db_path: str = DB_PATH) -> List[Dict[str, Any]]:
    """Alias to fetch all active registered patient profiles."""
    return get_patients(db_path=db_path)


def get_documents(patient_id: str = "P101", db_path: str = DB_PATH) -> List[Dict[str, Any]]:
    """Fetch all medical documents ingested for a patient."""
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM documents WHERE patient_id = ? ORDER BY uploaded_at DESC",
        (patient_id,)
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_lab_results(
    patient_id: str = "P101",
    test_name: Optional[str] = None,
    db_path: str = DB_PATH
) -> List[Dict[str, Any]]:
    """Fetch lab results for a patient ordered chronologically, optionally filtered by test name."""
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    if test_name:
        cursor.execute(
            "SELECT * FROM lab_results WHERE patient_id = ? AND test_name = ? ORDER BY test_date ASC",
            (patient_id, test_name)
        )
    else:
        cursor.execute(
            "SELECT * FROM lab_results WHERE patient_id = ? ORDER BY test_date ASC",
            (patient_id,)
        )
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def parse_clinical_date(date_str: Optional[str]) -> Optional[datetime.date]:
    """Parses various clinical date string formats into a standardized datetime.date object."""
    if not date_str or not str(date_str).strip():
        return None
    cleaned = str(date_str).strip().replace("/", "-").replace(".", "-")

    # 1. YYYY-MM-DD
    match = re.search(r"(\d{4})-(\d{1,2})-(\d{1,2})", cleaned)
    if match:
        try:
            return datetime.date(int(match.group(1)), int(match.group(2)), int(match.group(3)))
        except ValueError:
            pass

    # 2. DD-MM-YYYY or MM-DD-YYYY
    match = re.search(r"(\d{1,2})-(\d{1,2})-(\d{4})", cleaned)
    if match:
        p1, p2, p3 = int(match.group(1)), int(match.group(2)), int(match.group(3))
        if p1 > 12:
            try:
                return datetime.date(p3, p2, p1)
            except ValueError:
                pass
        else:
            try:
                return datetime.date(p3, p1, p2)
            except ValueError:
                pass

    # 3. Textual dates (e.g., '18 Aug 2026', 'August 18, 2026')
    for fmt in [
        "%d %b %Y", "%d %B %Y", "%b %d, %Y", "%B %d, %Y",
        "%b %d %Y", "%B %d %Y", "%Y-%m-%d", "%Y-%m"
    ]:
        try:
            return datetime.datetime.strptime(str(date_str).strip(), fmt).date()
        except ValueError:
            pass

    return None


def get_active_prescription_info(patient_id: str = "P101", db_path: str = DB_PATH) -> Dict[str, Any]:
    """Retrieves metadata regarding the currently active prescription and its medications."""
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT m.id, m.name, m.dosage, m.frequency, m.route, m.purpose,
               m.start_date, m.end_date, m.status, m.document_id,
               d.file_name, d.document_date
        FROM medications m
        LEFT JOIN documents d ON m.document_id = d.id
        WHERE m.patient_id = ? AND UPPER(m.status) = 'ACTIVE'
        ORDER BY m.start_date DESC
        """,
        (patient_id,)
    )
    rows = cursor.fetchall()
    conn.close()

    active_meds = [dict(r) for r in rows]
    if not active_meds:
        return {
            "has_active_prescription": False,
            "document_id": None,
            "document_date": None,
            "parsed_date": None,
            "file_name": None,
            "medications": []
        }

    latest_doc_date_str = None
    latest_parsed_date = None
    latest_doc_id = None
    latest_file_name = None

    for m in active_meds:
        doc_date_str = m.get("document_date") or m.get("start_date")
        parsed = parse_clinical_date(doc_date_str)
        if parsed:
            if latest_parsed_date is None or parsed > latest_parsed_date:
                latest_parsed_date = parsed
                latest_doc_date_str = doc_date_str
                latest_doc_id = m.get("document_id")
                latest_file_name = m.get("file_name")

    return {
        "has_active_prescription": True,
        "document_id": latest_doc_id or active_meds[0].get("document_id"),
        "document_date": latest_doc_date_str,
        "parsed_date": latest_parsed_date,
        "file_name": latest_file_name or "Active Prescription",
        "medications": active_meds
    }


def set_prescription_as_current(
    document_id: str,
    patient_id: str = "P101",
    db_path: str = DB_PATH
) -> Dict[str, Any]:
    """Explicitly promotes a specific document's medications to ACTIVE and supersedes previous active medications."""
    conn = get_db_connection(db_path)
    with conn:
        cursor = conn.cursor()
        # 1. Supersede current active medications that belong to other documents
        cursor.execute(
            """
            UPDATE medications
            SET status = 'SUPERSEDED'
            WHERE patient_id = ? AND UPPER(status) = 'ACTIVE' AND (document_id IS NULL OR document_id != ?)
            """,
            (patient_id, document_id)
        )
        superseded_count = cursor.rowcount

        # 2. Activate medications belonging to this document
        cursor.execute(
            """
            UPDATE medications
            SET status = 'ACTIVE'
            WHERE patient_id = ? AND document_id = ?
            """,
            (patient_id, document_id)
        )
        activated_count = cursor.rowcount

    conn.close()
    return {
        "success": True,
        "document_id": document_id,
        "patient_id": patient_id,
        "activated_count": activated_count,
        "superseded_count": superseded_count
    }


def get_medications(
    patient_id: str = "P101",
    status: Optional[str] = None,
    db_path: str = DB_PATH
) -> List[Dict[str, Any]]:
    """Fetch patient medications, optionally filtered by status (ACTIVE, SUPERSEDED, DISCONTINUED)."""
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    if status:
        cursor.execute(
            "SELECT * FROM medications WHERE patient_id = ? AND UPPER(status) = UPPER(?) ORDER BY start_date DESC",
            (patient_id, status)
        )
    else:
        cursor.execute(
            """
            SELECT * FROM medications WHERE patient_id = ? 
            ORDER BY CASE WHEN UPPER(status)='ACTIVE' THEN 0 ELSE 1 END, start_date DESC
            """,
            (patient_id,)
        )
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_symptoms(patient_id: str = "P101", db_path: str = DB_PATH) -> List[Dict[str, Any]]:
    """Fetch recorded symptoms for a patient."""
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM symptoms WHERE patient_id = ? ORDER BY created_at DESC",
        (patient_id,)
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_timeline(patient_id: str = "P101", db_path: str = DB_PATH) -> List[Dict[str, Any]]:
    """Fetch chronological timeline events."""
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM timeline_events WHERE patient_id = ? ORDER BY event_date DESC",
        (patient_id,)
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_timeline_events(patient_id: str = "P101", db_path: str = DB_PATH) -> List[Dict[str, Any]]:
    """Alias for get_timeline."""
    return get_timeline(patient_id=patient_id, db_path=db_path)


def get_current_medications(patient_id: str = "P101", db_path: str = DB_PATH) -> List[Dict[str, Any]]:
    """Fetches currently active medications for a specific patient."""
    return get_medications(patient_id=patient_id, status="ACTIVE", db_path=db_path)


def get_prescriptions(patient_id: str = "P101", db_path: str = DB_PATH) -> List[Dict[str, Any]]:
    """Fetches all prescription documents for a specific patient."""
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT DISTINCT d.* 
        FROM documents d
        LEFT JOIN medications m ON m.document_id = d.id
        WHERE d.patient_id = ? AND (
            LOWER(d.file_type) LIKE '%prescription%' OR 
            LOWER(d.file_type) LIKE '%rx%' OR 
            m.id IS NOT NULL
        )
        ORDER BY d.document_date DESC, d.uploaded_at DESC
        """,
        (patient_id,)
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def set_current_prescription(
    document_id: str,
    patient_id: str = "P101",
    db_path: str = DB_PATH
) -> Dict[str, Any]:
    """Alias for set_prescription_as_current."""
    return set_prescription_as_current(document_id=document_id, patient_id=patient_id, db_path=db_path)


def get_emergency_profile(patient_id: str = "P101", db_path: str = DB_PATH) -> Dict[str, Any]:
    """Fetches comprehensive emergency triage profile for a patient."""
    patient = get_patient(patient_id, db_path=db_path) or {}
    active_meds = get_current_medications(patient_id, db_path=db_path)
    events = get_emergency_events(patient_id, limit=10, db_path=db_path)
    return {
        "patient": patient,
        "name": patient.get("name") or "Unnamed Patient",
        "blood_group": patient.get("blood_group") or "Unknown",
        "allergies": patient.get("allergies") or "None documented",
        "chronic_conditions": patient.get("chronic_conditions") or patient.get("important_conditions") or "None documented",
        "emergency_contact_name": patient.get("emergency_contact_name") or "None documented",
        "emergency_contact_relationship": patient.get("emergency_contact_relationship") or "",
        "emergency_contact_phone": patient.get("emergency_contact_phone") or "",
        "active_medications": active_meds,
        "recent_emergency_events": events
    }


def get_doctor_brief_data(patient_id: str = "P101", db_path: str = DB_PATH) -> Dict[str, Any]:
    """Assembles all relevant clinical facts from SQLite into a structured payload for Doctor Brief generation."""
    patient = get_patient(patient_id, db_path=db_path) or {}
    documents = get_documents(patient_id, db_path=db_path)
    labs = get_lab_results(patient_id, db_path=db_path)
    meds = get_medications(patient_id, db_path=db_path)
    symptoms = get_symptoms(patient_id, db_path=db_path)
    timeline = get_timeline(patient_id, db_path=db_path)

    active_meds = [m for m in meds if (m.get("status") or "").upper() == "ACTIVE"]
    disc_meds = [m for m in meds if (m.get("status") or "").upper() in ["DISCONTINUED", "INACTIVE", "PRIOR", "SUPERSEDED", "HISTORICAL"]]

    return {
        "patient_profile": {
            "name": patient.get("name"),
            "age": patient.get("age"),
            "gender": patient.get("gender"),
            "blood_group": patient.get("blood_group"),
            "chronic_conditions": patient.get("chronic_conditions") or patient.get("important_conditions"),
            "known_allergies": patient.get("allergies"),
            "emergency_contact": f"{patient.get('emergency_contact_name', '')} ({patient.get('emergency_contact_phone', '')})"
        },
        "recent_encounters": timeline[:5],
        "recent_labs": labs[-10:] if labs else [],
        "active_medications": active_meds,
        "discontinued_medications": disc_meds,
        "reported_symptoms": symptoms[:6],
        "important_documents": [
            {"file_name": d.get("file_name"), "type": d.get("file_type"), "date": d.get("document_date")}
            for d in documents[:5]
        ]
    }


# =====================================================================
# TRANSACTIONAL PROFILE SYNCHRONIZATION & BUNDLE PERSISTENCE
# =====================================================================

def sync_patient_profile_from_document(
    document: MedicalDocument,
    file_name: str,
    file_path: str = "",
    raw_text: str = "",
    patient_id: str = "P101",
    db_path: str = DB_PATH
) -> Dict[str, Any]:
    """Centralized synchronization engine connecting ingested documents to current patient profile and history."""
    # 1. Fetch existing patient baseline to prevent overwriting valid fields with NULLs
    existing_patient = get_patient(patient_id, db_path=db_path)
    target_patient_id = patient_id

    # Non-destructive patient baseline merge
    merged_patient = {}
    if existing_patient:
        merged_patient = dict(existing_patient)
    else:
        merged_patient = {"id": target_patient_id, "name": "Unnamed Patient"}

    if document.patient_info:
        p_info = document.patient_info.model_dump()
        if p_info.get("id") or p_info.get("patient_id"):
            target_patient_id = p_info.get("id") or p_info.get("patient_id")
            merged_patient["id"] = target_patient_id

        # Update demographic fields only if non-empty in new document
        if p_info.get("name") and p_info.get("name").strip():
            merged_patient["name"] = p_info["name"].strip()
        if p_info.get("age") is not None:
            merged_patient["age"] = p_info["age"]
        if p_info.get("gender") and p_info.get("gender").strip():
            merged_patient["gender"] = p_info["gender"].strip()

        # Blood group: update if existing is missing/unknown and new doc has explicit value
        if p_info.get("blood_group") and p_info.get("blood_group").strip():
            merged_patient["blood_group"] = p_info["blood_group"].strip()

        # Emergency contact: update if new doc explicitly specifies contact
        if p_info.get("emergency_contact_name") and p_info.get("emergency_contact_name").strip():
            merged_patient["emergency_contact_name"] = p_info["emergency_contact_name"].strip()
        if p_info.get("emergency_contact_relationship") and p_info.get("emergency_contact_relationship").strip():
            merged_patient["emergency_contact_relationship"] = p_info["emergency_contact_relationship"].strip()
        if p_info.get("emergency_contact_phone") and p_info.get("emergency_contact_phone").strip():
            merged_patient["emergency_contact_phone"] = p_info["emergency_contact_phone"].strip()

        # Allergies: merge new distinct allergies without duplicates
        new_allergies = p_info.get("allergies")
        if new_allergies:
            new_allergies_list = [a.strip() for a in (new_allergies if isinstance(new_allergies, list) else new_allergies.split(",")) if a.strip()]
            existing_allergies_raw = merged_patient.get("allergies") or ""
            existing_allergies_list = [a.strip() for a in existing_allergies_raw.split(",") if a.strip()]
            for na in new_allergies_list:
                if na.lower() not in [ea.lower() for ea in existing_allergies_list]:
                    existing_allergies_list.append(na)
            merged_patient["allergies"] = ", ".join(existing_allergies_list)

        # Chronic / Important Conditions: merge
        new_conds = p_info.get("chronic_conditions") or p_info.get("important_conditions")
        if new_conds:
            new_conds_list = [c.strip() for c in (new_conds if isinstance(new_conds, list) else new_conds.split(",")) if c.strip()]
            existing_conds_raw = merged_patient.get("chronic_conditions") or merged_patient.get("important_conditions") or ""
            existing_conds_list = [c.strip() for c in existing_conds_raw.split(",") if c.strip()]
            for nc in new_conds_list:
                if nc.lower() not in [ec.lower() for ec in existing_conds_list]:
                    existing_conds_list.append(nc)
            merged_patient["chronic_conditions"] = ", ".join(existing_conds_list)
            merged_patient["important_conditions"] = ", ".join(existing_conds_list)

    # Persist merged patient baseline
    insert_patient(merged_patient, db_path=db_path)

    # 2. Insert Document
    doc_payload = document.model_dump()
    doc_payload["file_name"] = file_name
    doc_payload["file_path"] = file_path
    doc_payload["extracted_text"] = raw_text
    doc_payload["extraction_method"] = getattr(document, "extraction_method", "text") or "text"
    doc_id = insert_medical_document(doc_payload, patient_id=target_patient_id, db_path=db_path)

    # 3. Insert Labs
    inserted_labs = 0
    for lab in document.laboratory_results:
        if not lab.date and not lab.test_date and document.document_date:
            lab.date = document.document_date
        insert_lab_result(lab, patient_id=target_patient_id, document_id=doc_id, db_path=db_path)
        inserted_labs += 1

    # 4. Insert Symptoms
    inserted_symptoms = 0
    for sym in document.symptoms:
        insert_symptom(sym, patient_id=target_patient_id, document_id=doc_id, db_path=db_path)
        inserted_symptoms += 1

    # 5. Prescription & Medication Synchronization
    new_doc_parsed_date = parse_clinical_date(document.document_date)
    active_rx_info = get_active_prescription_info(patient_id=target_patient_id, db_path=db_path)
    prior_active_parsed_date = active_rx_info.get("parsed_date")

    sync_status = "NO_MEDICATIONS"
    is_current_prescription = False
    new_meds_assigned_status = "ACTIVE"
    previous_medications_summary = []
    current_medications_summary = []

    if document.medications:
        if new_doc_parsed_date is not None:
            if prior_active_parsed_date is None or new_doc_parsed_date >= prior_active_parsed_date:
                # NEWER OR EQUAL DATE -> Become CURRENT ACTIVE REGIMEN
                is_current_prescription = True
                new_meds_assigned_status = "ACTIVE"
                sync_status = "CURRENT_UPDATED"
                
                # Fetch and record previous active medications before superseding
                previous_medications_summary = active_rx_info.get("medications", [])

                # Supersede existing active medications
                conn = get_db_connection(db_path)
                with conn:
                    conn.execute(
                        "UPDATE medications SET status = 'SUPERSEDED' WHERE patient_id = ? AND UPPER(status) = 'ACTIVE'",
                        (target_patient_id,)
                    )
                conn.close()
            else:
                # OLDER DATE -> Preserve as HISTORICAL / SUPERSEDED
                is_current_prescription = False
                new_meds_assigned_status = "SUPERSEDED"
                sync_status = "HISTORICAL_PRESERVED"
                previous_medications_summary = active_rx_info.get("medications", [])
        else:
            # DATE UNCONFIDENT / UNCLEAR
            if not active_rx_info.get("has_active_prescription"):
                is_current_prescription = True
                new_meds_assigned_status = "ACTIVE"
                sync_status = "CURRENT_UPDATED"
            else:
                is_current_prescription = False
                new_meds_assigned_status = "PENDING_VERIFICATION"
                sync_status = "DATE_UNCLEAR"

        # Insert medications with determined status
        for med in document.medications:
            med_dict = med.model_dump() if hasattr(med, "model_dump") else dict(med)
            med_dict["status"] = new_meds_assigned_status
            if not med_dict.get("start_date") and document.document_date:
                med_dict["start_date"] = document.document_date
            insert_medication(med_dict, patient_id=target_patient_id, document_id=doc_id, db_path=db_path)
            current_medications_summary.append(med_dict)

    # 6. Insert Timeline Event
    doc_date = document.document_date or "Undated"
    status_tag = ""
    if document.medications:
        if is_current_prescription:
            status_tag = " • [CURRENT REGIMEN]"
        elif sync_status == "HISTORICAL_PRESERVED":
            status_tag = " • [SUPERSEDED]"
        elif sync_status == "DATE_UNCLEAR":
            status_tag = " • [PENDING DATE REVIEW]"

    event_title = f"{document.document_type or 'Medical Record'}: {file_name}{status_tag}"
    event_desc = document.summary or f"Ingested {file_name} ({len(document.medications)} meds, {inserted_labs} labs)."

    insert_timeline_event(
        TimelineEvent(
            event_date=doc_date,
            category=document.document_type or "Medical Record",
            title=event_title,
            description=event_desc,
            document_id=doc_id
        ),
        patient_id=target_patient_id,
        document_id=doc_id,
        db_path=db_path
    )

    return {
        "document_id": doc_id,
        "patient_id": target_patient_id,
        "sync_status": sync_status,
        "is_current_prescription": is_current_prescription,
        "document_date": document.document_date,
        "parsed_date": str(new_doc_parsed_date) if new_doc_parsed_date else None,
        "previous_active_date": str(prior_active_parsed_date) if prior_active_parsed_date else None,
        "previous_medications": previous_medications_summary,
        "current_medications": current_medications_summary,
        "labs_count": inserted_labs,
        "medications_count": len(document.medications),
        "symptoms_count": inserted_symptoms
    }


def save_extracted_document_bundle(
    document: MedicalDocument,
    file_name: str,
    file_path: str = "",
    raw_text: str = "",
    patient_id: str = "P101",
    db_path: str = DB_PATH
) -> Dict[str, Any]:
    """Persists a complete AI-extracted document bundle with date-aware profile synchronization."""
    return sync_patient_profile_from_document(
        document=document,
        file_name=file_name,
        file_path=file_path,
        raw_text=raw_text,
        patient_id=patient_id,
        db_path=db_path
    )


# =====================================================================
# DEMO SYNTHETIC SEEDER
# =====================================================================

def seed_mock_data_if_empty(db_path: str = DB_PATH) -> None:
    """Seeds synthetic demo patient records to demonstrate dashboard capabilities and patient switching."""
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM patients")
    if cursor.fetchone()[0] == 0:
        with conn:
            # 1. Synthetic Patients (Rahul Sharma & Priya Sharma)
            patients_seed = [
                (
                    "P101",
                    "Rahul Sharma",
                    52,
                    "Male",
                    "O+",
                    "Sunita Sharma",
                    "Spouse",
                    "+91 98765 43210",
                    "Penicillin",
                    "Type 2 Diabetes, Hypertension",
                    "Type 2 Diabetes, Hypertension"
                ),
                (
                    "P102",
                    "Priya Sharma",
                    48,
                    "Female",
                    "A+",
                    "Vikram Sharma",
                    "Spouse",
                    "+91 98123 45678",
                    "None recorded",
                    "Hypothyroidism, Hyperlipidemia",
                    "Hypothyroidism, Hyperlipidemia"
                )
            ]
            cursor.executemany(
                """INSERT INTO patients (
                    id, name, age, gender, blood_group, emergency_contact_name,
                    emergency_contact_relationship, emergency_contact_phone,
                    allergies, chronic_conditions, important_conditions
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                patients_seed
            )

            # 2. Synthetic Lab History for P101 & P102
            mock_labs = [
                # P101 (Rahul Sharma)
                ("L1", "P101", "HbA1c", "Metabolic", 7.8, "%", "4.0 - 5.6", "HIGH", "2025-03-15"),
                ("L2", "P101", "HbA1c", "Metabolic", 7.2, "%", "4.0 - 5.6", "HIGH", "2025-07-20"),
                ("L3", "P101", "HbA1c", "Metabolic", 6.7, "%", "4.0 - 5.6", "HIGH", "2025-11-10"),
                ("L4", "P101", "HbA1c", "Metabolic", 6.4, "%", "4.0 - 5.6", "HIGH", "2026-02-05"),

                ("L5", "P101", "Fasting Glucose", "Metabolic", 162.0, "mg/dL", "70 - 99", "HIGH", "2025-03-15"),
                ("L6", "P101", "Fasting Glucose", "Metabolic", 145.0, "mg/dL", "70 - 99", "HIGH", "2025-07-20"),
                ("L7", "P101", "Fasting Glucose", "Metabolic", 128.0, "mg/dL", "70 - 99", "HIGH", "2025-11-10"),
                ("L8", "P101", "Fasting Glucose", "Metabolic", 112.0, "mg/dL", "70 - 99", "HIGH", "2026-02-05"),

                ("L9", "P101", "Systolic BP", "Vitals", 148.0, "mmHg", "90 - 120", "HIGH", "2025-03-15"),
                ("L10", "P101", "Systolic BP", "Vitals", 138.0, "mmHg", "90 - 120", "HIGH", "2025-07-20"),
                ("L11", "P101", "Systolic BP", "Vitals", 130.0, "mmHg", "90 - 120", "HIGH", "2025-11-10"),
                ("L12", "P101", "Systolic BP", "Vitals", 124.0, "mmHg", "90 - 120", "NORMAL", "2026-02-05"),

                ("L13", "P101", "Total Cholesterol", "Lipid", 235.0, "mg/dL", "< 200", "HIGH", "2025-03-15"),
                ("L14", "P101", "Total Cholesterol", "Lipid", 210.0, "mg/dL", "< 200", "HIGH", "2025-07-20"),
                ("L15", "P101", "Total Cholesterol", "Lipid", 192.0, "mg/dL", "< 200", "NORMAL", "2026-02-05"),

                # P102 (Priya Sharma)
                ("L16", "P102", "TSH", "Thyroid", 5.8, "uIU/mL", "0.4 - 4.0", "HIGH", "2025-05-10"),
                ("L17", "P102", "TSH", "Thyroid", 3.2, "uIU/mL", "0.4 - 4.0", "NORMAL", "2025-09-18"),
                ("L18", "P102", "TSH", "Thyroid", 2.4, "uIU/mL", "0.4 - 4.0", "NORMAL", "2026-01-15"),
                ("L19", "P102", "Total Cholesterol", "Lipid", 228.0, "mg/dL", "< 200", "HIGH", "2025-05-10"),
                ("L20", "P102", "Total Cholesterol", "Lipid", 185.0, "mg/dL", "< 200", "NORMAL", "2026-01-15"),
            ]
            cursor.executemany(
                """INSERT INTO lab_results (id, patient_id, test_name, test_category, value, unit, reference_range, flag, test_date)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                mock_labs
            )

            # 3. Synthetic Medications
            mock_meds = [
                # P101 (Rahul Sharma)
                ("M1", "P101", "Metformin", "500 mg", "Twice daily with meals", "Oral", "Blood glucose control", "2024-01-10", None, "ACTIVE"),
                ("M2", "P101", "Lisinopril", "10 mg", "Once daily morning", "Oral", "Blood pressure regulation", "2024-06-01", None, "ACTIVE"),
                ("M3", "P101", "Hydrochlorothiazide", "12.5 mg", "Once daily", "Oral", "Prior diuretic (switched)", "2023-05-12", "2024-05-30", "SUPERSEDED"),
                # P102 (Priya Sharma)
                ("M4", "P102", "Levothyroxine", "50 mcg", "Once daily empty stomach", "Oral", "Thyroid regulation", "2025-05-15", None, "ACTIVE"),
                ("M5", "P102", "Atorvastatin", "10 mg", "Once daily night", "Oral", "Lipid regulation", "2025-05-15", None, "ACTIVE"),
            ]
            cursor.executemany(
                """INSERT INTO medications (id, patient_id, name, dosage, frequency, route, purpose, start_date, end_date, status)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                mock_meds
            )

            # 4. Synthetic Timeline Events
            mock_events = [
                # P101
                ("E1", "P101", "2026-02-05", "Doctor Visit", "Quarterly Endocrinology Review", "HbA1c down to 6.4%. Lifestyle modifications progressing well. Continuing current regimen."),
                ("E2", "P101", "2026-02-05", "Lab Report", "Comprehensive Metabolic Panel & Lipid Panel", "HbA1c 6.4%, Total Cholesterol 192 mg/dL, Fasting Glucose 112 mg/dL."),
                ("E3", "P101", "2025-11-10", "Doctor Visit", "Routine Cardiology Follow-up", "Blood pressure nicely controlled on Lisinopril 10mg. No peripheral edema."),
                ("E4", "P101", "2025-07-20", "Lab Report", "HbA1c & Fasting Glucose Check", "HbA1c showed positive trend reduction from 7.8% to 7.2%."),
                ("E5", "P101", "2025-03-20", "Prescription", "Lisinopril Initiated", "Switched from Hydrochlorothiazide to Lisinopril 10mg daily."),
                ("E6", "P101", "2025-03-15", "Hospital Report", "Annual Wellness & Baseline Panel", "Baseline lab work indicated elevated HbA1c (7.8%) and BP (148/92)."),
                # P102
                ("E7", "P102", "2026-01-15", "Doctor Visit", "Thyroid & Lipid Checkup", "TSH normalized to 2.4 uIU/mL on Levothyroxine 50mcg. Cholesterol normalized."),
                ("E8", "P102", "2025-09-18", "Lab Report", "Follow-up Thyroid Panel", "TSH improving from 5.8 to 3.2 uIU/mL."),
                ("E9", "P102", "2025-05-15", "Prescription", "Levothyroxine & Atorvastatin Initiated", "Prescribed Levothyroxine 50mcg and Atorvastatin 10mg."),
            ]
            cursor.executemany(
                """INSERT INTO timeline_events (id, patient_id, event_date, category, title, description)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                mock_events
            )
    else:
        # If patients exist, ensure both P101 and P102 records are seeded
        with conn:
            cursor.execute("SELECT id FROM patients WHERE id = 'P101'")
            if not cursor.fetchone():
                cursor.execute(
                    """INSERT INTO patients (id, name, age, gender, blood_group, emergency_contact_name,
                       emergency_contact_relationship, emergency_contact_phone, allergies, chronic_conditions, important_conditions)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    ("P101", "Rahul Sharma", 52, "Male", "O+", "Sunita Sharma", "Spouse", "+91 98765 43210", "Penicillin", "Type 2 Diabetes, Hypertension", "Type 2 Diabetes, Hypertension")
                )
            cursor.execute("SELECT id FROM patients WHERE id = 'P102'")
            if not cursor.fetchone():
                cursor.execute(
                    """INSERT INTO patients (id, name, age, gender, blood_group, emergency_contact_name,
                       emergency_contact_relationship, emergency_contact_phone, allergies, chronic_conditions, important_conditions)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    ("P102", "Priya Sharma", 48, "Female", "A+", "Vikram Sharma", "Spouse", "+91 98123 45678", "None recorded", "Hypothyroidism, Hyperlipidemia", "Hypothyroidism, Hyperlipidemia")
                )
    conn.close()
