"""Database Models, Schema Definitions, and Pydantic Schemas for CAREBRIDGE.
Provides strongly-typed, predictable data models for patient records, documents,
lab results, medications, symptoms, and timeline events.
"""

from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field, field_validator


# =====================================================================
# PYDANTIC DATA MODELS FOR CLINICAL INFORMATION
# =====================================================================

class Patient(BaseModel):
    """Structured model for patient demographic and clinical baseline information."""
    id: Optional[str] = None
    patient_id: Optional[str] = None
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_relationship: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    allergies: Optional[Union[str, List[str]]] = None
    chronic_conditions: Optional[Union[str, List[str]]] = None
    important_conditions: Optional[Union[str, List[str]]] = None

    model_config = {"extra": "ignore"}


class EmergencyEvent(BaseModel):
    """Structured model for logged emergency mode activations and actions."""
    id: Optional[str] = None
    patient_id: str = "P101"
    timestamp: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_accuracy: Optional[float] = None
    location_status: Optional[str] = "ACQUIRED"
    actions: Optional[str] = None
    status: Optional[str] = "ACTIVE"

    model_config = {"extra": "ignore"}


class LabResult(BaseModel):
    """Structured model for individual laboratory and diagnostic test readings."""
    id: Optional[str] = None
    test_name: str
    category: Optional[str] = "General"
    value: Optional[float] = None
    raw_value: Optional[str] = None
    unit: Optional[str] = None
    reference_range: Optional[str] = None
    flag: Optional[str] = "NORMAL"
    date: Optional[str] = None
    test_date: Optional[str] = None

    model_config = {"extra": "ignore"}

    @field_validator("value", mode="before")
    @classmethod
    def parse_numeric_value(cls, v):
        if v is None or v == "":
            return None
        if isinstance(v, (int, float)):
            return float(v)
        if isinstance(v, str):
            try:
                # Remove spaces and commas before converting
                cleaned = v.strip().replace(",", "")
                return float(cleaned)
            except ValueError:
                return None
        return None


class Medication(BaseModel):
    """Structured model for active and historical prescriptions and medications."""
    id: Optional[str] = None
    name: str
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    route: Optional[str] = None
    purpose: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    status: Optional[str] = "ACTIVE"

    model_config = {"extra": "ignore"}


class Symptom(BaseModel):
    """Structured model for documented patient symptoms and reported complaints."""
    id: Optional[str] = None
    symptom: str
    severity: Optional[str] = "UNKNOWN"
    onset_date: Optional[str] = None
    status: Optional[str] = "UNKNOWN"
    notes: Optional[str] = None

    model_config = {"extra": "ignore"}


class TimelineEvent(BaseModel):
    """Structured model for chronological milestones in the patient health journey."""
    id: Optional[str] = None
    event_date: Optional[str] = None
    category: Optional[str] = "General"
    title: str
    description: Optional[str] = None
    document_id: Optional[str] = None

    model_config = {"extra": "ignore"}


class MedicalDocument(BaseModel):
    """Structured model for an ingested and AI-processed medical document."""
    id: Optional[str] = None
    patient_id: Optional[str] = None
    document_type: Optional[str] = "Medical Record"
    extraction_method: Optional[str] = "text"
    document_date: Optional[str] = None
    file_name: Optional[str] = None
    patient_info: Optional[Patient] = None
    laboratory_results: List[LabResult] = Field(default_factory=list)
    medications: List[Medication] = Field(default_factory=list)
    symptoms: List[Symptom] = Field(default_factory=list)
    medical_conditions_history: List[Dict[str, Any]] = Field(default_factory=list)
    important_observations: List[Dict[str, Any]] = Field(default_factory=list)
    timeline_events: List[TimelineEvent] = Field(default_factory=list)
    summary: Optional[str] = None
    extracted_text: Optional[str] = None

    model_config = {"extra": "ignore"}


# =====================================================================
# SQL SCHEMA DEFINITION FOR SQLITE DATABASE
# =====================================================================

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS patients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    age INTEGER,
    gender TEXT,
    blood_group TEXT,
    emergency_contact_name TEXT,
    emergency_contact_relationship TEXT,
    emergency_contact_phone TEXT,
    allergies TEXT,
    chronic_conditions TEXT,
    important_conditions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    extraction_method TEXT DEFAULT 'text',
    document_date TEXT,
    extracted_text TEXT,
    raw_json_data TEXT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(patient_id) REFERENCES patients(id)
);

CREATE TABLE IF NOT EXISTS timeline_events (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    event_date TEXT NOT NULL,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    document_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(patient_id) REFERENCES patients(id),
    FOREIGN KEY(document_id) REFERENCES documents(id)
);

CREATE TABLE IF NOT EXISTS lab_results (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    document_id TEXT,
    test_name TEXT NOT NULL,
    test_category TEXT,
    value REAL,
    raw_value TEXT,
    unit TEXT,
    reference_range TEXT,
    flag TEXT,
    test_date TEXT,
    FOREIGN KEY(patient_id) REFERENCES patients(id),
    FOREIGN KEY(document_id) REFERENCES documents(id)
);

CREATE TABLE IF NOT EXISTS medications (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    name TEXT NOT NULL,
    dosage TEXT,
    frequency TEXT,
    route TEXT,
    purpose TEXT,
    start_date TEXT,
    end_date TEXT,
    status TEXT DEFAULT 'ACTIVE',
    document_id TEXT,
    FOREIGN KEY(patient_id) REFERENCES patients(id),
    FOREIGN KEY(document_id) REFERENCES documents(id)
);

CREATE TABLE IF NOT EXISTS symptoms (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    symptom TEXT NOT NULL,
    severity TEXT,
    onset_date TEXT,
    status TEXT,
    notes TEXT,
    document_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(patient_id) REFERENCES patients(id),
    FOREIGN KEY(document_id) REFERENCES documents(id)
);

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
"""
