"""CAREBRIDGE FastAPI Backend
High-performance REST API for the CAREBRIDGE AI Health Platform.
"""

import sys
import os

# Ensure workspace root is in sys.path
_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(_ROOT, ".env"))

# Initialize Database
from database.database import init_db
init_db()

# Create FastAPI app
app = FastAPI(
    title="CAREBRIDGE API",
    description="AI-Powered Longitudinal Health Story & Clinical Continuity Platform",
    version="2.0.0"
)

# Configure CORS for React frontend (Vite default is http://localhost:5173)
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://localhost:8501",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import and register routers
from backend.api.patients import router as patients_router
from backend.api.documents import router as documents_router
from backend.api.timeline import router as timeline_router
from backend.api.trends import router as trends_router
from backend.api.medications import router as medications_router
from backend.api.doctor_brief import router as doctor_brief_router
from backend.api.translation import router as translation_router
from backend.api.emergency import router as emergency_router
from backend.api.prescriptions import router as prescriptions_router

app.include_router(patients_router, prefix="/api", tags=["Patients & Demo"])
app.include_router(documents_router, prefix="/api", tags=["Documents & Ingestion"])
app.include_router(timeline_router, prefix="/api", tags=["Health Timeline"])
app.include_router(trends_router, prefix="/api", tags=["Biomarker Trends"])
app.include_router(medications_router, prefix="/api", tags=["Medications"])
app.include_router(doctor_brief_router, prefix="/api", tags=["AI Doctor Brief"])
app.include_router(translation_router, prefix="/api", tags=["Translate & Explain & TTS"])
app.include_router(emergency_router, prefix="/api", tags=["Emergency Mode"])
app.include_router(prescriptions_router, prefix="/api", tags=["Prescriptions"])


@app.get("/api/health")
def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "CAREBRIDGE API",
        "version": "2.0.0",
        "database": "SQLite Connected"
    }


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"success": False, "error": str(exc), "message": "An internal server error occurred."}
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
