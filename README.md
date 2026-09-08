# CAREBRIDGE 🩺
> **AI-Powered Longitudinal Health Story & Clinical Continuity Platform** — Turning fragmented medical records into unified, actionable clinical intelligence and emergency-ready profiles.

---

## 🏆 Project Overview
- **Track**: Health Tech
- **Goal**: Solve longitudinal medical record fragmentation across clinical notes, lab reports, and prescriptions using Gemini 3.6 Flash and local SQLite persistence with real-time multilingual translation and continuous speech synthesis.

---

## 📦 Tech Stack

### Frontend (React Web Application)
- **Framework**: React 19 + Vite
- **Styling**: Tailwind CSS
- **Motion & Animations**: Framer Motion
- **Icons**: Lucide React
- **Data Visualizations**: Recharts
- **API Client**: Axios

### Backend (Python Service)
- **REST API**: FastAPI + Uvicorn
- **AI / LLM Engine**: Google Gemini API via `google-genai` SDK (`gemini-3.6-flash`)
- **Document Processing**: PyMuPDF (`fitz`) with Gemini Vision OCR for multi-format documents (PDF, PNG, JPG, JPEG, WEBP, HEIC, HEIF)
- **Speech Synthesis**: gTTS with sentence-boundary chunking
- **Database**: SQLite (local, parameterized, relational schema)
- **Data Validation**: Pydantic v2

---

## 🏗️ Project Structure

```
CAREBRIDGE/
│
├── frontend/                  # React Web Application (Vite + Tailwind + Framer Motion)
│   ├── src/
│   │   ├── components/
│   │   │   └── layout/        # Sidebar, Header, Footer
│   │   ├── pages/             # Dashboard, Documents, Timeline, Trends, Medications, DoctorBrief, TranslateExplain, Emergency
│   │   ├── context/           # PatientContext (Atomic Patient State & Isolation), ThemeContext (Light/Dark)
│   │   ├── services/          # Centralized Axios API client
│   │   ├── App.jsx            # Main app shell & sidebar layout
│   │   └── index.css          # Tailwind CSS directives & tokens
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── backend/                   # FastAPI Backend Service
│   ├── main.py                # FastAPI entry point & CORS configuration
│   └── api/                   # REST API Routers
│       ├── patients.py        # Patient profiles & demo data
│       ├── documents.py       # Multi-format ingestion (PDF, PNG, JPG, JPEG, WEBP) & Vision OCR
│       ├── timeline.py        # Longitudinal milestones
│       ├── trends.py          # Biomarker trajectory & shifts
│       ├── medications.py     # Active & historical regimens
│       ├── doctor_brief.py    # AI Doctor Brief generator (Gemini 3.6 Flash)
│       ├── translation.py     # 11-Language Translation & Full-Text TTS
│       ├── emergency.py       # ICE Triage & Geolocation
│       └── prescriptions.py   # Prescription management & orphan cleanup
│
├── ai/                        # AI & Processing Engine
│   ├── ai_engine.py           # Gemini 3.6 Flash LLM Client
│   ├── document_processor.py  # PyMuPDF & Vision OCR Pipeline (Multi-Format)
│   ├── workflow.py            # End-to-end ingestion workflow
│   └── prompts.py             # Structured clinical prompt schemas
│
├── database/                  # SQLite Storage Engine
│   ├── database.py            # CRUD operations, migrations, & orphan patient cleanup
│   └── models.py              # Pydantic data schemas
│
├── data/
│   ├── demo_data.py           # Synthetic longitudinal patient generator
│   └── uploads/               # Stored medical documents
│
├── requirements.txt           # Python backend dependencies
└── README.md                  # Project documentation
```

---

## 🚀 Getting Started

### 1. Configure Environment
Create a `.env` file in the root directory:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### 2. Start the Backend (FastAPI)
```bash
# Activate virtual environment
.venv\Scripts\activate

# Install backend dependencies
pip install -r requirements.txt

# Start FastAPI server
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```
FastAPI runs on: **`http://localhost:8000`**  
Interactive API Docs: **`http://localhost:8000/docs`**

### 3. Start the Frontend (React + Vite)
```bash
# Open a new terminal
cd frontend

# Install packages
npm install

# Start Vite dev server
npm run dev
```
React application runs on: **`http://localhost:5173`**

---

## 🛡️ Clinical Safety & Patient Privacy
- **No Autonomous Diagnostics**: CAREBRIDGE structures existing clinical records without generating autonomous medical diagnoses.
- **Strict Data Isolation**: Patient data is isolated by `patient_id`. Switching patients in the sidebar atomically updates all views with zero cross-patient data leakage.
- **Atomic Patient Switching**: The UI keeps current patient data visible while preloading new patient datasets in parallel, preventing empty screen flashes.
- **Automatic Orphan Cleanup**: Deleting the last meaningful clinical record belonging to a patient cleanly removes the orphaned profile from the active patient directory.
- **Multi-Format Ingestion**: Ingest PDF, PNG, JPG, JPEG, WEBP (and HEIC/HEIF) seamlessly via PyMuPDF text parsing or Gemini Vision OCR.
- **100% Server-Side Secrets**: `GEMINI_API_KEY` is maintained strictly on the FastAPI server and is never exposed to the browser.
