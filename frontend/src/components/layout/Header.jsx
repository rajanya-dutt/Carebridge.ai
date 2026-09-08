import React from 'react';
import { Menu, AlertTriangle, ShieldCheck, HeartPulse } from 'lucide-react';
import { usePatient } from '../../context/PatientContext';

const PAGE_TITLES = {
  dashboard: 'Executive Health Dashboard',
  documents: 'Medical Documents & Ingestion',
  timeline: 'Longitudinal Health Timeline',
  trends: 'Biomarker Trends & Trajectories',
  medications: 'Medications & Prescriptions',
  'doctor-brief': 'AI Doctor Appointment Brief',
  translate: 'Translate & Explain (11 Languages)',
  emergency: '🚨 Emergency ICE Mode',
};

export const Header = ({ activeTab, setActiveTab, setMobileOpen }) => {
  const { activePatientId, activePatient } = usePatient();
  const patientName = activePatient?.name || 'Patient';

  return (
    <header className="sticky top-0 z-20 bg-white/80 dark:bg-[#111827]/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-[#263247] px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between transition-colors duration-300">
      
      {/* Mobile Hamburger & Logo */}
      <div className="flex items-center gap-3 lg:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          aria-label="Open Navigation Sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-brand-teal to-brand-indigo flex items-center justify-center text-white font-bold text-xs">
            <HeartPulse className="w-4 h-4" />
          </div>
          <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-brand-teal to-brand-indigo dark:from-[#2DD4BF] dark:to-[#818CF8] bg-clip-text text-transparent">
            CAREBRIDGE
          </span>
        </div>
      </div>

      {/* Desktop Breadcrumb / Title */}
      <div className="hidden lg:flex items-center gap-3">
        <h1 className="text-lg font-black text-slate-900 dark:text-[#F8FAFC] tracking-tight">
          {PAGE_TITLES[activeTab] || 'Dashboard'}
        </h1>
        <span className="text-slate-300 dark:text-slate-700">/</span>
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100/80 dark:bg-[#182235] border border-slate-200 dark:border-[#263247] rounded-full text-xs font-bold text-slate-700 dark:text-slate-300">
          <span className="w-2 h-2 rounded-full bg-brand-indigo dark:bg-[#818CF8]" />
          <span>{patientName}</span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono font-medium">({activePatientId || 'None'})</span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {activeTab !== 'emergency' && (
          <button
            onClick={() => setActiveTab('emergency')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white font-extrabold text-xs shadow-md shadow-red-500/20 hover:from-red-500 hover:to-red-600 active:scale-95 transition-all animate-pulse"
          >
            <AlertTriangle className="w-4 h-4" />
            <span className="hidden sm:inline">Emergency Mode</span>
          </button>
        )}
      </div>

    </header>
  );
};

export default Header;
