import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  Phone, 
  MapPin, 
  Copy, 
  Check, 
  ShieldAlert, 
  HeartPulse, 
  Pill, 
  Clock, 
  Activity, 
  Navigation,
  RefreshCw,
  Edit2,
  Plus,
  X,
  UserCheck
} from 'lucide-react';
import { usePatient } from '../context/PatientContext';
import api from '../services/api';

export const Emergency = () => {
  const { activePatientId, activePatient, triggerRefresh } = usePatient();
  const [emergencyData, setEmergencyData] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locationStatus, setLocationStatus] = useState('UNACQUIRED');
  const [coords, setCoords] = useState(null);
  const [copied, setCopied] = useState(false);
  const [callModal, setCallModal] = useState(null);
  const [editContactModal, setEditContactModal] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactRel, setContactRel] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [savingContact, setSavingContact] = useState(false);
  const [error, setError] = useState(null);

  const fetchEmergency = async () => {
    try {
      setLoading(true);
      setError(null);
      const [emgRes, evRes] = await Promise.all([
        api.getEmergencyData(activePatientId),
        api.getEmergencyEvents(activePatientId)
      ]);
      if (emgRes.success) {
        setEmergencyData(emgRes.profile);
        const ec = emgRes.profile?.emergency_contact || {};
        setContactName(ec.name || '');
        setContactRel(ec.relationship || '');
        setContactPhone(ec.phone || '');
      }
      if (evRes.success) setEvents(evRes.events || []);
    } catch (err) {
      console.error('Failed to load emergency data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmergency();
    setLocationStatus('UNACQUIRED');
    setCoords(null);
  }, [activePatientId]);

  const handleSaveContact = async (e) => {
    e.preventDefault();
    if (!contactName.trim()) return;
    try {
      setSavingContact(true);
      await api.updateEmergencyContact(activePatientId, {
        name: contactName.trim(),
        relationship: contactRel.trim(),
        phone: contactPhone.trim()
      });
      setEditContactModal(false);
      await fetchEmergency();
      triggerRefresh();
    } catch (err) {
      console.error('Failed to update emergency contact:', err);
      setError(err.message);
    } finally {
      setSavingContact(false);
    }
  };

  // Browser Geolocation
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('UNAVAILABLE');
      return;
    }

    setLocationStatus('REQUESTING');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const payload = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          status: 'ACQUIRED',
          action: 'Browser GPS Location Acquired'
        };
        setCoords(payload);
        setLocationStatus('ACQUIRED');
        try {
          await api.logEmergencyLocation(activePatientId, payload);
          await fetchEmergency();
        } catch (e) {
          console.error(e);
        }
      },
      (err) => {
        console.warn('Geolocation denied or failed:', err);
        setLocationStatus('DENIED');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Simulated Demo Location
  const handleDemoLocation = async () => {
    const payload = {
      latitude: 28.6139,
      longitude: 77.2090,
      accuracy: 12.5,
      status: 'ACQUIRED',
      action: 'Simulated Demo Location Dispatched'
    };
    setCoords(payload);
    setLocationStatus('ACQUIRED');
    try {
      await api.logEmergencyLocation(activePatientId, payload);
      await fetchEmergency();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopyProfile = () => {
    if (!emergencyData) return;
    const contactInfo = emergencyData.emergency_contact?.name 
      ? `${emergencyData.emergency_contact.name} (${emergencyData.emergency_contact.relationship || 'Contact'}: ${emergencyData.emergency_contact.phone || 'N/A'})`
      : 'No contact configured';

    const summary = `
EMERGENCY ICE MEDICAL PROFILE
==============================
Patient Name: ${emergencyData.name || activePatient?.name}
Patient ID: ${activePatientId}
Blood Group: ${emergencyData.blood_group || 'Unknown'}
Critical Allergies: ${emergencyData.allergies || 'None documented'}
Chronic Conditions: ${emergencyData.chronic_conditions || 'None documented'}
Emergency Contact: ${contactInfo}
Active Medications:
${emergencyData.active_medications?.map(m => `• ${m.name} (${m.dosage || 'As directed'})`).join('\n') || 'None'}
    `.trim();

    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const patientName = emergencyData?.name || activePatient?.name || 'Patient';
  const bloodGroup = emergencyData?.blood_group || activePatient?.blood_group || 'Unknown';
  const allergies = emergencyData?.allergies || activePatient?.allergies || 'None documented';
  const conditions = emergencyData?.chronic_conditions || activePatient?.chronic_conditions || 'None documented';
  const activeMeds = emergencyData?.active_medications || [];
  const contact = emergencyData?.emergency_contact || {};
  const hasContact = contact.name && contact.name.trim().length > 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
      
      {/* High-Contrast Red Emergency Header */}
      <motion.div
        initial={{ scale: 0.98, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-gradient-to-r from-red-600 via-red-700 to-rose-900 p-6 sm:p-8 rounded-3xl text-white shadow-2xl shadow-red-950/30 border border-red-500/50 relative overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white animate-pulse">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-[10px] font-extrabold uppercase tracking-widest text-red-100">
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                <span>⚡ HIGH PRIORITY CLINICAL TRIAGE</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1">
                EMERGENCY ICE MODE
              </h1>
              <p className="text-xs text-red-100 mt-0.5">
                Active Profile: <strong className="text-white">{patientName}</strong> (ID: {activePatientId})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyProfile}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-red-700 font-extrabold text-xs shadow-md hover:bg-red-50 transition-all active:scale-95"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Profile Copied!' : 'Copy ICE Profile'}</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Safety Notice */}
      <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-2 transition-colors">
        <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
        <span>Strict Clinical Isolation: Emergency contacts and triage details belong strictly to <strong>{patientName}</strong>.</span>
      </div>

      {/* Vital Triage Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Blood Group */}
        <div className="bg-white dark:bg-[#111827] p-5 rounded-3xl border border-red-100 dark:border-red-950/60 shadow-card transition-colors">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-500">Blood Group</span>
          <div className="text-3xl font-black text-red-600 dark:text-red-400 mt-1">{bloodGroup}</div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Verified patient record</p>
        </div>

        {/* Severe Allergies */}
        <div className="bg-white dark:bg-[#111827] p-5 rounded-3xl border border-red-200 dark:border-red-900/60 shadow-card transition-colors">
          <span className="text-[10px] font-extrabold uppercase text-red-500 dark:text-red-400">Critical Drug Allergies</span>
          <div className="text-base font-extrabold text-red-950 dark:text-red-200 mt-1">{allergies}</div>
          <p className="text-[11px] text-red-600/80 dark:text-red-400/80 mt-1">Do not administer conflicting drugs</p>
        </div>

        {/* Emergency Contact (STRICTLY FROM ACTIVE PATIENT) */}
        <div className="bg-white dark:bg-[#111827] p-5 rounded-3xl border border-slate-200 dark:border-[#263247] shadow-card transition-colors relative">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-500">Emergency Contact</span>
            <button
              onClick={() => setEditContactModal(true)}
              className="text-[11px] font-bold text-brand-teal dark:text-[#2DD4BF] hover:underline flex items-center gap-1"
            >
              <Edit2 className="w-3 h-3" />
              <span>{hasContact ? 'Edit' : 'Configure'}</span>
            </button>
          </div>

          {hasContact ? (
            <div className="mt-2">
              <div className="text-sm font-extrabold text-slate-900 dark:text-[#F8FAFC]">
                {contact.name}
              </div>
              {contact.relationship && (
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-teal-50 dark:bg-teal-950/60 text-brand-teal dark:text-[#2DD4BF] mt-0.5">
                  {contact.relationship}
                </span>
              )}
              <div className="text-xs font-mono text-brand-indigo dark:text-[#818CF8] font-bold mt-1">
                {contact.phone || 'No phone provided'}
              </div>
            </div>
          ) : (
            <div className="mt-2 text-xs text-slate-400">
              <p>No emergency contact configured.</p>
              <button
                onClick={() => setEditContactModal(true)}
                className="mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-brand-teal dark:text-[#2DD4BF] text-xs font-bold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Emergency Contact</span>
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Main Regimen & Location Dispatch Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Active Regimen & Conditions (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Chronic Conditions */}
          <div className="bg-white dark:bg-[#111827] p-6 rounded-3xl border border-slate-200/80 dark:border-[#263247] shadow-card transition-colors">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
              Important Chronic Conditions
            </h3>
            <p className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC] bg-slate-50 dark:bg-[#182235] p-3.5 rounded-2xl border border-slate-100 dark:border-[#263247]">
              {conditions}
            </p>
          </div>

          {/* Active Medications */}
          <div className="bg-white dark:bg-[#111827] p-6 rounded-3xl border border-slate-200/80 dark:border-[#263247] shadow-card transition-colors">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-1.5">
              <Pill className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Active Therapeutic Regimen ({activeMeds.length})
            </h3>
            {activeMeds.length > 0 ? (
              <div className="space-y-2.5">
                {activeMeds.map((med, idx) => (
                  <div key={idx} className="p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 flex items-center justify-between">
                    <div>
                      <div className="font-extrabold text-xs text-emerald-950 dark:text-emerald-200">{med.name}</div>
                      <div className="text-[11px] text-emerald-700 dark:text-emerald-400">{med.dosage || 'Dosage as directed'} • {med.frequency || 'Daily'}</div>
                    </div>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-200 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200">
                      ACTIVE
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 dark:text-slate-500">No active medications documented.</p>
            )}
          </div>

        </div>

        {/* Right: Emergency Actions & Location (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Quick Call Actions */}
          <div className="bg-white dark:bg-[#111827] p-6 rounded-3xl border border-slate-200/80 dark:border-[#263247] shadow-card space-y-3 transition-colors">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
              Immediate Emergency Triggers
            </h3>

            <button
              onClick={() => setCallModal({ title: 'Call Emergency Services (911)', number: '911' })}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-red-600 to-red-700 text-white font-extrabold text-xs shadow-lg shadow-red-600/30 hover:opacity-95 active:scale-95 transition-all"
            >
              <Phone className="w-4 h-4" />
              <span>Call Emergency Services (911)</span>
            </button>

            {hasContact && (
              <button
                onClick={() => setCallModal({ title: `Call ${contact.name}`, number: contact.phone })}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-extrabold text-xs shadow hover:opacity-95 active:scale-95 transition-all"
              >
                <Phone className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
                <span>Call {contact.name} ({contact.relationship || 'ICE'})</span>
              </button>
            )}
          </div>

          {/* Location Dispatch */}
          <div className="bg-white dark:bg-[#111827] p-6 rounded-3xl border border-slate-200/80 dark:border-[#263247] shadow-card space-y-3 transition-colors">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Live Location Dispatch
            </h3>

            <div className="p-3.5 bg-slate-50 dark:bg-[#182235] rounded-2xl border border-slate-100 dark:border-[#263247] text-xs">
              <div className="flex items-center justify-between font-bold text-slate-700 dark:text-slate-300">
                <span>GPS Status:</span>
                <span className={locationStatus === 'ACQUIRED' ? 'text-emerald-600 font-black' : 'text-slate-500'}>
                  {locationStatus}
                </span>
              </div>
              {coords && (
                <div className="mt-2 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  Lat: {coords.latitude?.toFixed(4)}, Long: {coords.longitude?.toFixed(4)}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleGetLocation}
                className="flex-1 py-2.5 rounded-xl bg-brand-teal text-white font-bold text-xs shadow hover:opacity-95 transition-opacity flex items-center justify-center gap-1.5"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Share GPS</span>
              </button>
              <button
                onClick={handleDemoLocation}
                className="px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-[#182235] text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 transition-colors"
                title="Simulate Dispatch"
              >
                Demo GPS
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* Edit Emergency Contact Modal */}
      <AnimatePresence>
        {editContactModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#111827] rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200 dark:border-[#263247] space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#263247] pb-3">
                <h3 className="text-sm font-black text-slate-900 dark:text-[#F8FAFC]">
                  Configure Emergency Contact
                </h3>
                <button onClick={() => setEditContactModal(false)}>
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSaveContact} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-extrabold uppercase text-slate-500 dark:text-slate-400 mb-1">
                    Contact Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#182235] border border-slate-200 dark:border-[#263247] text-xs text-slate-900 dark:text-white focus:outline-none focus:border-brand-teal"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold uppercase text-slate-500 dark:text-slate-400 mb-1">
                    Relationship
                  </label>
                  <input
                    type="text"
                    value={contactRel}
                    onChange={(e) => setContactRel(e.target.value)}
                    placeholder="e.g. Spouse, Sibling, Primary Caregiver"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#182235] border border-slate-200 dark:border-[#263247] text-xs text-slate-900 dark:text-white focus:outline-none focus:border-brand-teal"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold uppercase text-slate-500 dark:text-slate-400 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="e.g. +1-555-0199"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#182235] border border-slate-200 dark:border-[#263247] text-xs text-slate-900 dark:text-white focus:outline-none focus:border-brand-teal"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditContactModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-[#182235]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingContact}
                    className="px-4 py-2 rounded-xl bg-brand-teal text-white text-xs font-black shadow"
                  >
                    {savingContact ? 'Saving...' : 'Save Contact'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Call Confirmation / Modal */}
      <AnimatePresence>
        {callModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#111827] rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-[#263247] space-y-4 text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/50 text-red-600 mx-auto flex items-center justify-center">
                <Phone className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {callModal.title}
              </h3>
              <p className="text-xs text-slate-500">
                Number: <strong className="text-slate-900 dark:text-white">{callModal.number}</strong>
              </p>
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-[11px] font-bold">
                Simulation Mode: Browser would trigger tel:{callModal.number}
              </div>
              <button
                onClick={() => setCallModal(null)}
                className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-[#182235] text-xs font-bold"
              >
                Dismiss
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Emergency;
