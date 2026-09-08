import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UploadCloud, 
  FileText, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  Eye, 
  Sparkles, 
  Layers, 
  FileSearch, 
  Calendar, 
  Check, 
  X,
  RefreshCw,
  Image as ImageIcon,
  FileCheck,
  ArrowRight,
  ShieldCheck,
  Pill,
  Clock,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { usePatient } from '../context/PatientContext';
import api from '../services/api';

const ACCEPTED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.heic', '.heif'];
const ACCEPT_STRING = '.pdf,.png,.jpg,.jpeg,.webp,.heic,.heif,image/png,image/jpeg,image/webp,application/pdf';

export const Documents = ({ setActiveTab }) => {
  const { activePatientId, activePatient, triggerRefresh, activateUploadedPatient } = usePatient();
  const [documents, setDocuments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState(0);
  const [uploadSuccessInfo, setUploadSuccessInfo] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [deleteModalDoc, setDeleteModalDoc] = useState(null);
  const [inspectDoc, setInspectDoc] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState(null);

  const fetchDocs = async () => {
    try {
      setLoading(true);
      setError(null);
      const [docsRes, rxRes, medsRes] = await Promise.all([
        api.getDocuments(activePatientId),
        api.getPrescriptions(activePatientId),
        api.getMedications(activePatientId)
      ]);
      if (docsRes.success) setDocuments(docsRes.documents || []);
      if (rxRes.success) setPrescriptions(rxRes.prescriptions || []);
      if (medsRes.success) setMedications(medsRes.active_medications || []);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
    setUploadSuccessInfo(null);
    setSelectedFiles([]);
  }, [activePatientId]);

  const validateFiles = (fileList) => {
    const valid = [];
    const invalid = [];
    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];
      const ext = '.' + f.name.split('.').pop().toLowerCase();
      if (ACCEPTED_EXTENSIONS.includes(ext) || f.type.startsWith('image/') || f.type === 'application/pdf') {
        valid.push(f);
      } else {
        invalid.push(f.name);
      }
    }
    if (invalid.length > 0) {
      setError(`Unsupported format for: ${invalid.join(', ')}. Supported: PDF, PNG, JPG, JPEG, WEBP.`);
    } else {
      setError(null);
    }
    return valid;
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const valid = validateFiles(e.target.files);
      setSelectedFiles(valid);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const valid = validateFiles(e.dataTransfer.files);
      setSelectedFiles(valid);
    }
  };

  const handleUploadSubmit = async () => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    try {
      setUploading(true);
      setError(null);
      setUploadStep(1);

      const stepTimer1 = setTimeout(() => setUploadStep(2), 600);
      const stepTimer2 = setTimeout(() => setUploadStep(3), 1400);
      const stepTimer3 = setTimeout(() => setUploadStep(4), 2600);

      const res = await api.uploadDocument(activePatientId, selectedFiles[0]);

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
      setUploadStep(5);

      if (res.success) {
        const targetPid = res.target_patient_id || res.patient_id;
        const patientObj = res.patient || res.resolved_patient;

        setUploadSuccessInfo({
          fileName: res.file_name,
          patientName: patientObj?.name || 'Patient',
          targetPid: targetPid,
          extractionMethod: res.extraction_method || 'vision'
        });

        // 1. Activate newly resolved patient immediately in context
        await activateUploadedPatient(targetPid, patientObj);
        triggerRefresh();

        // 2. Automatically navigate to Dashboard after brief success confirmation
        setTimeout(() => {
          if (setActiveTab) {
            setActiveTab('dashboard');
          }
        }, 1400);
      }
    } catch (err) {
      console.error('Upload failed:', err);
      setError(err.message || 'Ingestion pipeline error.');
      setUploading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModalDoc) return;
    try {
      setLoading(true);
      await api.deletePrescription(activePatientId, deleteModalDoc.id || deleteModalDoc.document_id);
      setDeleteModalDoc(null);
      await fetchDocs();
      triggerRefresh();
    } catch (err) {
      console.error('Delete error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const currentPrescription = prescriptions.find((p) => p.is_current) || prescriptions[0];
  const previousPrescriptions = prescriptions.filter((p) => p !== currentPrescription);
  const patientName = activePatient?.name || 'Patient';

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/80 text-teal-800 dark:text-[#2DD4BF] text-[11px] font-extrabold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Multi-Format Clinical Ingestion</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-[#F8FAFC] tracking-tight">
            Medical Documents & Prescriptions
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Seamlessly upload prescriptions or clinical reports for <strong className="text-slate-800 dark:text-slate-200">{patientName}</strong> (ID: {activePatientId || 'N/A'}).
          </p>
        </div>

        <button
          onClick={fetchDocs}
          className="self-start sm:self-auto flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-white dark:bg-[#182235] border border-slate-200 dark:border-[#263247] text-xs font-bold text-slate-700 dark:text-[#F8FAFC] hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Records</span>
        </button>
      </div>

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs font-bold text-red-700 dark:text-red-300 flex items-center justify-between shadow-sm"
        >
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
        </motion.div>
      )}

      {/* 1. UPLOAD WORKSPACE */}
      <div className="bg-white dark:bg-[#111827] p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-[#263247] shadow-xl shadow-slate-200/50 dark:shadow-none transition-all">
        <div className="max-w-2xl mx-auto">
          
          <label 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-3xl p-8 sm:p-10 flex flex-col items-center justify-center cursor-pointer transition-all ${
              isDragOver 
                ? 'border-brand-teal bg-teal-50/50 dark:bg-teal-950/30 scale-[1.01]' 
                : 'border-slate-300 dark:border-[#263247] hover:border-brand-teal dark:hover:border-[#2DD4BF] bg-slate-50/60 dark:bg-[#182235]/40 hover:bg-teal-50/20 dark:hover:bg-teal-950/20'
            } group`}
          >
            <input 
              type="file" 
              accept={ACCEPT_STRING}
              multiple
              className="hidden" 
              onChange={handleFileChange} 
              disabled={uploading}
            />
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-brand-teal to-brand-indigo text-white flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-md shadow-brand-teal/20">
              <UploadCloud className="w-8 h-8" />
            </div>
            <div className="font-black text-base text-slate-800 dark:text-[#F8FAFC] text-center">
              {selectedFiles.length > 0 
                ? `${selectedFiles.length} Document Selected: ${selectedFiles.map(f => f.name).join(', ')}`
                : 'Upload Medical Documents'}
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 text-center">
              Drag & Drop or <span className="text-brand-teal dark:text-[#2DD4BF] font-bold underline">Choose Files</span>
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300">PDF</span>
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300">PNG</span>
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300">JPG</span>
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300">JPEG</span>
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300">WEBP</span>
            </div>
          </label>

          {selectedFiles.length > 0 && !uploading && !uploadSuccessInfo && (
            <div className="mt-5 space-y-4">
              {/* Image Preview if image file selected */}
              {selectedFiles[0] && (selectedFiles[0].type.startsWith('image/') || /\.(png|jpe?g|webp|heic|heif)$/i.test(selectedFiles[0].name)) && (
                <div className="p-3 bg-slate-50 dark:bg-[#182235] border border-slate-200 dark:border-[#263247] rounded-2xl flex items-center gap-4">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-800 flex-shrink-0 border border-slate-300 dark:border-slate-700">
                    <img 
                      src={URL.createObjectURL(selectedFiles[0])} 
                      alt="Selected Prescription Preview" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                        {selectedFiles[0].name}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-[10px] font-bold text-brand-indigo dark:text-indigo-400 uppercase">
                        {selectedFiles[0].name.split('.').pop()} Image
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {(selectedFiles[0].size / 1024).toFixed(1)} KB • Verified for Gemini Vision OCR
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setSelectedFiles([])}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#182235]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUploadSubmit}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-brand-teal via-brand-indigo to-purple-600 text-white text-xs font-black shadow-lg shadow-brand-teal/25 hover:opacity-95 active:scale-95 transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Process & Ingest Prescription</span>
                </button>
              </div>
            </div>
          )}

          {/* Stepper Animation */}
          {uploading && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-6 rounded-3xl bg-teal-50/80 dark:bg-[#182235] border border-teal-100 dark:border-[#263247] space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="text-xs font-black text-teal-950 dark:text-teal-200 flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-brand-teal dark:border-[#2DD4BF] border-t-transparent rounded-full animate-spin" />
                  <span>Ingestion Pipeline Processing...</span>
                </div>
                <span className="text-xs font-bold text-brand-teal dark:text-[#2DD4BF]">Step {uploadStep} of 5</span>
              </div>

              <div className="w-full bg-teal-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                <motion.div 
                  className="bg-gradient-to-r from-brand-teal via-brand-indigo to-purple-600 h-full"
                  initial={{ width: '0%' }}
                  animate={{ width: `${(uploadStep / 5) * 100}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>

              <div className="space-y-1.5 text-xs text-teal-900 dark:text-teal-300 font-medium">
                {uploadStep >= 1 && <p>✓ Step 1: Validating file structure and image clarity...</p>}
                {uploadStep >= 2 && <p>✓ Step 2: PyMuPDF / Gemini Vision OCR extracting text & layout...</p>}
                {uploadStep >= 3 && <p>✓ Step 3: Understanding medications & clinical dosages with Gemini 3.6 Flash...</p>}
                {uploadStep >= 4 && <p>✓ Step 4: Resolving patient identity & persisting longitudinal records...</p>}
                {uploadStep >= 5 && <p className="font-bold text-emerald-700 dark:text-emerald-400">✓ Step 5: Prescription synchronized! Navigating to Dashboard...</p>}
              </div>
            </motion.div>
          )}

          {/* Upload Success Navigation Toast */}
          {uploadSuccessInfo && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-6 p-6 rounded-3xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 shadow-xl space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-bold">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-emerald-950 dark:text-emerald-100">
                    Prescription Processed for {uploadSuccessInfo.patientName}
                  </h4>
                  <p className="text-xs text-emerald-800 dark:text-emerald-300">
                    Target Patient ID: <strong>{uploadSuccessInfo.targetPid}</strong> • Method: <strong>{uploadSuccessInfo.extractionMethod}</strong>
                  </p>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-200 font-bold border-t border-emerald-200 dark:border-emerald-900/60">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  Opening Dashboard with new health story...
                </span>
                <button
                  onClick={() => setActiveTab && setActiveTab('dashboard')}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-colors flex items-center gap-1"
                >
                  <span>Go Now</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )}

        </div>
      </div>

      {/* 2. CURRENT PRESCRIPTION CARD */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-900 dark:text-[#F8FAFC] flex items-center gap-2">
            <Pill className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>CURRENT ACTIVE PRESCRIPTION</span>
          </h2>
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
            Active Regimen for {patientName}
          </span>
        </div>

        {currentPrescription ? (
          <div className="bg-gradient-to-br from-emerald-50/60 via-white to-teal-50/40 dark:from-[#182235] dark:via-[#111827] dark:to-[#182235] p-6 sm:p-7 rounded-3xl border border-emerald-200/80 dark:border-emerald-900/60 shadow-lg shadow-emerald-950/5 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-100 dark:border-emerald-950/60 pb-4 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-600 text-white shadow-sm">
                    CURRENT ACTIVE
                  </span>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    {currentPrescription.file_name || 'Active Clinical Prescription'}
                  </h3>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-3">
                  <span>Prescription Date: <strong className="text-slate-700 dark:text-slate-200">{currentPrescription.document_date || 'Recent'}</strong></span>
                  <span>•</span>
                  <span>Doctor: <strong className="text-slate-700 dark:text-slate-200">{currentPrescription.doctor_name || 'Attending Physician'}</strong></span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setInspectDoc(currentPrescription)}
                  className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-[#111827] border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-50 dark:hover:bg-emerald-950/50 shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Details</span>
                </button>
              </div>
            </div>

            {/* Prescribed Medicines */}
            <div className="space-y-2">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Prescribed Medications in this Regimen:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {currentPrescription.medications && currentPrescription.medications.length > 0 ? (
                  currentPrescription.medications.map((m, idx) => (
                    <div key={idx} className="p-3 bg-white dark:bg-[#111827] rounded-2xl border border-emerald-100 dark:border-[#263247] shadow-sm">
                      <div className="font-extrabold text-xs text-slate-900 dark:text-white">{m.name}</div>
                      <div className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">{m.dosage || 'Dosage as directed'} • {m.frequency || 'Daily'}</div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400">Medications active from latest clinical encounter.</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 rounded-3xl bg-slate-50 dark:bg-[#182235] border border-slate-200 dark:border-[#263247] text-center text-xs text-slate-400">
            No active prescription found for this patient. Upload a new prescription document above.
          </div>
        )}
      </div>

      {/* 3. PREVIOUS PRESCRIPTIONS SECTION WITH DELETE OPTION */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-900 dark:text-[#F8FAFC] flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>PREVIOUS & HISTORICAL PRESCRIPTIONS</span>
          </h2>
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
            {previousPrescriptions.length} Past Records
          </span>
        </div>

        {previousPrescriptions.length > 0 ? (
          <div className="space-y-3">
            {previousPrescriptions.map((rx) => (
              <div 
                key={rx.id || rx.document_id} 
                className="bg-white dark:bg-[#111827] p-5 rounded-3xl border border-slate-200/80 dark:border-[#263247] shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-slate-300 dark:hover:border-slate-700"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      SUPERSEDED
                    </span>
                    <h3 className="font-extrabold text-xs text-slate-900 dark:text-white">
                      {rx.file_name || 'Historical Prescription'}
                    </h3>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-3">
                    <span>Date: <strong className="text-slate-700 dark:text-slate-300">{rx.document_date || 'Historical'}</strong></span>
                    <span>•</span>
                    <span>Medicines: <strong className="text-slate-700 dark:text-slate-300">{rx.medications?.map(m => m.name).join(', ') || 'Archived'}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => setInspectDoc(rx)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#182235] hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors"
                  >
                    View
                  </button>

                  <button
                    onClick={() => setDeleteModalDoc(rx)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/60 text-xs font-bold transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-slate-50 dark:bg-[#182235] border border-slate-100 dark:border-[#263247] text-center text-xs text-slate-400">
            No previous superseded prescriptions on file for {patientName}.
          </div>
        )}
      </div>

      {/* 4. ALL STORED CLINICAL DOCUMENTS */}
      <div className="bg-white dark:bg-[#111827] p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-[#263247] shadow-card transition-colors">
        <h3 className="text-base font-black text-slate-900 dark:text-[#F8FAFC] mb-4">
          All Medical Documents ({documents.length})
        </h3>
        
        {documents.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-[#263247]">
            {documents.map((doc) => {
              const isImage = (doc.file_name || '').match(/\.(png|jpg|jpeg|webp|heic|heif)$/i);
              return (
                <div key={doc.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-brand-teal dark:text-[#2DD4BF] flex items-center justify-center flex-shrink-0">
                      {isImage ? <ImageIcon className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="font-extrabold text-xs text-slate-900 dark:text-[#F8FAFC] flex items-center gap-2">
                        <span>{doc.file_name}</span>
                        <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-slate-100 dark:bg-[#182235] text-slate-600 dark:text-slate-400">
                          {doc.extraction_method || 'text'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-3">
                        <span>Date: <strong>{doc.document_date || 'N/A'}</strong></span>
                        <span>•</span>
                        <span>Type: <strong>{doc.file_type || 'Clinical Record'}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setDeleteModalDoc(doc)}
                      className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors"
                      title="Delete Record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-xs text-slate-400">
            No stored records for this patient.
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteModalDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#111827] rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200 dark:border-[#263247] space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-[#F8FAFC]">
                Delete Prescription?
              </h3>
              <div className="p-3 bg-slate-50 dark:bg-[#182235] rounded-2xl text-xs space-y-1">
                <div>Prescription: <strong>{deleteModalDoc.file_name}</strong></div>
                <div>Date: <strong>{deleteModalDoc.document_date || 'Recent'}</strong></div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                This will remove this prescription and its associated medications for <strong>{patientName}</strong>. If no other records remain for this patient, the orphaned profile will be cleanly removed.
              </p>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  onClick={() => setDeleteModalDoc(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#182235]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black shadow-md shadow-red-500/20"
                >
                  Delete Prescription
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Inspect Document Modal */}
      <AnimatePresence>
        {inspectDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#111827] rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border border-slate-200 dark:border-[#263247] space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#263247] pb-3">
                <h3 className="text-sm font-black text-slate-900 dark:text-[#F8FAFC]">
                  {inspectDoc.file_name}
                </h3>
                <button onClick={() => setInspectDoc(null)}>
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                <div>Date: <strong>{inspectDoc.document_date || 'N/A'}</strong></div>
                <div>Doctor: <strong>{inspectDoc.doctor_name || 'N/A'}</strong></div>
                <div>Method: <strong>{inspectDoc.extraction_method || 'Text'}</strong></div>
              </div>

              {inspectDoc.extracted_text && (
                <div className="p-3 bg-slate-50 dark:bg-[#182235] rounded-2xl text-[11px] font-mono max-h-48 overflow-y-auto">
                  {inspectDoc.extracted_text}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={() => setInspectDoc(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#182235] text-xs font-bold"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Documents;
