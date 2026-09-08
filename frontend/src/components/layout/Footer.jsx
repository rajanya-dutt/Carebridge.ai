import React from 'react';
import { ShieldCheck, Database, Award } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 mt-12 mb-8">
      <div className="bg-white/70 dark:bg-[#111827]/70 backdrop-blur-md border border-slate-200/80 dark:border-[#263247] rounded-2xl p-4 sm:p-5 text-center text-xs text-slate-500 dark:text-slate-400 shadow-sm transition-colors duration-300">
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 mb-3 font-semibold text-slate-700 dark:text-slate-300">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Strict Patient Data Isolation</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Database className="w-4 h-4 text-brand-indigo dark:text-indigo-400" />
            <span>Local SQLite Persistence Engine</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Award className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            <span>Health Tech Innovation Track</span>
          </div>
        </div>
        <p className="max-w-3xl mx-auto leading-relaxed text-slate-400 dark:text-slate-500 text-[11px]">
          🔒 <strong>CAREBRIDGE Clinical Safety Notice:</strong> This AI continuity platform organizes, structures, and translates verified longitudinal health records. It does not replace licensed medical practitioners, diagnose illnesses, or modify prescriptions autonomously.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
