import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export const NORMAL_REQUEST_TIMEOUT = 30000;        // 30 seconds
export const AI_REQUEST_TIMEOUT = 120000;            // 120 seconds (Gemini LLM synthesis)
export const DOCTOR_BRIEF_TIMEOUT = 120000;          // 120 seconds
export const DOCUMENT_PROCESSING_TIMEOUT = 120000;   // 120 seconds (PyMuPDF + Vision OCR)
export const TRANSLATION_TIMEOUT = 120000;          // 120 seconds (11-language Gemini translation)
export const TTS_TIMEOUT = 120000;                  // 120 seconds (multi-chunk audio synthesis)

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: NORMAL_REQUEST_TIMEOUT,
});

// Response interceptor for unified error formatting
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    let errorMsg = 'Network error occurred';
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      errorMsg = 'AI generation request timed out. Please try again.';
    } else if (error.response?.data?.message) {
      errorMsg = error.response.data.message;
    } else if (error.response?.data?.detail) {
      errorMsg = typeof error.response.data.detail === 'string' 
        ? error.response.data.detail 
        : JSON.stringify(error.response.data.detail);
    } else if (error.response?.data?.error) {
      errorMsg = error.response.data.error;
    } else if (error.message) {
      errorMsg = error.message;
    }
    const errObj = new Error(errorMsg);
    errObj.response = error.response;
    errObj.data = error.response?.data;
    return Promise.reject(errObj);
  }
);

export const api = {
  // Health
  getHealth: () => apiClient.get('/health', { timeout: NORMAL_REQUEST_TIMEOUT }),

  // Patients & Demo
  getPatients: () => apiClient.get('/patients', { timeout: NORMAL_REQUEST_TIMEOUT }),
  getPatient: (patientId) => apiClient.get(`/patients/${encodeURIComponent(patientId)}`, { timeout: NORMAL_REQUEST_TIMEOUT }),
  deletePatient: (patientId) => apiClient.delete(`/patients/${encodeURIComponent(patientId)}`, { timeout: NORMAL_REQUEST_TIMEOUT }),
  getDashboardStats: (patientId) => apiClient.get(`/patients/${encodeURIComponent(patientId)}/dashboard-stats`, { timeout: NORMAL_REQUEST_TIMEOUT }),
  loadDemoPatient: () => apiClient.post('/demo/load', {}, { timeout: DOCUMENT_PROCESSING_TIMEOUT }),
  createPatientWithDocument: (formData) =>
    apiClient.post('/patients/create-with-document', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: DOCUMENT_PROCESSING_TIMEOUT,
    }),

  // Documents
  getDocuments: (patientId) => apiClient.get(`/patients/${encodeURIComponent(patientId)}/documents`, { timeout: NORMAL_REQUEST_TIMEOUT }),
  uploadDocument: (patientId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('patient_id', patientId);
    return apiClient.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: DOCUMENT_PROCESSING_TIMEOUT,
    });
  },

  // Timeline
  getTimeline: (patientId) => apiClient.get(`/patients/${encodeURIComponent(patientId)}/timeline`, { timeout: NORMAL_REQUEST_TIMEOUT }),

  // Trends
  getTrends: (patientId) => apiClient.get(`/patients/${encodeURIComponent(patientId)}/trends`, { timeout: NORMAL_REQUEST_TIMEOUT }),

  // Medications
  getMedications: (patientId) => apiClient.get(`/patients/${encodeURIComponent(patientId)}/medications`, { timeout: NORMAL_REQUEST_TIMEOUT }),

  // AI Doctor Brief
  getDoctorBrief: (patientId) => apiClient.get(`/patients/${encodeURIComponent(patientId)}/doctor-brief`, { timeout: NORMAL_REQUEST_TIMEOUT }),
  generateDoctorBrief: (patientId, force = false) => 
    apiClient.post(`/patients/${encodeURIComponent(patientId)}/doctor-brief/generate?force=${force}`, {}, { timeout: DOCTOR_BRIEF_TIMEOUT }),

  // Multilingual Translation, Medical Terms & TTS
  getLanguages: () => apiClient.get('/languages', { timeout: NORMAL_REQUEST_TIMEOUT }),
  translateContent: (patientId, { contentType, targetLanguageKey, customText }) =>
    apiClient.post(
      `/patients/${encodeURIComponent(patientId)}/translate`,
      {
        content_type: contentType,
        target_language_key: targetLanguageKey,
        custom_text: customText,
      },
      { timeout: TRANSLATION_TIMEOUT }
    ),
  explainTerms: (patientId, { contentType, contentId, language, targetLanguageKey, customText }) =>
    apiClient.post(
      `/patients/${encodeURIComponent(patientId)}/explain-terms`,
      {
        content_type: contentType,
        content_id: contentId,
        language: language,
        target_language_key: targetLanguageKey,
        custom_text: customText,
      },
      { timeout: TRANSLATION_TIMEOUT }
    ),
  synthesizeTTS: (patientId, { text, targetLanguageKey }) =>
    apiClient.post(
      `/patients/${encodeURIComponent(patientId)}/tts`,
      {
        text,
        target_language_key: targetLanguageKey,
      },
      { timeout: TTS_TIMEOUT }
    ),

  // Emergency Mode
  getEmergencyData: (patientId) => apiClient.get(`/patients/${encodeURIComponent(patientId)}/emergency`, { timeout: NORMAL_REQUEST_TIMEOUT }),
  updateEmergencyContact: (patientId, contactData) =>
    apiClient.put(`/patients/${encodeURIComponent(patientId)}/emergency-contact`, contactData, { timeout: NORMAL_REQUEST_TIMEOUT }),
  logEmergencyLocation: (patientId, locationPayload) =>
    apiClient.post(`/patients/${encodeURIComponent(patientId)}/emergency/location`, locationPayload, { timeout: NORMAL_REQUEST_TIMEOUT }),
  getEmergencyEvents: (patientId) => apiClient.get(`/patients/${encodeURIComponent(patientId)}/emergency/events`, { timeout: NORMAL_REQUEST_TIMEOUT }),

  // Prescriptions & Deletion
  getPrescriptions: (patientId) => apiClient.get(`/patients/${encodeURIComponent(patientId)}/prescriptions`, { timeout: NORMAL_REQUEST_TIMEOUT }),
  deletePrescription: (patientId, documentId) =>
    apiClient.delete(`/patients/${encodeURIComponent(patientId)}/prescriptions/${encodeURIComponent(documentId)}`, { timeout: NORMAL_REQUEST_TIMEOUT }),
  setPrescriptionCurrent: (patientId, documentId) =>
    apiClient.post(`/patients/${encodeURIComponent(patientId)}/prescriptions/${encodeURIComponent(documentId)}/set-current`, {}, { timeout: NORMAL_REQUEST_TIMEOUT }),
};

export default api;
