import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  FileText, 
  Clock, 
  TrendingUp, 
  Pill, 
  Stethoscope, 
  Languages, 
  AlertTriangle, 
  Sparkles, 
  User, 
  ChevronDown, 
  Menu, 
  X,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { usePatient } from '../../context/PatientContext';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: Activity },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'timeline', label: 'Timeline', icon: Clock },
  { id: 'trends', label: 'Trends', icon: TrendingUp },
  { id: 'medications', label: 'Medications', icon: Pill },
  { id: 'doctor-brief', label: 'Doctor Brief', icon: Stethoscope },
  { id: 'translate', label: 'Translate & Explain', icon: Languages },
];

export const Navbar = ({ activeTab, setActiveTab }) => {
  const { patients, activePatientId, activePatient, switchPatient, loadDemo } = usePatient();
  const [patientDropdownOpen, setPatientDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [demoSuccess, setDemoSuccess] = useState(false);

  const handleDemoClick = async () => {
    try {
      setIsDemoLoading(true);
      await loadDemo();
      setDemoSuccess(true);
      setTimeout(() => setDemoSuccess(false), 3000);
    } catch (err) {
      console.error('Demo error:', err);
    } finally {
      setIsDemoLoading(false);
    }
  };

  return (
    <header className="sticky top-3 z-50 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full mb-6">
      <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-2xl shadow-lg shadow-slate-900/5 px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          
          {/* Brand Logo */}
          <div 
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-2.5 cursor-pointer select-none group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-teal via-brand-indigo to-brand-purple flex items-center justify-center text-white shadow-md shadow-brand-indigo/20 group-hover:scale-105 transition-transform duration-300">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-brand-teal via-brand-indigo to-brand-purple bg-clip-text text-transparent">
                  CAREBRIDGE
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-brand-indigo bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                  <Sparkles className="w-2.5 h-2.5" /> AI Platform
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium hidden md:block leading-none mt-0.5">
                Longitudinal Health Story & Continuity Engine
              </p>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden xl:flex items-center gap-1.5 bg-slate-50/80 p-1.5 rounded-xl border border-slate-200/60">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                    isActive
                      ? 'text-white'
                      : 'text-slate-600 hover:text-brand-indigo hover:bg-slate-100/80'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTabPill"
                      className="absolute inset-0 bg-gradient-to-r from-brand-teal to-brand-indigo rounded-lg shadow-md shadow-brand-indigo/25"
                      transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Demo Data Button */}
            <button
              onClick={handleDemoClick}
              disabled={isDemoLoading}
              className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-colors shadow-sm disabled:opacity-50"
              title="Populate synthetic multi-document health records"
            >
              {isDemoLoading ? (
                <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              ) : demoSuccess ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              )}
              <span>{demoSuccess ? 'Loaded!' : 'Demo Data'}</span>
            </button>

            {/* Patient Selector Dropdown */}
            <div className="relative">
              <button
                onClick={() => setPatientDropdownOpen(!patientDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 transition-all"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-brand-teal to-brand-indigo text-white flex items-center justify-center font-extrabold text-[11px]">
                  {activePatient?.name ? activePatient.name[0] : 'P'}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-[12px] font-bold text-slate-900 leading-tight">
                    {activePatient?.name || 'Select Patient'}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium leading-none">
                    {activePatientId} • {activePatient?.blood_group || 'A+'}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 ml-0.5" />
              </button>

              {/* Patient Dropdown Menu */}
              <AnimatePresence>
                {patientDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-50"
                  >
                    <div className="px-3 py-2 border-b border-slate-100 mb-1">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Active Health Profile
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        Strict Data Isolation
                      </div>
                    </div>

                    <div className="space-y-1 max-h-56 overflow-y-auto">
                      {patients.map((p) => {
                        const isSelected = p.id === activePatientId;
                        return (
                          <button
                            key={p.id}
                            onClick={() => {
                              switchPatient(p.id);
                              setPatientDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                              isSelected
                                ? 'bg-indigo-50/80 text-brand-indigo font-bold border border-indigo-100'
                                : 'text-slate-700 hover:bg-slate-50 font-medium'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-700">
                                {p.name ? p.name[0] : 'P'}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900">{p.name}</div>
                                <div className="text-[10px] text-slate-500">
                                  ID: {p.id} • {p.age ? `${p.age}y` : ''} • {p.blood_group}
                                </div>
                              </div>
                            </div>
                            {isSelected && (
                              <span className="w-2 h-2 rounded-full bg-brand-indigo" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 🚨 Emergency Mode Trigger */}
            <button
              onClick={() => setActiveTab('emergency')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold text-white transition-all shadow-md ${
                activeTab === 'emergency'
                  ? 'bg-red-700 ring-4 ring-red-300/50'
                  : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 animate-pulse-emergency shadow-red-500/30'
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-white animate-bounce" />
              <span className="hidden sm:inline">Emergency</span>
            </button>

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

          </div>
        </div>

        {/* Mobile Slide-Down Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="xl:hidden overflow-hidden border-t border-slate-100 mt-3 pt-3"
            >
              <div className="grid grid-cols-2 gap-2 pb-2">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-brand-teal to-brand-indigo text-white shadow-md'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </button>
                  );
                })}
              </div>

              {/* Mobile Demo Loader */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  onClick={() => {
                    handleDemoClick();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Load Demo Patient Data</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
};

export default Navbar;
