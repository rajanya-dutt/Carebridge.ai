import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Pill, 
  TrendingUp, 
  Clock, 
  Sparkles, 
  ChevronRight, 
  ShieldCheck, 
  Activity, 
  CheckCircle2, 
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Stethoscope,
  HeartPulse,
  Plus,
  ArrowRight
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid, 
  Legend 
} from 'recharts';
import { usePatient } from '../context/PatientContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';

export const Dashboard = ({ setActiveTab }) => {
  const { activePatientId, activePatient } = usePatient();
  const { isDark } = useTheme();
  const [stats, setStats] = useState(null);
  const [trends, setTrends] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [activeMeds, setActiveMeds] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentDate, setCurrentDate] = useState(() => new Date());

  // Dynamic Time-Based Greeting ticker
  useEffect(() => {
    const updateTimer = () => setCurrentDate(new Date());
    const interval = setInterval(updateTimer, 60000);
    window.addEventListener('focus', updateTimer);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', updateTimer);
    };
  }, []);

  const getDynamicGreeting = () => {
    const hour = currentDate.getHours();
    let greetingWord = 'Good morning';
    if (hour >= 5 && hour < 12) {
      greetingWord = 'Good morning';
    } else if (hour >= 12 && hour < 17) {
      greetingWord = 'Good afternoon';
    } else if (hour >= 17 && hour < 21) {
      greetingWord = 'Good evening';
    } else {
      greetingWord = 'Good night';
    }

    const name = activePatient?.name?.trim();
    if (name) {
      const firstName = name.split(' ')[0];
      return `${greetingWord}, ${firstName} 👋`;
    }
    return `${greetingWord} 👋`;
  };

  useEffect(() => {
    let isMounted = true;
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [statsRes, trendsRes, timelineRes, medsRes, docsRes] = await Promise.all([
          api.getDashboardStats(activePatientId),
          api.getTrends(activePatientId),
          api.getTimeline(activePatientId),
          api.getMedications(activePatientId),
          api.getDocuments(activePatientId)
        ]);

        if (isMounted) {
          if (statsRes.success) setStats(statsRes.stats);
          if (trendsRes.success) setTrends(trendsRes);
          if (timelineRes.success) setTimeline(timelineRes.timeline || []);
          if (medsRes.success) setActiveMeds(medsRes.active_medications || []);
          if (docsRes.success) setDocuments(docsRes.documents || []);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error fetching dashboard data:', err);
          setError(err.message);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDashboardData();
    return () => { isMounted = false; };
  }, [activePatientId]);

  const patientName = activePatient?.name || 'Patient';

  // Prepare chart data from trends
  const chartData = React.useMemo(() => {
    if (!trends?.trajectory_data || trends.trajectory_data.length === 0) return [];
    const dateMap = {};
    trends.trajectory_data.forEach(item => {
      if (!dateMap[item.date]) {
        dateMap[item.date] = { date: item.date };
      }
      dateMap[item.date][item.test_name] = item.value;
    });
    return Object.values(dateMap).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [trends]);

  const testNames = React.useMemo(() => {
    if (!trends?.trajectory_data) return [];
    return Array.from(new Set(trends.trajectory_data.map(d => d.test_name))).slice(0, 2);
  }, [trends]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
      
      {/* 1. HERO BANNER */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-teal via-brand-indigo to-indigo-900 text-white p-7 sm:p-9 lg:p-10 shadow-2xl shadow-indigo-950/15"
      >
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 -mb-10 w-48 h-48 bg-teal-400/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-white text-[11px] font-extrabold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>AI Health Story Connected</span>
            </div>
            
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
              {getDynamicGreeting()}
            </h1>
            
            <p className="text-xs sm:text-sm text-indigo-100/90 leading-relaxed">
              Your longitudinal medical records, prescriptions, and biomarker shifts are securely synchronized for <strong className="text-white">{patientName}</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setActiveTab && setActiveTab('doctor-brief')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white text-brand-indigo dark:text-slate-950 font-black text-xs shadow-lg hover:bg-indigo-50 active:scale-95 transition-all"
            >
              <Stethoscope className="w-4 h-4 text-brand-indigo" />
              <span>Generate Doctor Brief</span>
            </button>
            <button
              onClick={() => setActiveTab && setActiveTab('documents')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 text-white font-bold text-xs hover:bg-white/25 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Upload Document</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* 2. HEALTH SNAPSHOT METRICS CARDS */}
      <div>
        <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
          HEALTH SNAPSHOT
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Documents Card */}
          <motion.div
            whileHover={{ y: -3 }}
            onClick={() => setActiveTab && setActiveTab('documents')}
            className="p-5 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-[#263247] shadow-card hover:shadow-lg transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-brand-teal dark:text-[#2DD4BF] flex items-center justify-center font-bold">
                <FileText className="w-5 h-5" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-brand-teal group-hover:translate-x-0.5 transition-all" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-3">
              {stats?.total_documents ?? documents.length}
            </div>
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Ingested Documents
            </div>
            <div className="text-[10px] text-teal-600 dark:text-teal-400 font-bold mt-1">
              Multi-format synced
            </div>
          </motion.div>

          {/* Current Medications */}
          <motion.div
            whileHover={{ y: -3 }}
            onClick={() => setActiveTab && setActiveTab('medications')}
            className="p-5 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-[#263247] shadow-card hover:shadow-lg transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <Pill className="w-5 h-5" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-3">
              {activeMeds.length}
            </div>
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Active Medications
            </div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">
              Active regimen current
            </div>
          </motion.div>

          {/* Health Trends */}
          <motion.div
            whileHover={{ y: -3 }}
            onClick={() => setActiveTab && setActiveTab('trends')}
            className="p-5 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-[#263247] shadow-card hover:shadow-lg transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-brand-indigo dark:text-indigo-400 flex items-center justify-center font-bold">
                <TrendingUp className="w-5 h-5" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-brand-indigo group-hover:translate-x-0.5 transition-all" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-3">
              {trends?.shifts?.length || 0}
            </div>
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Biomarkers Tracked
            </div>
            <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold mt-1">
              Longitudinal tracking
            </div>
          </motion.div>

          {/* Recent Updates */}
          <motion.div
            whileHover={{ y: -3 }}
            onClick={() => setActiveTab && setActiveTab('timeline')}
            className="p-5 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-[#263247] shadow-card hover:shadow-lg transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                <Clock className="w-5 h-5" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-purple-500 group-hover:translate-x-0.5 transition-all" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-3">
              {timeline.length}
            </div>
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Milestones Logged
            </div>
            <div className="text-[10px] text-purple-600 dark:text-purple-400 font-bold mt-1">
              Latest: {timeline[0]?.event_date || 'Recent'}
            </div>
          </motion.div>

        </div>
      </div>

      {/* 3. DUAL SECTION: BIOMARKER TRENDS + CURRENT MEDICATIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Health Trends Chart (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-[#111827] p-6 sm:p-7 rounded-3xl border border-slate-200/80 dark:border-[#263247] shadow-card space-y-4 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-[#F8FAFC] flex items-center gap-2">
                <Activity className="w-5 h-5 text-brand-teal" />
                <span>Biomarker Trajectory & Trends</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Longitudinal shift analysis across recent reports
              </p>
            </div>
            <button
              onClick={() => setActiveTab && setActiveTab('trends')}
              className="text-xs font-bold text-brand-teal dark:text-[#2DD4BF] hover:underline flex items-center gap-0.5"
            >
              <span>Full Analytics</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-64 w-full pt-2">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="trendTeal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0F8B8D" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#0F8B8D" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="trendIndigo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#263247" : "#E2E8F0"} />
                  <XAxis dataKey="date" stroke={isDark ? "#94A3B8" : "#64748B"} fontSize={11} />
                  <YAxis stroke={isDark ? "#94A3B8" : "#64748B"} fontSize={11} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: isDark ? "#182235" : "#FFFFFF",
                      borderColor: isDark ? "#263247" : "#CBD5E1",
                      borderRadius: "16px",
                      fontSize: "12px",
                      fontWeight: "bold"
                    }}
                  />
                  {testNames.map((test, idx) => (
                    <Area 
                      key={test}
                      type="monotone" 
                      dataKey={test} 
                      stroke={idx === 0 ? "#0F8B8D" : "#4F46E5"} 
                      fillOpacity={1} 
                      fill={idx === 0 ? "url(#trendTeal)" : "url(#trendIndigo)"} 
                      strokeWidth={3}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Upload clinical reports to generate biomarker curves.
              </div>
            )}
          </div>
        </div>

        {/* Right: Current Active Medications (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-[#111827] p-6 sm:p-7 rounded-3xl border border-slate-200/80 dark:border-[#263247] shadow-card space-y-4 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-[#F8FAFC] flex items-center gap-2">
                <Pill className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>Current Medications</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Active therapeutic regimen
              </p>
            </div>
            <button
              onClick={() => setActiveTab && setActiveTab('medications')}
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {activeMeds.length > 0 ? (
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {activeMeds.map((med, idx) => (
                <div 
                  key={idx}
                  className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 flex items-center justify-between"
                >
                  <div>
                    <div className="font-extrabold text-xs text-slate-900 dark:text-emerald-100">{med.name}</div>
                    <div className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                      {med.dosage || 'Dosage as directed'} • {med.frequency || 'Daily'}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-emerald-600 text-white">
                    ACTIVE
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-500">
              No active medications documented for {patientName}.
            </div>
          )}
        </div>

      </div>

      {/* 4. HEALTH STORY TIMELINE PREVIEW */}
      <div className="bg-white dark:bg-[#111827] p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-[#263247] shadow-card space-y-4 transition-colors">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-[#F8FAFC] flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span>Longitudinal Health Story</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Chronological milestones and clinical encounters
            </p>
          </div>
          <button
            onClick={() => setActiveTab && setActiveTab('timeline')}
            className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-0.5"
          >
            <span>Full Timeline</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {timeline.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {timeline.slice(0, 3).map((event, idx) => (
              <div 
                key={idx}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-[#182235] border border-slate-100 dark:border-[#263247] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-extrabold uppercase mb-1">
                    <span>{event.event_date || 'Recent Date'}</span>
                    <span className="text-teal-600 dark:text-teal-400 font-bold">{event.event_type || 'Milestone'}</span>
                  </div>
                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">
                    {event.title || 'Clinical Encounter'}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">
                    {event.description || 'Medical encounter recorded in longitudinal profile.'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-slate-400">
            No timeline milestones yet.
          </div>
        )}
      </div>

    </div>
  );
};

export default Dashboard;
