import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight, 
  Activity, 
  RefreshCw, 
  Info, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
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

export const Trends = () => {
  const { activePatientId, activePatient } = usePatient();
  const { isDark } = useTheme();
  const [trends, setTrends] = useState(null);
  const [selectedTest, setSelectedTest] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTrends = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getTrends(activePatientId);
      if (res.success) {
        setTrends(res);
      }
    } catch (err) {
      console.error('Failed to fetch trends:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrends();
  }, [activePatientId]);

  const shifts = trends?.shifts || [];
  const labs = trends?.labs || [];

  // Group trajectory data by date for multi-line Recharts
  const chartData = React.useMemo(() => {
    if (!trends?.trajectory_data || trends.trajectory_data.length === 0) return [];
    
    let filteredData = trends.trajectory_data;
    if (selectedTest !== 'All') {
      filteredData = filteredData.filter(d => d.test_name === selectedTest);
    }

    const dateMap = {};
    filteredData.forEach(item => {
      if (!dateMap[item.date]) {
        dateMap[item.date] = { date: item.date };
      }
      dateMap[item.date][item.test_name] = item.value;
    });

    return Object.values(dateMap).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [trends, selectedTest]);

  const uniqueTests = React.useMemo(() => {
    if (!trends?.trajectory_data) return [];
    return Array.from(new Set(trends.trajectory_data.map(d => d.test_name)));
  }, [trends]);

  const chartColors = ['#147D92', '#4F46E5', '#8B5CF6', '#06B6D4', '#EC4899', '#F59E0B'];
  const patientName = activePatient?.name || 'Patient';

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-[#F8FAFC] flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            Biomarker Trends & Trajectories
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Longitudinal laboratory measurements and factual shift tracking for <strong className="text-slate-700 dark:text-slate-200">{patientName}</strong>.
          </p>
        </div>
        <button
          onClick={fetchTrends}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-[#182235] border border-slate-200 dark:border-[#263247] text-xs font-bold text-slate-700 dark:text-[#F8FAFC] hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Safety Notice */}
      <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-[#182235] border border-indigo-100 dark:border-[#263247] flex items-start gap-3 transition-colors">
        <Info className="w-4 h-4 text-brand-indigo dark:text-indigo-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-indigo-900 dark:text-indigo-200 leading-relaxed">
          <strong>Informational Trend Analytics:</strong> Shifts represent factual arithmetic changes between consecutive lab measurements in stored records. Potential trends are highlighted to support informed clinician consultations without generating autonomous diagnoses.
        </p>
      </div>

      {/* 1. INFORMATIONAL BIOMARKER SHIFTS */}
      <div className="space-y-3">
        <h3 className="text-base font-extrabold text-slate-900 dark:text-[#F8FAFC]">
          Calculated Biomarker Shifts ({shifts.length})
        </h3>
        
        {shifts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {shifts.map((shift, idx) => {
              const isReduction = shift.delta !== null && shift.delta < 0;
              return (
                <motion.div
                  key={idx}
                  whileHover={{ y: -3 }}
                  className="bg-white dark:bg-[#111827] p-5 rounded-2xl border border-slate-200/80 dark:border-[#263247] shadow-card transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-[#182235] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#263247]">
                        {shift.category}
                      </span>
                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-[#F8FAFC] mt-2">{shift.test_name}</h4>
                    </div>
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                      shift.flag === 'HIGH' ? 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800' :
                      shift.flag === 'LOW' ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800' :
                      'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    }`}>
                      {shift.flag}
                    </span>
                  </div>

                  <div className="mt-4 flex items-baseline justify-between">
                    <div>
                      <div className="text-2xl font-extrabold text-slate-900 dark:text-[#F8FAFC]">
                        {shift.latest_value} <span className="text-xs font-normal text-slate-400 dark:text-slate-500">{shift.unit}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                        Recorded: {shift.latest_date}
                      </div>
                    </div>

                    <div className={`text-right font-extrabold text-xs flex items-center gap-0.5 ${
                      shift.delta === null ? 'text-slate-400 dark:text-slate-500' : isReduction ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                    }`}>
                      {shift.delta !== null ? (
                        <>
                          {isReduction ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                          <span>{shift.delta > 0 ? `+${shift.delta}` : shift.delta} ({shift.pct_change > 0 ? `+${shift.pct_change}` : shift.pct_change}%)</span>
                        </>
                      ) : (
                        'Baseline'
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white dark:bg-[#111827] p-8 rounded-2xl border border-slate-200 dark:border-[#263247] text-center text-xs text-slate-400 dark:text-slate-500 transition-colors">
            No consecutive lab records available to compute shifts.
          </div>
        )}
      </div>

      {/* 2. RECHARTS TIME-SERIES VISUALIZATION */}
      <div className="bg-white dark:bg-[#111827] p-6 rounded-2xl border border-slate-200/80 dark:border-[#263247] shadow-card transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-[#F8FAFC]">
              Longitudinal Trajectory Chart
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select specific biomarkers to visualize historic progression
            </p>
          </div>

          {/* Biomarker Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setSelectedTest('All')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedTest === 'All'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-[#182235] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              All Biomarkers
            </button>
            {uniqueTests.map((test) => (
              <button
                key={test}
                onClick={() => setSelectedTest(test)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedTest === test
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-[#182235] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                {test}
              </button>
            ))}
          </div>
        </div>

        {chartData.length > 0 ? (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#263247' : '#F1F5F9'} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: isDark ? '#A7B0C0' : '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: isDark ? '#A7B0C0' : '#64748B' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDark ? '#182235' : '#FFFFFF', 
                    borderColor: isDark ? '#263247' : '#E2E8F0', 
                    color: isDark ? '#F8FAFC' : '#172033',
                    borderRadius: '12px', 
                    fontSize: '11px', 
                    boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.5)' : '0 4px 12px rgba(0,0,0,0.05)' 
                  }} 
                  itemStyle={{ color: isDark ? '#F8FAFC' : '#172033' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px', color: isDark ? '#A7B0C0' : '#64748B' }} />
                {(selectedTest === 'All' ? uniqueTests : [selectedTest]).map((test, index) => (
                  <Line
                    key={test}
                    type="monotone"
                    dataKey={test}
                    stroke={chartColors[index % chartColors.length]}
                    strokeWidth={2.5}
                    dot={{ r: 4, strokeWidth: 2, fill: isDark ? '#111827' : '#FFFFFF' }}
                    activeDot={{ r: 6 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-center py-16 text-xs text-slate-400 dark:text-slate-500">
            No numeric measurements available for charting.
          </div>
        )}
      </div>

      {/* 3. MASTER LAB READINGS TABLE */}
      <div className="bg-white dark:bg-[#111827] p-6 rounded-2xl border border-slate-200/80 dark:border-[#263247] shadow-card transition-colors">
        <h3 className="text-base font-extrabold text-slate-900 dark:text-[#F8FAFC] mb-4">
          All Laboratory Records ({labs.length})
        </h3>

        {labs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-[#182235] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-[#263247]">
                <tr>
                  <th className="py-3 px-4">Biomarker</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Result Value</th>
                  <th className="py-3 px-4">Reference Range</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Measurement Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#263247] text-slate-700 dark:text-slate-300">
                {labs.map((lab, idx) => (
                  <tr key={lab.id || idx} className="hover:bg-slate-50/70 dark:hover:bg-[#182235]/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-[#F8FAFC]">{lab.test_name}</td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{lab.category || 'General'}</td>
                    <td className="py-3 px-4 font-extrabold text-slate-900 dark:text-[#F8FAFC]">
                      {lab.value} <span className="font-normal text-slate-400 dark:text-slate-500">{lab.unit}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400 font-mono">{lab.reference_range || '-'}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        lab.flag === 'HIGH' ? 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/60' :
                        lab.flag === 'LOW' ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60' :
                        'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60'
                      }`}>
                        {lab.flag || 'NORMAL'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{lab.test_date || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-xs text-slate-400 dark:text-slate-500">
            No lab measurements documented.
          </div>
        )}
      </div>

    </div>
  );
};

export default Trends;
