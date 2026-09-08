import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PatientProvider, usePatient } from './context/PatientContext';
import { ThemeProvider } from './context/ThemeContext';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Dashboard from './pages/Dashboard';
import Documents from './pages/Documents';
import Timeline from './pages/Timeline';
import Trends from './pages/Trends';
import Medications from './pages/Medications';
import DoctorBrief from './pages/DoctorBrief';
import TranslateExplain from './pages/TranslateExplain';
import Emergency from './pages/Emergency';
import { Sparkles, UploadCloud, Loader2, AlertCircle, RefreshCw, X } from 'lucide-react';

function MainApp() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { 
    patients, 
    activePatientId, 
    loading, 
    loadDemo, 
    isSwitchingPatient, 
    pendingPatientId, 
    switchError, 
    retrySwitch, 
    cancelSwitch 
  } = usePatient();

  const renderActivePage = () => {
    if (!loading && patients.length === 0) {
      return (
        <div className="max-w-md mx-auto my-16 p-8 bg-white dark:bg-[#111827] rounded-3xl border border-slate-200 dark:border-[#263247] shadow-xl text-center space-y-4 transition-colors">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-brand-indigo dark:text-indigo-400 flex items-center justify-center mx-auto">
            <UploadCloud className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
            No Patient Profiles in Database
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            All previous records have been cleaned or deleted. You can populate synthetic patient records for testing or upload a medical document.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={loadDemo}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-brand-teal to-brand-indigo text-white text-xs font-bold shadow-md hover:opacity-95 transition-opacity"
            >
              <Sparkles className="w-4 h-4" />
              <span>Load Demo Patient Data</span>
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-[#182235] text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              Upload New Medical Document
            </button>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard setActiveTab={setActiveTab} />;
      case 'documents':
        return <Documents setActiveTab={setActiveTab} />;
      case 'timeline':
        return <Timeline setActiveTab={setActiveTab} />;
      case 'trends':
        return <Trends setActiveTab={setActiveTab} />;
      case 'medications':
        return <Medications setActiveTab={setActiveTab} />;
      case 'doctor-brief':
        return <DoctorBrief setActiveTab={setActiveTab} />;
      case 'translate':
        return <TranslateExplain setActiveTab={setActiveTab} />;
      case 'emergency':
        return <Emergency setActiveTab={setActiveTab} />;
      default:
        return <Dashboard setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen flex bg-brand-bg dark:bg-[#0B1020] antialiased text-slate-900 dark:text-[#F8FAFC] transition-colors duration-300">
      {/* 1. SIDEBAR NAVIGATION */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />

      {/* 2. MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden relative">
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          setMobileOpen={setMobileOpen}
        />

        {/* ATOMIC PATIENT SWITCHING STATUS TOAST */}
        <AnimatePresence>
          {isSwitchingPatient && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="sticky top-16 z-30 mx-auto mt-2 px-4 py-2 bg-indigo-600/90 dark:bg-indigo-500/90 backdrop-blur-md text-white text-xs font-semibold rounded-full shadow-lg flex items-center gap-2"
            >
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Loading health story for {patients.find(p => p.id === pendingPatientId)?.name || 'patient'}...</span>
            </motion.div>
          )}

          {switchError && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="sticky top-16 z-30 max-w-xl mx-auto mt-3 px-4 py-3 bg-red-50 dark:bg-red-950/90 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-100 rounded-2xl shadow-xl flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                <div className="text-xs">
                  <p className="font-bold">Unable to load {switchError.targetName}'s health story.</p>
                  <p className="text-[11px] text-red-700 dark:text-red-300">Previous patient data was preserved.</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={retrySwitch}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Try Again</span>
                </button>
                <button
                  onClick={cancelSwitch}
                  className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors"
                >
                  Stay With Current
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto transition-all duration-300">
          {renderActivePage()}
        </main>

        <Footer />
      </div>
    </div>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <PatientProvider>
        <MainApp />
      </PatientProvider>
    </ThemeProvider>
  );
}

export default App;
