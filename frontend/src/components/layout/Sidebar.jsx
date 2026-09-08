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
  AlertCircle,
  Sparkles, 
  User, 
  UserPlus,
  Trash2,
  ChevronDown, 
  Menu, 
  X,
  ShieldCheck,
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight, 
  HeartPulse, 
  Sun, 
  Moon,
  Loader2 
} from 'lucide-react';
import { usePatient } from '../../context/PatientContext';
import { useTheme } from '../../context/ThemeContext';
import AddPatientModal from '../AddPatientModal';

const NAV_SECTIONS = [
  {
    title: 'OVERVIEW',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: Activity, badge: null },
      { id: 'documents', label: 'Documents', icon: FileText, badge: null },
      { id: 'timeline', label: 'Health Timeline', icon: Clock, badge: null },
      { id: 'trends', label: 'Health Trends', icon: TrendingUp, badge: null },
    ]
  },
  {
    title: 'CARE & AI',
    items: [
      { id: 'medications', label: 'Medications', icon: Pill, badge: null },
      { id: 'doctor-brief', label: 'Doctor Brief', icon: Stethoscope, badge: 'AI' },
      { id: 'translate', label: 'Translate & Explain', icon: Languages, badge: '11 Lang' },
    ]
  },
  {
    title: 'SAFETY & TRIAGE',
    items: [
      { id: 'emergency', label: 'Emergency Mode', icon: AlertTriangle, isEmergency: true },
    ]
  }
];

export const Sidebar = ({ activeTab, setActiveTab, mobileOpen, setMobileOpen, collapsed, setCollapsed }) => {
  const { patients, activePatientId, activePatient, switchPatient, deletePatient, loadDemo } = usePatient();
  const { theme, toggleTheme, isDark } = useTheme();
  const [patientDropdownOpen, setPatientDropdownOpen] = useState(false);
  const [addPatientOpen, setAddPatientOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeletingPatient, setIsDeletingPatient] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [demoSuccess, setDemoSuccess] = useState(false);

  const handleDeletePatientConfirm = async () => {
    if (!activePatientId) return;
    try {
      setIsDeletingPatient(true);
      setDeleteError(null);
      await deletePatient(activePatientId);
      setDeleteModalOpen(false);
      setActiveTab('dashboard');
    } catch (err) {
      console.error('Delete patient failed:', err);
      setDeleteError(err.message || 'Failed to delete patient profile.');
    } finally {
      setIsDeletingPatient(false);
    }
  };

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

  const handleNavClick = (id) => {
    setActiveTab(id);
    if (mobileOpen) {
      setMobileOpen(false);
    }
  };

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between bg-white dark:bg-[#111827] border-r border-slate-200/90 dark:border-[#263247] shadow-sm select-none transition-colors duration-300 overflow-y-auto min-h-0">
      
      {/* Top Brand & Patient Switcher */}
      <div className="flex-shrink-0">
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-100 dark:border-[#263247] flex items-center justify-between">
          <div 
            onClick={() => handleNavClick('dashboard')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-teal via-brand-indigo to-purple-600 flex items-center justify-center text-white shadow-md shadow-brand-indigo/25 group-hover:scale-105 transition-transform flex-shrink-0">
              <HeartPulse className="w-5 h-5" />
            </div>
            {!collapsed && (
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-brand-teal via-brand-indigo to-purple-600 dark:from-[#2DD4BF] dark:to-[#818CF8] bg-clip-text text-transparent">
                    CAREBRIDGE
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold tracking-wide">
                  AI-powered health intelligence
                </p>
              </div>
            )}
          </div>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Patient Switcher in Sidebar */}
        {!collapsed ? (
          <div className="p-4 border-b border-slate-100 dark:border-[#263247]">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5 flex items-center justify-between">
              <span>ACTIVE PATIENT</span>
              <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                <ShieldCheck className="w-2.5 h-2.5" /> Isolated
              </span>
            </div>

            <div className="relative">
              <button
                onClick={() => setPatientDropdownOpen(!patientDropdownOpen)}
                className="w-full flex items-center justify-between p-2.5 bg-slate-50 dark:bg-[#182235] hover:bg-indigo-50/50 dark:hover:bg-slate-800 border border-slate-200/90 dark:border-[#263247] rounded-2xl transition-all text-left"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-brand-teal to-brand-indigo text-white flex items-center justify-center font-extrabold text-xs flex-shrink-0">
                    {activePatient?.name ? activePatient.name[0] : 'P'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 font-extrabold text-xs text-slate-900 dark:text-[#F8FAFC]">
                      <span className="truncate">{activePatient?.name || 'Select Patient'}</span>
                      {(activePatientId === 'DEMO_P101' || activePatientId?.startsWith('DEMO_') || activePatient?.name?.toLowerCase().includes('demo')) && (
                        <span className="text-[8px] font-extrabold uppercase px-1 py-0.2 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800 flex-shrink-0">
                          DEMO
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                      ID: {activePatientId || 'None'} • {activePatient?.blood_group || 'N/A'}
                    </div>
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
              </button>

              {/* Patient Dropdown Menu */}
              <AnimatePresence>
                {patientDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.96 }}
                    className="absolute left-0 right-0 mt-2 bg-white dark:bg-[#182235] border border-slate-200 dark:border-[#263247] rounded-2xl shadow-2xl p-2 z-50 max-h-64 overflow-y-auto"
                  >
                    {patients.length > 0 ? (
                      patients.map((p) => {
                        const isSelected = p.id === activePatientId;
                        const isDemo = p.id === 'DEMO_P101' || p.id.startsWith('DEMO_') || p.name?.toLowerCase().includes('demo');
                        return (
                          <button
                            key={p.id}
                            onClick={() => {
                              switchPatient(p.id);
                              setPatientDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors mb-1 ${
                              isSelected
                                ? 'bg-indigo-50/90 dark:bg-indigo-950/60 text-brand-indigo dark:text-indigo-400 font-bold border border-indigo-100 dark:border-indigo-800'
                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium'
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-900 dark:text-white truncate">{p.name}</span>
                                {isDemo && (
                                   <span className="text-[8px] font-extrabold uppercase px-1 py-0.2 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800 flex-shrink-0">
                                     DEMO
                                   </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 dark:text-slate-500">
                                ID: {p.id} • Blood: {p.blood_group || 'N/A'}
                              </div>
                            </div>
                            {isSelected && (
                              <span className="w-2 h-2 rounded-full bg-brand-indigo dark:bg-[#818CF8] flex-shrink-0" />
                            )}
                          </button>
                        );
                      })
                    ) : (
                      <div className="p-3 text-center text-xs text-slate-400 dark:text-slate-500">
                        No active patient records in database.
                      </div>
                    )}

                    {/* Inside Dropdown Add Patient Trigger */}
                    <div className="pt-2 mt-1 border-t border-slate-100 dark:border-[#263247]">
                      <button
                        onClick={() => {
                          setAddPatientOpen(true);
                          setPatientDropdownOpen(false);
                        }}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-gradient-to-r from-brand-teal to-brand-indigo text-white font-bold text-xs shadow-sm hover:opacity-95 transition-opacity"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>➕ Add New Patient</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Action Buttons Under Dropdown */}
            <div className="mt-2.5 flex flex-col gap-1.5">
              <button
                onClick={() => {
                  setAddPatientOpen(true);
                  setPatientDropdownOpen(false);
                }}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-brand-indigo dark:text-indigo-300 font-bold text-xs border border-indigo-200/80 dark:border-indigo-800/80 transition-all shadow-sm group"
              >
                <UserPlus className="w-3.5 h-3.5 group-hover:scale-110 transition-transform text-brand-indigo dark:text-indigo-400" />
                <span>➕ Add New Patient</span>
              </button>

              {activePatient && (
                <button
                  onClick={() => {
                    setDeleteModalOpen(true);
                    setPatientDropdownOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-red-50/70 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/60 text-red-600 dark:text-red-400 font-bold text-[11px] border border-red-200/60 dark:border-red-900/40 transition-all group"
                  title={`Delete ${activePatient.name}'s profile`}
                >
                  <Trash2 className="w-3 h-3 group-hover:scale-110 transition-transform text-red-500" />
                  <span>🗑️ Delete Patient Profile</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="p-3 border-b border-slate-100 dark:border-[#263247] flex flex-col items-center gap-2">
            <div 
              className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-teal to-brand-indigo text-white flex items-center justify-center font-extrabold text-xs cursor-pointer"
              title={`Active: ${activePatient?.name || 'None'}`}
            >
              {activePatient?.name ? activePatient.name[0] : 'P'}
            </div>
            <button
              onClick={() => setAddPatientOpen(true)}
              className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-brand-indigo dark:text-indigo-400 hover:bg-indigo-100 transition-colors"
              title="Add New Patient"
            >
              <UserPlus className="w-4 h-4" />
            </button>
            {activePatient && (
              <button
                onClick={() => setDeleteModalOpen(true)}
                className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 hover:bg-red-100 transition-colors"
                title="Delete Patient"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Navigation Sections */}
        <div className="p-3 space-y-5">
          {NAV_SECTIONS.map((sec, sIdx) => (
            <div key={sIdx}>
              {!collapsed && (
                <div className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                  {sec.title}
                </div>
              )}
              <div className="space-y-1">
                {sec.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  
                  if (item.isEmergency) {
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavClick(item.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200 ${
                          isActive
                            ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                            : 'bg-red-50 dark:bg-red-950/40 hover:bg-red-100/80 dark:hover:bg-red-950/70 text-red-700 dark:text-red-400 border border-red-200/80 dark:border-red-900/60'
                        }`}
                        title={collapsed ? item.label : undefined}
                      >
                        <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-red-600 dark:text-red-400 animate-pulse'}`} />
                        {!collapsed && <span>{item.label}</span>}
                      </button>
                    );
                  }

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`relative w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                        isActive
                          ? 'bg-gradient-to-r from-brand-teal to-brand-indigo dark:from-[#2DD4BF] dark:to-[#818CF8] text-white dark:text-slate-950 shadow-md shadow-brand-indigo/25'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/80'
                      }`}
                      title={collapsed ? item.label : undefined}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? (isDark ? 'text-slate-950 font-black' : 'text-white') : 'text-slate-400 dark:text-slate-500'}`} />
                        {!collapsed && <span>{item.label}</span>}
                      </div>

                      {!collapsed && item.badge && (
                        <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md ${
                          isActive ? 'bg-white/20 text-white dark:text-slate-950' : 'bg-indigo-50 dark:bg-indigo-950/60 text-brand-indigo dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Footer: Theme Toggle & Demo Loader */}
      <div className="p-4 border-t border-slate-100 dark:border-[#263247] space-y-3 flex-shrink-0">
        
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-100 dark:bg-[#182235] border border-slate-200/80 dark:border-[#263247] text-xs font-extrabold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all"
          title="Toggle Light / Dark Mode"
        >
          <div className="flex items-center gap-2">
            {isDark ? (
              <Moon className="w-4 h-4 text-indigo-400" />
            ) : (
              <Sun className="w-4 h-4 text-amber-500" />
            )}
            {!collapsed && <span>{isDark ? 'Dark Mode' : 'Light Mode'}</span>}
          </div>
          {!collapsed && (
            <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-mono">
              {theme}
            </span>
          )}
        </button>

        {/* Demo Patient Loader */}
        {!collapsed && (
          <button
            onClick={handleDemoClick}
            disabled={isDemoLoading}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 hover:bg-indigo-100/80 dark:hover:bg-indigo-950/70 border border-indigo-200/80 dark:border-indigo-800 text-brand-indigo dark:text-indigo-400 text-xs font-extrabold transition-all shadow-sm disabled:opacity-50"
          >
            {isDemoLoading ? (
              <div className="w-3.5 h-3.5 border-2 border-indigo-600 dark:border-indigo-400 border-t-transparent rounded-full animate-spin" />
            ) : demoSuccess ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span>
              {isDemoLoading
                ? '✨ Loading Demo Health Story...'
                : demoSuccess
                ? '✓ Demo Patient Ready'
                : '✨ Load Demo Patient'}
            </span>
          </button>
        )}

        <div className={`text-[11px] text-slate-400 dark:text-slate-500 flex items-center ${collapsed ? 'justify-center' : 'justify-start'} gap-1.5 font-medium`}>
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          {!collapsed && <span>Patient data protected</span>}
        </div>
      </div>

    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className={`hidden lg:block h-[100dvh] sticky top-0 transition-all duration-300 z-30 overflow-hidden ${
        collapsed ? 'w-20' : 'w-72'
      }`}>
        {sidebarContent}
      </aside>

      {/* Mobile Animated Drawer Sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
            />

            {/* Sidebar Drawer */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-80 max-w-[85vw] h-[100dvh] z-10 overflow-hidden"
            >
              {sidebarContent}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add New Patient Multi-Step Modal */}
      <AddPatientModal
        isOpen={addPatientOpen}
        onClose={() => setAddPatientOpen(false)}
        onPatientCreated={(newPid) => {
          setActiveTab('dashboard');
        }}
      />

      {/* Delete Patient Confirmation Modal */}
      <AnimatePresence>
        {deleteModalOpen && activePatient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isDeletingPatient && setDeleteModalOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-white dark:bg-[#111827] rounded-3xl p-6 shadow-2xl border border-red-200/60 dark:border-red-950/80 z-10 space-y-4"
            >
              <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
                <div className="w-10 h-10 rounded-2xl bg-red-100 dark:bg-red-950/60 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Permanently Delete Patient?
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Patient Profile: <strong className="text-slate-900 dark:text-slate-100">{activePatient.name}</strong> (ID: {activePatient.id})
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-red-50/70 dark:bg-red-950/30 rounded-2xl border border-red-100 dark:border-red-900/40 text-xs text-red-900 dark:text-red-200 space-y-2">
                <p className="font-semibold">
                  This action will permanently delete all records associated with {activePatient.name}:
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-red-800 dark:text-red-300">
                  <li>Prescriptions & ingested medical documents</li>
                  <li>Active & superseded medications</li>
                  <li>Health timeline events & milestones</li>
                  <li>Laboratory & biomarker test readings</li>
                  <li>Reported symptoms & emergency triage logs</li>
                  <li>Demographics, allergies & emergency contact</li>
                </ul>
                <p className="text-[11px] font-bold text-red-600 dark:text-red-400 pt-1">
                  ⚠️ This prototype action cannot be undone.
                </p>
              </div>

              {deleteError && (
                <div className="p-3 rounded-xl bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{deleteError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setDeleteModalOpen(false)}
                  disabled={isDeletingPatient}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#182235] transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeletePatientConfirm}
                  disabled={isDeletingPatient}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs shadow-lg shadow-red-600/30 hover:opacity-95 disabled:opacity-50 transition-all"
                >
                  {isDeletingPatient ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Deleting Patient...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Delete Patient</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
