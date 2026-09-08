"""Biomarker Trends & Factual Shift Analysis API."""

from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException
from database.database import get_lab_results, get_patient

router = APIRouter()


def calculate_biomarker_shifts(labs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Calculates factual biomarker changes between consecutive recorded readings."""
    if not labs:
        return []

    tests_history: Dict[str, List[Dict[str, Any]]] = {}
    for lab in labs:
        test_name = lab["test_name"]
        if test_name not in tests_history:
            tests_history[test_name] = []
        tests_history[test_name].append(lab)

    shifts = []
    for test_name, history in tests_history.items():
        sorted_hist = sorted(history, key=lambda x: x.get("test_date") or "")
        if len(sorted_hist) >= 2:
            latest = sorted_hist[-1]
            prior = sorted_hist[-2]
            latest_val = latest.get("value")
            prior_val = prior.get("value")

            if latest_val is not None and prior_val is not None:
                delta = round(latest_val - prior_val, 2)
                pct_change = round(((latest_val - prior_val) / prior_val) * 100, 1) if prior_val != 0 else 0
                shifts.append({
                    "test_name": test_name,
                    "category": latest.get("category", "General"),
                    "latest_value": latest_val,
                    "prior_value": prior_val,
                    "unit": latest.get("unit") or "",
                    "delta": delta,
                    "pct_change": pct_change,
                    "flag": latest.get("flag") or "NORMAL",
                    "reference_range": latest.get("reference_range", ""),
                    "latest_date": latest.get("test_date") or "Latest",
                    "prior_date": prior.get("test_date") or "Prior"
                })
        elif len(sorted_hist) == 1:
            latest = sorted_hist[0]
            if latest.get("value") is not None:
                shifts.append({
                    "test_name": test_name,
                    "category": latest.get("category", "General"),
                    "latest_value": latest.get("value"),
                    "prior_value": None,
                    "unit": latest.get("unit") or "",
                    "delta": None,
                    "pct_change": None,
                    "flag": latest.get("flag") or "NORMAL",
                    "reference_range": latest.get("reference_range", ""),
                    "latest_date": latest.get("test_date") or "Recorded",
                    "prior_date": None
                })
    return shifts


@router.get("/patients/{patient_id}/trends")
def get_patient_trends(patient_id: str):
    """Retrieve all laboratory biomarker data points and computed longitudinal shifts."""
    patient = get_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")

    labs = get_lab_results(patient_id)
    shifts = calculate_biomarker_shifts(labs)

    # Format time-series data for charting
    trajectory_data = []
    for l in sorted(labs, key=lambda x: x.get("test_date") or ""):
        if l.get("value") is not None:
            trajectory_data.append({
                "test_name": l.get("test_name"),
                "date": l.get("test_date"),
                "value": l.get("value"),
                "unit": l.get("unit") or "",
                "flag": l.get("flag") or "NORMAL",
                "reference_range": l.get("reference_range") or ""
            })

    return {
        "success": True,
        "patient_id": patient_id,
        "labs": labs,
        "shifts": shifts,
        "trajectory_data": trajectory_data
    }
