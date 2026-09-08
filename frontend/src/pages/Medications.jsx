import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Pill, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  FileText, 
  RefreshCw, 
  ShieldAlert, 
  Calendar,
  Sparkles,
  Zap
} from 'lucide-react';
import { usePatient } from '../context/PatientContext';
import api from '../services/api';

export const Medications = () => {
  const { activePatientId, activePatient, triggerRefresh } = usePatient();
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('active');
  const [loading, setLoading] = useState(true);
  const [promoting, setPromoting] = useState(false);
  const [error, setError] = useState(null);

  const fetchMeds = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getMedications(activePatientId);
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      console.error('Failed to fetch medications:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeds();
  }, [activePatientId]);

  const handlePromotePending = async (docId) => {
    try {
      setPromoting(true);
      await api.setPrescriptionCurrent(activePatientId, docId);
      await fetchMeds();
      triggerRefresh();
    } catch (err) {
      console.error('Promotion failed:', err);
      setError(err.message);
    } finally {
      setPromoting(false);
    }
  };

  const activeMeds = data?.active_medications || [];
  const historicalMeds = data?.historical_medications || [];
  const pendingMeds = data?.pending_medications || [];
  const patientName = activePatient?.name || 'Patient';
  const allergies = activePatient?.allergies || data?.allergies || 'None documented';

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-[#F8FAFC] flex items-center gap-2">
            <Pill className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            Medication & Regimen Tracker
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Structured therapeutic management and prescription history for <strong className="text-slate-700 dark:text-slate-200">{patientName}</strong>.
          </p>
        </div>
        <button
          onClick={fetchMeds}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-[#182235] border border-slate-200 dark:border-[#263247] text-xs font-bold text-slate-700 dark:text-[#F8FAFC] hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Allergies Warning Strip */}
      <div className="p-4 rounded-2xl bg-red-50/80 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 flex items-center justify-between gap-4 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-300 flex items-center justify-center flex-shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
              Known Drug Allergies
            </div>
            <div className="text-xs sm:text-sm font-extrabold text-red-950 dark:text-red-200">
              {allergies}
            </div>
          </div>
        </div>
      </div>

      {/* Pending Verification Banner */}
      {pendingMeds.length > 0 && (
        <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 shadow-sm transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-extrabold text-amber-950 dark:text-amber-200">
                  Pending Prescription Review ({pendingMeds.length} items)
                </h4>
                <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                  Uploaded prescription has an unconfirmed date: {pendingMeds.map(m => m.name).join(', ')}
                </p>
              </div>
            </div>

            <button
              onClick={() => handlePromotePending(pendingMeds[0].document_id)}
              disabled={promoting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md shadow-amber-600/20 disabled:opacity-50"
            >
              <Zap className="w-4 h-4" />
              <span>{promoting ? 'Promoting...' : 'Promote to Active Regimen'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-[#263247] pb-2">
        <button
          onClick={() => setActiveTab('active')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'active'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#182235]'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-300" />
          <span>Active Regimen ({activeMeds.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('historical')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'historical'
              ? 'bg-slate-700 dark:bg-[#182235] text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#182235]'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Superseded / History ({historicalMeds.length})</span>
        </button>
      </div>

      {/* Tab 1: Active Regimen */}
      {activeTab === 'active' && (
        <div className="space-y-4">
          {activeMeds.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeMeds.map((med, idx) => (
                <motion.div
                  key={med.id || idx}
                  whileHover={{ y: -3 }}
                  className="bg-white dark:bg-[#111827] p-6 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/50 shadow-card hover:shadow-card-hover transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                        <Pill className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-[#F8FAFC]">{med.name}</h3>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            CURRENT
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                          {med.dosage || 'Dosage as directed'} • {med.route || 'Oral'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-[#263247] grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium block">Schedule:</span>
                      <strong className="text-slate-700 dark:text-slate-300">{med.frequency || 'Daily'}</strong>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium block">Indication:</span>
                      <strong className="text-slate-700 dark:text-slate-300">{med.purpose || 'Ongoing therapeutic management'}</strong>
                    </div>
                  </div>

                  {med.source_document_name && (
                    <div className="mt-3 text-[11px] text-slate-400 dark:text-slate-400 flex items-center gap-1.5 bg-slate-50 dark:bg-[#182235] p-2 rounded-xl border border-slate-100 dark:border-[#263247]">
                      <FileText className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                      <span className="truncate">Source: {med.source_document_name}</span>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-[#111827] p-12 rounded-2xl border border-slate-200 dark:border-[#263247] text-center text-xs text-slate-400 dark:text-slate-500 transition-colors">
              No active medications documented for this patient.
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Historical Medications */}
      {activeTab === 'historical' && (
        <div className="space-y-4">
          {historicalMeds.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {historicalMeds.map((med, idx) => (
                <div
                  key={med.id || idx}
                  className="bg-white dark:bg-[#111827] p-6 rounded-2xl border border-slate-200 dark:border-[#263247] shadow-sm opacity-80 hover:opacity-100 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-[#182235] text-slate-500 dark:text-slate-400 flex items-center justify-center font-bold">
                        <Pill className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-slate-800 dark:text-[#F8FAFC]">{med.name}</h3>
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-slate-100 dark:bg-[#182235] text-slate-600 dark:text-slate-400 uppercase border border-slate-200 dark:border-[#263247]">
                            {med.status || 'SUPERSEDED'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                          {med.dosage || 'Dosage unspecified'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                    <div>Indication: {med.purpose || 'Historic treatment'}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-[#111827] p-12 rounded-2xl border border-slate-200 dark:border-[#263247] text-center text-xs text-slate-400 dark:text-slate-500 transition-colors">
              No superseded or discontinued medications in record history.
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default Medications;
