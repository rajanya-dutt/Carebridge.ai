import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserPlus, 
  FileText, 
  UploadCloud, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  Loader2, 
  HeartPulse, 
  Phone, 
  ShieldAlert, 
  FileCheck,
  RefreshCw,
  ArrowRight
} from 'lucide-react';
import api from '../services/api';
import { usePatient } from '../context/PatientContext';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];
const GENDERS = ['Female', 'Male', 'Other', 'Prefer not to say'];

export const AddPatientModal = ({ isOpen, onClose, onPatientCreated }) => {
  const { activateUploadedPatient, switchPatient } = usePatient();
  const fileInputRef = useRef(null);

  // Flow steps: 1: Details, 2: Document, 3: Processing, 4: Success
  const [step, setStep] = useState(1);

  // Form Fields
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: '',
    blood_group: '',
    allergies: '',
    chronic_conditions: '',
    emergency_contact_name: '',
    emergency_contact_relationship: '',
    emergency_contact_phone: ''
  });

  // Document state
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  // Processing & Verification state
  const [isProcessing, setIsProcessing] = useState(false);
  const [pipelineStep, setPipelineStep] = useState(1);
  const [errorBanner, setErrorBanner] = useState(null);

  // Mismatch & Duplicate Modals
  const [mismatchData, setMismatchData] = useState(null);
  const [mismatchRejected, setMismatchRejected] = useState(false);
  const [nameUpdatedNotice, setNameUpdatedNotice] = useState(null);
  const [duplicateData, setDuplicateData] = useState(null);

  // Created patient info for Step 4
  const [createdPatient, setCreatedPatient] = useState(null);

  const resetForm = () => {
    setStep(1);
    setFormData({
      name: '',
      age: '',
      gender: '',
      blood_group: '',
      allergies: '',
      chronic_conditions: '',
      emergency_contact_name: '',
      emergency_contact_relationship: '',
      emergency_contact_phone: ''
    });
    setSelectedFile(null);
    setIsProcessing(false);
    setPipelineStep(1);
    setErrorBanner(null);
    setMismatchData(null);
    setMismatchRejected(false);
    setNameUpdatedNotice(null);
    setDuplicateData(null);
    setCreatedPatient(null);
  };

  const handleClose = () => {
    if (isProcessing) return; // Prevent closing mid-upload
    resetForm();
    onClose();
  };

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errorBanner) setErrorBanner(null);
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const validateAndSetFile = (file) => {
    const validExtensions = ['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.heic', '.heif'];
    const fileExt = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!validExtensions.includes(fileExt) && !file.type.startsWith('image/')) {
      setErrorBanner("Unsupported file type. Please upload a PDF, PNG, JPG, JPEG, or WEBP document.");
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setErrorBanner("File size exceeds 25MB limit. Please upload a smaller medical document.");
      return;
    }

    setErrorBanner(null);
    setSelectedFile(file);
  };

  // Submit Patient Creation with First Document
  const handleCreatePatient = async ({ forceCreate = false, ignoreMismatch = false, customName = null } = {}) => {
    const effectiveName = (customName || formData.name).trim();
    if (!effectiveName) {
      setErrorBanner("Please enter the patient's Full Name.");
      setStep(1);
      return;
    }

    if (!selectedFile) {
      setErrorBanner("Your first medical document is required to create the patient profile.");
      setStep(2);
      return;
    }

    try {
      setIsProcessing(true);
      setStep(3);
      setErrorBanner(null);
      setMismatchData(null);
      setMismatchRejected(false);
      setDuplicateData(null);

      // Simulation steps for user reassurance
      setPipelineStep(1);
      const timer1 = setTimeout(() => setPipelineStep(2), 800);
      const timer2 = setTimeout(() => setPipelineStep(3), 2200);
      const timer3 = setTimeout(() => setPipelineStep(4), 4500);

      const payload = new FormData();
      payload.append('file', selectedFile);
      payload.append('name', effectiveName);
      if (formData.age) payload.append('age', formData.age);
      if (formData.gender) payload.append('gender', formData.gender);
      if (formData.blood_group) payload.append('blood_group', formData.blood_group);
      if (formData.allergies) payload.append('allergies', formData.allergies);
      if (formData.chronic_conditions) payload.append('chronic_conditions', formData.chronic_conditions);
      if (formData.emergency_contact_name) payload.append('emergency_contact_name', formData.emergency_contact_name);
      if (formData.emergency_contact_relationship) payload.append('emergency_contact_relationship', formData.emergency_contact_relationship);
      if (formData.emergency_contact_phone) payload.append('emergency_contact_phone', formData.emergency_contact_phone);
      if (forceCreate) payload.append('force_create', 'true');
      if (ignoreMismatch) payload.append('ignore_name_mismatch', 'true');

      const res = await api.createPatientWithDocument(payload);

      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      setPipelineStep(5);

      if (res.success && res.patient) {
        setCreatedPatient(res.patient);
        setStep(4);

        // Synchronize state with PatientContext
        await activateUploadedPatient(res.patient_id, res.patient);

        // Trigger callback to navigate to dashboard
        if (onPatientCreated) {
          setTimeout(() => {
            onPatientCreated(res.patient_id, res.patient);
            handleClose();
          }, 2400);
        }
      }
    } catch (err) {
      console.error("Patient creation error:", err);
      setIsProcessing(false);

      const data = err.data || (err.response && err.response.data);
      if (data && data.error_type === 'NAME_MISMATCH') {
        setMismatchData(data);
        setStep(2);
      } else if (data && data.error_type === 'DUPLICATE_NAME_FOUND') {
        setDuplicateData(data);
        setStep(1);
      } else {
        setErrorBanner(err.message || "Unable to initialize patient profile. The document could not be processed.");
        setStep(2);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmMismatchYes = () => {
    if (!mismatchData?.document_patient_name) return;
    const realName = mismatchData.document_patient_name;
    setFormData(prev => ({ ...prev, name: realName }));
    setNameUpdatedNotice(realName);
    const cachedMismatch = mismatchData;
    setMismatchData(null);
    
    // Automatically continue processing with corrected name
    handleCreatePatient({ customName: realName, ignoreMismatch: true });
  };

  const handleConfirmMismatchNo = () => {
    setMismatchData(null);
    setMismatchRejected(true);
    setSelectedFile(null); // Reset invalid file so it remains unprocessed
  };

  const getGreeting = (name) => {
    const hour = new Date().getHours();
    let timeGreeting = "Good morning";
    if (hour >= 12 && hour < 17) timeGreeting = "Good afternoon";
    else if (hour >= 17 && hour < 21) timeGreeting = "Good evening";
    else if (hour >= 21 || hour < 5) timeGreeting = "Welcome";
    return `${timeGreeting}, ${name || 'Patient'} 👋`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-950/70 backdrop-blur-md transition-all">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#263247] rounded-3xl shadow-2xl overflow-hidden my-auto transition-colors"
      >
        {/* MODAL HEADER */}
        <div className="p-5 sm:p-6 bg-slate-50/80 dark:bg-[#182235]/60 border-b border-slate-100 dark:border-[#263247] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-brand-teal via-brand-indigo to-purple-600 text-white flex items-center justify-center shadow-lg shadow-brand-indigo/25 flex-shrink-0">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                  Add a New Patient
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-brand-indigo dark:text-indigo-400 text-[10px] font-extrabold border border-indigo-100 dark:border-indigo-800">
                  New Profile
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Start a new continuous health story with their mandatory first medical document.
              </p>
            </div>
          </div>

          {!isProcessing && (
            <button
              onClick={handleClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* STEP PROGRESS INDICATOR */}
        <div className="px-6 py-3 bg-white dark:bg-[#111827] border-b border-slate-100 dark:border-[#263247] flex items-center justify-between gap-2 overflow-x-auto text-xs">
          {[
            { num: 1, label: '1. Patient Details' },
            { num: 2, label: '2. First Document' },
            { num: 3, label: '3. AI Processing' },
            { num: 4, label: '4. Ready' },
          ].map((s) => {
            const isCompleted = step > s.num;
            const isCurrent = step === s.num;
            return (
              <div
                key={s.num}
                className={`flex items-center gap-2 font-bold px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
                  isCurrent
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-brand-indigo dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800'
                    : isCompleted
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-400 dark:text-slate-600'
                }`}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold ${
                  isCurrent
                    ? 'bg-brand-indigo text-white'
                    : isCompleted
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                }`}>
                  {isCompleted ? '✓' : s.num}
                </div>
                <span>{s.label}</span>
              </div>
            );
          })}
        </div>

        {/* ERROR / NOTIFICATION BANNER */}
        {errorBanner && (
          <div className="m-5 p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-2xl flex items-center gap-3 text-red-900 dark:text-red-200 text-xs">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <div className="flex-1 font-medium">{errorBanner}</div>
            <button onClick={() => setErrorBanner(null)} className="text-red-500 hover:text-red-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* NAME UPDATED SUCCESS NOTICE */}
        {nameUpdatedNotice && (
          <div className="m-5 p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/80 rounded-2xl flex items-center justify-between text-emerald-900 dark:text-emerald-100 text-xs">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <div>
                <div className="font-extrabold text-sm">✓ Patient name updated</div>
                <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                  New patient name: <strong className="font-bold">{nameUpdatedNotice}</strong>
                </div>
              </div>
            </div>
            <button onClick={() => setNameUpdatedNotice(null)} className="text-emerald-500 hover:text-emerald-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* MODAL 1: PATIENT NAME DIFFERENCE DETECTED */}
        {mismatchData && (
          <div className="m-5 p-5 bg-amber-50/95 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/80 rounded-2xl text-amber-950 dark:text-amber-100 text-xs space-y-4 shadow-lg">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-black text-sm uppercase tracking-wide">
              <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <span>⚠️ PATIENT NAME DIFFERENCE DETECTED</span>
            </div>
            
            <p className="font-semibold text-slate-800 dark:text-slate-200">
              The patient's name in the prescription is different!
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white/90 dark:bg-black/40 p-3.5 rounded-xl border border-amber-200 dark:border-amber-800/60 font-sans text-xs">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold tracking-wider mb-0.5">
                  Entered patient name:
                </span>
                <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                  {mismatchData.entered_name}
                </span>
              </div>
              <div>
                <span className="text-amber-800 dark:text-amber-400 block text-[10px] uppercase font-bold tracking-wider mb-0.5">
                  Name extracted from prescription:
                </span>
                <span className="font-extrabold text-amber-700 dark:text-amber-300 text-sm">
                  {mismatchData.document_patient_name}
                </span>
              </div>
            </div>

            <p className="font-medium text-slate-700 dark:text-slate-300 text-xs">
              Would you like to change the name to the real patient name extracted from the prescription?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={handleConfirmMismatchNo}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors text-xs"
              >
                No
              </button>
              <button
                onClick={handleConfirmMismatchYes}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-teal to-brand-indigo text-white font-extrabold shadow-md shadow-brand-indigo/25 hover:opacity-95 transition-opacity text-xs"
              >
                Yes, Change Name
              </button>
            </div>
          </div>
        )}

        {/* MODAL 2: WRONG PRESCRIPTION ENTERED AS PER PATIENT NAME */}
        {mismatchRejected && (
          <div className="m-5 p-5 bg-red-50/95 dark:bg-red-950/60 border border-red-300 dark:border-red-800 rounded-2xl text-red-950 dark:text-red-100 text-xs space-y-4 shadow-lg relative">
            <button
              onClick={() => {
                setMismatchRejected(false);
                setStep(2);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-red-700 dark:text-red-300 font-black text-sm">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <span>❌ Wrong Prescription Entered as per patient name!</span>
            </div>

            <p className="leading-relaxed text-slate-800 dark:text-slate-200 font-medium pr-6">
              The prescription name does not match the patient name you entered. Please upload the correct prescription for this patient.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setMismatchRejected(false);
                  setStep(2);
                }}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors text-xs flex items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" />
                <span>Close</span>
              </button>
              <button
                onClick={() => {
                  setMismatchRejected(false);
                  setStep(2);
                }}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold shadow-md shadow-red-600/25 transition-colors text-xs"
              >
                Upload Correct Prescription
              </button>
            </div>
          </div>
        )}

        {/* DUPLICATE PATIENT WARNING OVERLAY */}
        {duplicateData && (
          <div className="m-5 p-4 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl text-indigo-950 dark:text-indigo-100 text-xs space-y-3">
            <div className="flex items-center gap-2 text-brand-indigo dark:text-indigo-400 font-extrabold text-sm">
              <Sparkles className="w-5 h-5 flex-shrink-0" />
              <span>An Existing Patient with this Name Already Exists</span>
            </div>
            <p className="leading-relaxed">
              Found existing profile for <strong>{duplicateData.existing_patient?.name}</strong> (ID: <code className="bg-indigo-100 dark:bg-indigo-900 px-1 py-0.5 rounded">{duplicateData.existing_patient?.id}</code>).
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => {
                  switchPatient(duplicateData.existing_patient?.id);
                  handleClose();
                }}
                className="px-3 py-1.5 rounded-xl bg-brand-indigo hover:bg-indigo-700 text-white font-bold transition-colors"
              >
                Use Existing Patient
              </button>
              <button
                onClick={() => handleCreatePatient({ forceCreate: true })}
                className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold hover:bg-slate-300 transition-colors"
              >
                Create New Separate Profile
              </button>
            </div>
          </div>
        )}

        {/* STEP 1: PATIENT DETAILS */}
        {step === 1 && (
          <div className="p-6 space-y-5">
            <div className="space-y-4">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Primary Identity (Mandatory)
              </h3>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Priya Sharma"
                  value={formData.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#182235] border border-slate-200 dark:border-[#263247] rounded-xl text-sm text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-brand-indigo/50 transition-all"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Age / DOB
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 38"
                    value={formData.age}
                    onChange={(e) => handleFieldChange('age', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#182235] border border-slate-200 dark:border-[#263247] rounded-xl text-xs text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-brand-indigo/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Gender
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => handleFieldChange('gender', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#182235] border border-slate-200 dark:border-[#263247] rounded-xl text-xs text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-brand-indigo/50"
                  >
                    <option value="">Select Gender</option>
                    {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Blood Group
                  </label>
                  <select
                    value={formData.blood_group}
                    onChange={(e) => handleFieldChange('blood_group', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#182235] border border-slate-200 dark:border-[#263247] rounded-xl text-xs text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-brand-indigo/50"
                  >
                    <option value="">Select Blood Group</option>
                    {BLOOD_GROUPS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Known Drug / Food Allergies
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Penicillin, Sulfa drugs (optional)"
                    value={formData.allergies}
                    onChange={(e) => handleFieldChange('allergies', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#182235] border border-slate-200 dark:border-[#263247] rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-indigo/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Chronic Conditions
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Hypertension, Asthma (optional)"
                    value={formData.chronic_conditions}
                    onChange={(e) => handleFieldChange('chronic_conditions', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#182235] border border-slate-200 dark:border-[#263247] rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-indigo/50"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-[#263247] space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Emergency Contact (Optional)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Contact Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Vikram Sharma"
                      value={formData.emergency_contact_name}
                      onChange={(e) => handleFieldChange('emergency_contact_name', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#182235] border border-slate-200 dark:border-[#263247] rounded-xl text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Relationship</label>
                    <input
                      type="text"
                      placeholder="e.g. Brother, Spouse"
                      value={formData.emergency_contact_relationship}
                      onChange={(e) => handleFieldChange('emergency_contact_relationship', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#182235] border border-slate-200 dark:border-[#263247] rounded-xl text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Phone Number</label>
                    <input
                      type="text"
                      placeholder="e.g. +91-91234-56789"
                      value={formData.emergency_contact_phone}
                      onChange={(e) => handleFieldChange('emergency_contact_phone', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#182235] border border-slate-200 dark:border-[#263247] rounded-xl text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Step 1 Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-[#263247]">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!formData.name.trim()) {
                    setErrorBanner("Please enter the patient's Full Name.");
                    return;
                  }
                  setErrorBanner(null);
                  setStep(2);
                }}
                disabled={!formData.name.trim()}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-teal to-brand-indigo text-white text-xs font-extrabold shadow-md shadow-brand-indigo/20 hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                <span>Next: Upload First Document</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: FIRST MEDICAL DOCUMENT (MANDATORY) */}
        {step === 2 && (
          <div className="p-6 space-y-5">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-brand-indigo" />
                  <span>Upload First Prescription / Medical Document <span className="text-red-500">*</span></span>
                </label>
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                  Required
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Your first medical document is required to initialize the patient profile. Empty profiles are strictly disallowed.
              </p>
            </div>

            {/* Drag & Drop Zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all ${
                dragOver
                  ? 'border-brand-indigo bg-indigo-50/50 dark:bg-indigo-950/40 scale-[0.99]'
                  : selectedFile
                  ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20'
                  : 'border-slate-300 dark:border-slate-700 hover:border-brand-teal hover:bg-slate-50/50 dark:hover:bg-slate-800/40'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    validateAndSetFile(e.target.files[0]);
                  }
                }}
                className="hidden"
              />

              {selectedFile ? (
                <div className="flex flex-col items-center gap-2">
                  {(selectedFile.type.startsWith('image/') || /\.(png|jpe?g|webp|heic|heif)$/i.test(selectedFile.name)) ? (
                    <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border-2 border-emerald-500 shadow-md">
                      <img 
                        src={URL.createObjectURL(selectedFile)} 
                        alt="Prescription Preview" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <FileCheck className="w-6 h-6" />
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-extrabold text-slate-900 dark:text-white">
                      {selectedFile.name}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {(selectedFile.size / 1024).toFixed(1)} KB • Ready for AI Extraction
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                    }}
                    className="mt-1 text-[11px] font-bold text-red-600 dark:text-red-400 hover:underline"
                  >
                    Change document
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-brand-indigo dark:text-indigo-400 flex items-center justify-center">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Tap or Drag prescription / medical report here
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                      Supports PDF, PNG, JPG, JPEG, WEBP (Camera / Gallery / File)
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Summary Preview Box */}
            <div className="p-3.5 bg-slate-50 dark:bg-[#182235] border border-slate-200/90 dark:border-[#263247] rounded-2xl text-xs space-y-1.5">
              <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                <span className="font-medium text-slate-500 dark:text-slate-400">Target Patient Name:</span>
                <span className="font-extrabold text-slate-900 dark:text-white">{formData.name}</span>
              </div>
              <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                <span className="font-medium text-slate-500 dark:text-slate-400">Demographics:</span>
                <span>{formData.age ? `${formData.age} yrs` : 'Age unspecified'} • {formData.gender} • Blood {formData.blood_group}</span>
              </div>
            </div>

            {/* Step 2 Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-[#263247]">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back to Details</span>
              </button>
              
              <button
                type="button"
                onClick={() => handleCreatePatient()}
                disabled={!selectedFile || !formData.name.trim() || isProcessing}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-teal to-brand-indigo text-white text-xs font-extrabold shadow-lg shadow-brand-indigo/25 hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Create Patient & Process Document</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: PROCESSING PIPELINE */}
        {step === 3 && (
          <div className="p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/80 text-brand-indigo dark:text-indigo-400 flex items-center justify-center mx-auto shadow-inner">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>

            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Initializing Health Story with Gemini AI...
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Synthesizing first clinical records for {formData.name}.
              </p>
            </div>

            {/* Pipeline Stage Indicators */}
            <div className="max-w-md mx-auto space-y-2.5 text-left text-xs">
              {[
                { id: 1, label: 'Validating patient details & document format...' },
                { id: 2, label: 'Extracting selectable text & multi-page imaging...' },
                { id: 3, label: 'Synthesizing clinical entities with Gemini 3.6 Flash...' },
                { id: 4, label: 'Verifying patient name & creating isolated profile...' },
                { id: 5, label: 'Synchronizing timeline, medications, & health trends...' },
              ].map((p) => {
                const isPassed = pipelineStep > p.id;
                const isCurrent = pipelineStep === p.id;
                return (
                  <div
                    key={p.id}
                    className={`flex items-center gap-3 p-2.5 rounded-xl transition-all ${
                      isCurrent
                        ? 'bg-indigo-50 dark:bg-indigo-950/50 text-brand-indigo dark:text-indigo-300 font-bold'
                        : isPassed
                        ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                        : 'text-slate-400 dark:text-slate-600'
                    }`}
                  >
                    <div className="flex-shrink-0">
                      {isPassed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : isCurrent ? (
                        <Loader2 className="w-4 h-4 animate-spin text-brand-indigo" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-700" />
                      )}
                    </div>
                    <span>{p.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 4: SUCCESS & READY */}
        {step === 4 && (
          <div className="p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                {getGreeting(createdPatient?.name || formData.name)}
              </h3>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 font-extrabold">
                Your continuous health story is ready to build.
              </p>
            </div>

            <div className="max-w-md mx-auto p-4 bg-slate-50 dark:bg-[#182235] border border-slate-200/90 dark:border-[#263247] rounded-2xl text-left space-y-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>New isolated patient created ({createdPatient?.id || 'Assigned'})</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>First medical document parsed and stored in SQLite</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Active prescription and health metrics initialized</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  if (onPatientCreated && createdPatient) {
                    onPatientCreated(createdPatient.id, createdPatient);
                  }
                  handleClose();
                }}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-brand-teal via-brand-indigo to-purple-600 text-white text-xs font-extrabold shadow-lg shadow-brand-indigo/30 hover:opacity-95 transition-opacity flex items-center justify-center gap-2"
              >
                <span>Explore Executive Health Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default AddPatientModal;
