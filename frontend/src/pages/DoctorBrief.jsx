import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Stethoscope, 
  Sparkles, 
  Copy, 
  Check, 
  FileText, 
  AlertCircle, 
  Pill, 
  Clock, 
  HelpCircle, 
  TrendingUp, 
  Activity,
  RefreshCw,
  CheckCircle2,
  ListOrdered,
  AlertTriangle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { usePatient } from '../context/PatientContext';
import api from '../services/api';

const GENERATION_STEPS = [
  'Collecting patient clinical context',
  'Analyzing recent encounters & reports',
  'Synthesizing longitudinal medical brief',
  'Preparing doctor discussion questions'
];

export const DoctorBrief = () => {
  const { activePatientId, activePatient } = usePatient();
  const [briefBundle, setBriefBundle] = useState(null);
  const [aiBrief, setAiBrief] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);
  const [showDevError, setShowDevError] = useState(false);

  const fetchBriefData = async () => {
    if (!activePatientId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.getDoctorBrief(activePatientId);
      if (res.success) {
        setBriefBundle(res.data_bundle);
      }
    } catch (err) {
      console.error('Failed to load brief data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBriefData();
    setAiBrief(null);
  }, [activePatientId]);

  const handleGenerateAiBrief = async (force = false) => {
    if (!activePatientId) return;
    try {
      setGenerating(true);
      setError(null);
      setCurrentStepIndex(0);

      // Multi-step progress animation timer
      const interval = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev < GENERATION_STEPS.length - 1) return prev + 1;
          return prev;
        });
      }, 3500);

      const res = await api.generateDoctorBrief(activePatientId, force);
      clearInterval(interval);
      setCurrentStepIndex(GENERATION_STEPS.length);

      if (res.success) {
        setAiBrief(res.brief);
      }
    } catch (err) {
      console.error('AI brief generation error:', err);
      setError(err.message || 'Doctor Brief could not be synthesized. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!aiBrief && !briefBundle) return;
    const textToCopy = aiBrief?.brief_markdown || JSON.stringify(briefBundle, null, 2);
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const patientName = activePatient?.name || 'Patient';
  const profile = briefBundle?.patient_profile || {};
  const activeMeds = briefBundle?.active_medications || [];
  const shifts = briefBundle?.key_biomarker_shifts || [];

  // Parse markdown sections into structured blocks if available
  const parseMarkdownSections = (markdownText) => {
    if (!markdownText) return [];
    const rawSections = markdownText.split(/(?=^##\s+)/m);
    return rawSections
      .map(sec => {
        const trimmed = sec.trim();
        if (!trimmed) return null;
        const lines = trimmed.split('\n');
        const header = lines[0].replace(/^##\s+/, '').trim();
        const content = lines.slice(1).join('\n').trim();
        return { header, content };
      })
      .filter(Boolean);
  };

  const briefSections = aiBrief?.brief_markdown ? parseMarkdownSections(aiBrief.brief_markdown) : [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-teal via-brand-indigo to-purple-600 text-white flex items-center justify-center shadow-md">
              <Stethoscope className="w-4 h-4" />
            </div>
            AI Clinical Doctor Brief
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Appointment-ready clinical continuity summary for <strong className="text-slate-700 dark:text-slate-200">{patientName}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={handleCopy}
            disabled={!aiBrief && !briefBundle}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-[#182235] border border-slate-200 dark:border-[#263247] text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition-all disabled:opacity-40"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
          </button>

          <button
            onClick={() => handleGenerateAiBrief(true)}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-teal via-brand-indigo to-purple-600 dark:from-[#2DD4BF] dark:to-[#818CF8] text-white dark:text-slate-950 font-black text-xs shadow-md shadow-brand-indigo/25 hover:opacity-95 active:scale-95 disabled:opacity-50 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>{generating ? 'Synthesizing Brief...' : (aiBrief ? 'Regenerate AI Brief' : 'Generate Doctor Brief')}</span>
          </button>
        </div>
      </div>

      {/* Error Banner with Retry & Dev info */}
      {error && (
        <div className="p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-800 dark:text-rose-300 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>Doctor Brief could not be generated</span>
            </div>
            <button
              onClick={() => handleGenerateAiBrief(true)}
              className="px-3 py-1 bg-rose-600 text-white rounded-lg font-extrabold text-[11px] hover:bg-rose-700 transition-colors"
            >
              Try Again
            </button>
          </div>
          <p className="text-[11px] text-rose-700 dark:text-rose-400">
            {error.includes('timeout') ? 'AI service took longer than expected to process all longitudinal records.' : error}
          </p>
          <div className="pt-1">
            <button
              onClick={() => setShowDevError(!showDevError)}
              className="text-[10px] text-rose-600 dark:text-rose-400 font-mono underline flex items-center gap-1"
            >
              <span>{showDevError ? 'Hide technical details' : 'Show technical details'}</span>
              {showDevError ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {showDevError && (
              <pre className="mt-2 p-2 bg-rose-100 dark:bg-rose-950 rounded-lg text-[10px] overflow-x-auto text-rose-900 dark:text-rose-200">
                {error}
              </pre>
            )}
          </div>
        </div>
      )}

      {/* Multi-Step Animated Progress Indicator */}
      {generating && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 sm:p-8 rounded-3xl bg-indigo-50/80 dark:bg-[#182235] border border-indigo-200 dark:border-indigo-800 shadow-xl space-y-6"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-indigo dark:bg-[#818CF8] text-white dark:text-slate-950 flex items-center justify-center shadow-lg animate-spin">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-indigo-950 dark:text-white">
                ✨ Preparing your Doctor Brief...
              </h3>
              <p className="text-xs text-indigo-800 dark:text-indigo-300">
                Gemini 3.6 Flash is synthesizing longitudinal records, prescriptions, and lab shifts.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {GENERATION_STEPS.map((step, idx) => {
              const isCompleted = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              return (
                <div
                  key={idx}
                  className={`p-3 rounded-2xl border text-xs flex items-center gap-2.5 transition-all ${
                    isCompleted
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold'
                      : isCurrent
                      ? 'bg-white dark:bg-[#111827] border-indigo-300 dark:border-indigo-600 text-brand-indigo dark:text-indigo-400 font-extrabold shadow-sm animate-pulse'
                      : 'bg-slate-100/60 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800 text-slate-400 dark:text-slate-600 font-medium'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  ) : isCurrent ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-brand-indigo dark:text-indigo-400 flex-shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-700 flex-shrink-0" />
                  )}
                  <span>Step {idx + 1}: {step}</span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* AI-Generated Result Card */}
      {aiBrief && !generating && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-indigo-50/90 via-white to-purple-50/90 dark:from-[#111827] dark:via-[#182235] dark:to-[#111827] p-6 sm:p-8 rounded-3xl border border-indigo-200 dark:border-indigo-800 shadow-xl space-y-6 transition-colors"
        >
          {/* Brief Card Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-indigo-100 dark:border-indigo-900/60 pb-4 gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-brand-indigo dark:bg-[#818CF8] text-white dark:text-slate-950 flex items-center justify-center shadow-md">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  1-Page Pre-Consultation Doctor Brief
                </h3>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Synthesized with Gemini 3.6 Flash • {briefBundle?.generated_timestamp || 'Latest'}
                </div>
              </div>
            </div>
            <span className="self-start sm:self-auto px-2.5 py-1 rounded-full text-[10px] font-black bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 uppercase tracking-wide">
              Clinical Decision Support
            </span>
          </div>

          {/* Safety Disclaimer Banner */}
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl text-[11px] font-medium text-amber-800 dark:text-amber-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>AI-Generated Clinical Synthesis — For Informational & Decision Support Only. Requires Licensed Healthcare Professional Review.</span>
          </div>

          {/* Rendered Brief Sections */}
          {briefSections.length > 0 ? (
            <div className="space-y-4">
              {briefSections.map((sec, idx) => (
                <div 
                  key={idx} 
                  className="bg-white/90 dark:bg-[#111827]/90 p-4 sm:p-5 rounded-2xl border border-indigo-100 dark:border-[#263247] shadow-sm space-y-2"
                >
                  <h4 className="text-xs font-black uppercase tracking-wider text-brand-indigo dark:text-[#2DD4BF] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-brand-indigo dark:bg-[#2DD4BF]" />
                    {sec.header}
                  </h4>
                  <div className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap font-sans">
                    {sec.content}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white/90 dark:bg-[#111827]/90 p-5 rounded-2xl border border-indigo-100 dark:border-[#263247] text-xs sm:text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
              {aiBrief.brief_markdown || JSON.stringify(aiBrief, null, 2)}
            </div>
          )}
        </motion.div>
      )}

      {/* Structured Clinical Fact Sheet */}
      <div className="bg-white dark:bg-[#111827] p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-[#263247] shadow-card space-y-6 transition-colors">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#263247] pb-4">
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
            Longitudinal Health Baseline & Records
          </h3>
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
            Validated SQLite Data
          </span>
        </div>

        {/* Patient Demographic Profile Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50/80 dark:bg-[#182235] p-4 rounded-2xl border border-slate-100 dark:border-[#263247] text-xs">
          <div>
            <span className="text-slate-400 dark:text-slate-500 block text-[10px] font-bold uppercase">Age / Gender</span>
            <strong className="text-slate-800 dark:text-slate-200">{profile.age ? `${profile.age} yrs` : 'N/A'} / {profile.gender || 'N/A'}</strong>
          </div>
          <div>
            <span className="text-slate-400 dark:text-slate-500 block text-[10px] font-bold uppercase">Blood Group</span>
            <strong className="text-slate-800 dark:text-slate-200">{profile.blood_group || 'N/A'}</strong>
          </div>
          <div>
            <span className="text-slate-400 dark:text-slate-500 block text-[10px] font-bold uppercase">Allergies</span>
            <strong className="text-rose-600 dark:text-rose-400 font-extrabold">{profile.known_allergies || 'None'}</strong>
          </div>
          <div>
            <span className="text-slate-400 dark:text-slate-500 block text-[10px] font-bold uppercase">Emergency Contact</span>
            <strong className="text-slate-800 dark:text-slate-200">{profile.emergency_contact || 'N/A'}</strong>
          </div>
        </div>

        {/* Active Medications */}
        <div>
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-1.5">
            <Pill className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Current Active Regimen ({activeMeds.length})
          </h4>
          {activeMeds.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activeMeds.map((m, idx) => (
                <div key={idx} className="p-3 bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 rounded-xl text-xs">
                  <div className="font-extrabold text-emerald-950 dark:text-emerald-200">{m.name}</div>
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                    {m.dosage || 'Dosage as directed'} • {m.frequency || 'Daily'} • {m.purpose || 'Ongoing'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 dark:text-slate-500">No active medications documented.</p>
          )}
        </div>

        {/* Biomarker Shifts */}
        <div>
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            Tracked Biomarker Changes ({shifts.length})
          </h4>
          {shifts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {shifts.map((s, idx) => (
                <div key={idx} className="p-3 bg-purple-50/50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/50 rounded-xl text-xs">
                  <div className="font-bold text-slate-900 dark:text-slate-200">{s.test_name}</div>
                  <div className="text-sm font-extrabold text-purple-950 dark:text-purple-300 mt-1">
                    {s.latest_value} <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">{s.unit}</span>
                  </div>
                  <div className="text-[10px] text-purple-700 dark:text-purple-400 font-bold mt-0.5">
                    {s.delta !== null ? `${s.delta > 0 ? `+${s.delta}` : s.delta} (${s.pct_change > 0 ? `+${s.pct_change}` : s.pct_change}%)` : 'Baseline'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 dark:text-slate-500">No consecutive lab measurements recorded.</p>
          )}
        </div>

      </div>

    </div>
  );
};

export default DoctorBrief;
