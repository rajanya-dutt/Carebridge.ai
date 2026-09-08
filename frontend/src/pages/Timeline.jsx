import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Clock, 
  Filter, 
  Calendar, 
  Stethoscope, 
  Pill, 
  FileText, 
  Activity, 
  CheckCircle2, 
  RefreshCw,
  Search
} from 'lucide-react';
import { usePatient } from '../context/PatientContext';
import api from '../services/api';

const CATEGORY_COLORS = {
  Encounter: { 
    bg: 'bg-teal-50 dark:bg-teal-950/50', 
    text: 'text-teal-700 dark:text-teal-300', 
    border: 'border-teal-200 dark:border-teal-800', 
    dot: 'bg-brand-teal dark:bg-[#2DD4BF]' 
  },
  Medication: { 
    bg: 'bg-emerald-50 dark:bg-emerald-950/50', 
    text: 'text-emerald-700 dark:text-emerald-300', 
    border: 'border-emerald-200 dark:border-emerald-800', 
    dot: 'bg-emerald-500' 
  },
  Lab: { 
    bg: 'bg-purple-50 dark:bg-purple-950/50', 
    text: 'text-purple-700 dark:text-purple-300', 
    border: 'border-purple-200 dark:border-purple-800', 
    dot: 'bg-purple-500' 
  },
  Diagnosis: { 
    bg: 'bg-amber-50 dark:bg-amber-950/50', 
    text: 'text-amber-700 dark:text-amber-300', 
    border: 'border-amber-200 dark:border-amber-800', 
    dot: 'bg-amber-500' 
  },
  General: { 
    bg: 'bg-indigo-50 dark:bg-indigo-950/50', 
    text: 'text-indigo-700 dark:text-indigo-300', 
    border: 'border-indigo-200 dark:border-indigo-800', 
    dot: 'bg-brand-indigo dark:bg-[#818CF8]' 
  },
};

export const Timeline = () => {
  const { activePatientId, activePatient } = usePatient();
  const [timeline, setTimeline] = useState([]);
  const [filteredTimeline, setFilteredTimeline] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTimeline = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getTimeline(activePatientId);
      if (res.success) {
        setTimeline(res.timeline || []);
      }
    } catch (err) {
      console.error('Failed to fetch timeline:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeline();
  }, [activePatientId]);

  // Filter logic
  useEffect(() => {
    let result = timeline;
    if (selectedCategory !== 'All') {
      result = result.filter(e => (e.category || '').toLowerCase() === selectedCategory.toLowerCase());
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(e => 
        (e.title || '').toLowerCase().includes(q) || 
        (e.description || '').toLowerCase().includes(q)
      );
    }
    setFilteredTimeline(result);
  }, [timeline, selectedCategory, searchTerm]);

  const categories = ['All', ...Array.from(new Set(timeline.map(e => e.category || 'General')))];
  const patientName = activePatient?.name || 'Patient';

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-[#F8FAFC] flex items-center gap-2">
            <Clock className="w-6 h-6 text-brand-indigo dark:text-[#818CF8]" />
            Longitudinal Health Timeline
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Chronological clinical events and encounters for <strong className="text-slate-700 dark:text-slate-200">{patientName}</strong>.
          </p>
        </div>
        <button
          onClick={fetchTimeline}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-[#182235] border border-slate-200 dark:border-[#263247] text-xs font-bold text-slate-700 dark:text-[#F8FAFC] hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-[#111827] p-4 rounded-2xl border border-slate-200/80 dark:border-[#263247] shadow-card flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <Filter className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-brand-indigo dark:bg-[#818CF8] text-white dark:text-slate-950 shadow-sm'
                  : 'bg-slate-100 dark:bg-[#182235] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search milestones..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-[#182235] border border-slate-200 dark:border-[#263247] rounded-xl text-xs font-medium text-slate-800 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-indigo/30"
          />
        </div>
      </div>

      {/* Timeline Stream */}
      <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-brand-teal before:via-brand-indigo before:to-purple-300 dark:before:from-[#2DD4BF] dark:before:via-[#818CF8] dark:before:to-purple-500">
        {filteredTimeline.length > 0 ? (
          filteredTimeline.map((item, index) => {
            const cat = item.category || 'General';
            const style = CATEGORY_COLORS[cat] || CATEGORY_COLORS.General;

            return (
              <motion.div
                key={item.id || index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="relative"
              >
                {/* Timeline node dot */}
                <div className={`absolute -left-6 sm:-left-8 top-4 w-4 h-4 rounded-full border-2 border-white dark:border-[#0B1020] ${style.dot} shadow-md`} />

                {/* Milestone Card */}
                <div className="bg-white dark:bg-[#111827] p-5 rounded-2xl border border-slate-200/80 dark:border-[#263247] shadow-card hover:shadow-card-hover transition-all">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${style.bg} ${style.text} border ${style.border}`}>
                        {cat}
                      </span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                        {item.event_date || 'Date unspecified'}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-[#F8FAFC] mb-1">
                    {item.title}
                  </h3>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="bg-white dark:bg-[#111827] p-12 rounded-2xl border border-slate-200 dark:border-[#263247] text-center text-xs text-slate-400 dark:text-slate-500 transition-colors">
            No clinical timeline events found matching your criteria.
          </div>
        )}
      </div>

    </div>
  );
};

export default Timeline;
