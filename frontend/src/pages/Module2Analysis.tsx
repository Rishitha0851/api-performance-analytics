import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  GitCommit,
  AlertTriangle,
  RotateCcw,
  Sliders,
  CheckCircle,
  HelpCircle,
  Activity,
  Layers,
  ArrowRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { apiService } from '../services/api';
import {
  MetricRecord,
  DescriptiveStatistics,
  CorrelationAnalysisResponse,
  BottleneckFinding,
} from '../types/api';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface Module2AnalysisProps {
  records: MetricRecord[];
  onRefreshRecords: () => void;
}

export const Module2Analysis: React.FC<Module2AnalysisProps> = ({ records }) => {
  const [activeTab, setActiveTab] = useState<'descriptive' | 'correlation' | 'trends' | 'bottlenecks'>('descriptive');

  // Loading states
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [statsData, setStatsData] = useState<DescriptiveStatistics | null>(null);

  const [isLoadingCorr, setIsLoadingCorr] = useState(false);
  const [corrData, setCorrData] = useState<CorrelationAnalysisResponse | null>(null);

  const [isLoadingBottlenecks, setIsLoadingBottlenecks] = useState(false);
  const [bottlenecks, setBottlenecks] = useState<BottleneckFinding[]>([]);

  // Configurable thresholds for Bottleneck tab
  const [rtThreshold, setRtThreshold] = useState(1000);
  const [cpuThreshold, setCpuThreshold] = useState(80);
  const [memThreshold, setMemThreshold] = useState(85);
  const [errorThreshold, setErrorThreshold] = useState(5);

  // Selected metric for descriptive stats view
  const [selectedStatMetric, setSelectedStatMetric] = useState<string>('response_time_ms');

  // Load analytical data from FastAPI backend
  const fetchAllAnalytics = async () => {
    setIsLoadingStats(true);
    setIsLoadingCorr(true);
    setIsLoadingBottlenecks(true);

    try {
      // 1. Descriptive stats - backend analyzes SQLite directly
      const statsRes = await apiService.getDescriptiveStats();
      if (statsRes && statsRes.statistics) {
        setStatsData(statsRes.statistics);
      }

      // 2. Correlation matrix - computed natively in Python
      const corrRes = await apiService.getCorrelationAnalysis();
      if (corrRes && !corrRes.error) {
        setCorrData(corrRes);
      }

      // 3. Bottlenecks
      const bRes = await apiService.getBottlenecks({
        rt_threshold_ms: rtThreshold,
        cpu_threshold_pct: cpuThreshold,
        mem_threshold_pct: memThreshold,
        error_threshold_pct: errorThreshold,
      });
      setBottlenecks(bRes.findings || []);
    } catch (err) {
      console.error('Error fetching analytics from backend:', err);
    } finally {
      setIsLoadingStats(false);
      setIsLoadingCorr(false);
      setIsLoadingBottlenecks(false);
    }
  };

  useEffect(() => {
    fetchAllAnalytics();
  }, [records]);

  const handleReevaluateBottlenecks = async () => {
    setIsLoadingBottlenecks(true);
    try {
      const bRes = await apiService.getBottlenecks({
        rt_threshold_ms: rtThreshold,
        cpu_threshold_pct: cpuThreshold,
        mem_threshold_pct: memThreshold,
        error_threshold_pct: errorThreshold,
      });
      setBottlenecks(bRes.findings || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingBottlenecks(false);
    }
  };

  // Metric label display mapping
  const metricDisplayNames: Record<string, string> = {
    response_time_ms: 'Response Time (ms)',
    request_frequency: 'Request Frequency (req/s)',
    cpu_usage: 'CPU Utilization (%)',
    memory_usage: 'Memory Utilization (%)',
  };

  // Trend data sample
  const trendChartData = records
    .filter((_, i) => i % Math.max(1, Math.floor(records.length / 40)) === 0)
    .map((r, i) => ({
      idx: i + 1,
      time: r.timestamp ? r.timestamp.split(' ')[1] : `#${i + 1}`,
      latency: Math.round(r.response_time_ms),
      frequency: Math.round(r.request_frequency || 1),
      cpu: Math.round(r.cpu_usage),
      memory: Math.round(r.memory_usage),
      workload: r.workload || 'Trace',
    }));

  return (
    <div className="space-y-6">
      {/* Module 2 Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-50 text-violet-700 text-xs font-bold uppercase tracking-wider mb-2 border border-violet-200">
              <BarChart3 className="w-3.5 h-3.5" /> Module 2 Academic Specification
            </div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
              Statistical Analysis & Bottleneck Identification
            </h2>
            <p className="text-xs md:text-sm text-slate-500 mt-1">
              Rigorous parametric and non-parametric calculations, bivariate correlation matrices, and automated threshold bottleneck detection.
            </p>
          </div>

          {/* Module 2 Sub-Tab Navigation */}
          <div className="flex flex-wrap p-1 bg-slate-100/80 rounded-xl border border-slate-200/80">
            <button
              onClick={() => setActiveTab('descriptive')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'descriptive'
                  ? 'bg-white text-violet-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" /> Descriptive Statistics
            </button>
            <button
              onClick={() => setActiveTab('correlation')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'correlation'
                  ? 'bg-white text-violet-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GitCommit className="w-3.5 h-3.5" /> Correlation Matrix
            </button>
            <button
              onClick={() => setActiveTab('trends')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'trends'
                  ? 'bg-white text-violet-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" /> Performance Trends
            </button>
            <button
              onClick={() => setActiveTab('bottlenecks')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'bottlenecks'
                  ? 'bg-white text-violet-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" /> Bottleneck Detector
            </button>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------------------------- */}
      {/* SECTION A: DESCRIPTIVE STATISTICS                                                */}
      {/* -------------------------------------------------------------------------------- */}
      {activeTab === 'descriptive' && (
        <div className="space-y-6">
          {isLoadingStats ? (
            <div className="bg-white p-12 rounded-xl border border-slate-200 shadow-card">
              <LoadingSpinner message="Calculating Mean, Variance, IQR & Percentiles in Python..." />
            </div>
          ) : statsData ? (
            <>
              {/* Metric Selector Pills */}
              <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-card flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Inspect Dimension:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.keys(statsData).map((col) => (
                      <button
                        key={col}
                        onClick={() => setSelectedStatMetric(col)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          selectedStatMetric === col
                            ? 'bg-violet-600 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {metricDisplayNames[col] || col}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="text-xs text-slate-400 font-mono">
                  Sample Population: {records.length} records
                </div>
              </div>

              {/* Statistical Cards Grid for Selected Metric */}
              {statsData[selectedStatMetric] && (
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                  <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-card">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase">Arithmetic Mean</span>
                    <p className="text-2xl font-bold text-slate-900 mt-1 font-mono">
                      {statsData[selectedStatMetric].mean}
                    </p>
                    <span className="text-[10px] text-slate-400 mt-1 block">Expected value (μ)</span>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-card">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase">Median (P50)</span>
                    <p className="text-2xl font-bold text-violet-700 mt-1 font-mono">
                      {statsData[selectedStatMetric].median}
                    </p>
                    <span className="text-[10px] text-slate-400 mt-1 block">50th percentile midpoint</span>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-card">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase">Mode</span>
                    <p className="text-2xl font-bold text-slate-900 mt-1 font-mono">
                      {statsData[selectedStatMetric].mode}
                    </p>
                    <span className="text-[10px] text-slate-400 mt-1 block">Most frequent value</span>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-card">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase">Std Deviation (σ)</span>
                    <p className="text-2xl font-bold text-slate-900 mt-1 font-mono">
                      {statsData[selectedStatMetric].std}
                    </p>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Variance: {statsData[selectedStatMetric].variance}
                    </span>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-card">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase">IQR (Q3 - Q1)</span>
                    <p className="text-2xl font-bold text-cyan-700 mt-1 font-mono">
                      {statsData[selectedStatMetric].iqr}
                    </p>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Q1: {statsData[selectedStatMetric].q1} | Q3: {statsData[selectedStatMetric].q3}
                    </span>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-card">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase">Min / Max (Range)</span>
                    <p className="text-lg font-bold text-slate-900 mt-1 font-mono">
                      {statsData[selectedStatMetric].min} - {statsData[selectedStatMetric].max}
                    </p>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Span: {statsData[selectedStatMetric].range}
                    </span>
                  </div>
                </div>
              )}

              {/* Percentiles Bar & Comprehensive Comparison Table */}
              <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-card">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">
                      Parametric & Non-Parametric Metric Comparison
                    </h3>
                    <p className="text-xs text-slate-400">
                      Standard academic statistical distribution matrix across all 4 key system metrics
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    SciPy & NumPy Engine
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                        <th className="py-2.5 px-3">Metric Dimension</th>
                        <th className="py-2.5 px-3">Mean (μ)</th>
                        <th className="py-2.5 px-3">Median</th>
                        <th className="py-2.5 px-3">Mode</th>
                        <th className="py-2.5 px-3">Std Dev (σ)</th>
                        <th className="py-2.5 px-3">Variance</th>
                        <th className="py-2.5 px-3">Min</th>
                        <th className="py-2.5 px-3">Max</th>
                        <th className="py-2.5 px-3">Q1 (25%)</th>
                        <th className="py-2.5 px-3">Q3 (75%)</th>
                        <th className="py-2.5 px-3 font-bold text-violet-700">IQR</th>
                        <th className="py-2.5 px-3">P90</th>
                        <th className="py-2.5 px-3 font-bold text-blue-700">P95</th>
                        <th className="py-2.5 px-3 font-bold text-rose-700">P99</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {Object.entries(statsData).map(([col, s]) => (
                        <tr key={col} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3 font-sans font-bold text-slate-800">
                            {metricDisplayNames[col] || col}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">{s.mean}</td>
                          <td className="py-2.5 px-3 font-semibold text-violet-700">{s.median}</td>
                          <td className="py-2.5 px-3 text-slate-600">{s.mode}</td>
                          <td className="py-2.5 px-3 text-slate-600">{s.std}</td>
                          <td className="py-2.5 px-3 text-slate-500">{s.variance}</td>
                          <td className="py-2.5 px-3 text-slate-600">{s.min}</td>
                          <td className="py-2.5 px-3 text-slate-600">{s.max}</td>
                          <td className="py-2.5 px-3 text-slate-600">{s.q1}</td>
                          <td className="py-2.5 px-3 text-slate-600">{s.q3}</td>
                          <td className="py-2.5 px-3 font-bold text-violet-700">{s.iqr}</td>
                          <td className="py-2.5 px-3 text-slate-700">{s.p90}</td>
                          <td className="py-2.5 px-3 font-bold text-blue-700">{s.p95}</td>
                          <td className="py-2.5 px-3 font-bold text-rose-700">{s.p99}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500 text-xs">
              No telemetry records found. Seed the sample dataset from the top bar to inspect descriptive statistics.
            </div>
          )}
        </div>
      )}

      {/* -------------------------------------------------------------------------------- */}
      {/* SECTION B: CORRELATION ANALYSIS & HEATMAP                                        */}
      {/* -------------------------------------------------------------------------------- */}
      {activeTab === 'correlation' && (
        <div className="space-y-6">
          {isLoadingCorr ? (
            <div className="bg-white p-12 rounded-xl border border-slate-200 shadow-card">
              <LoadingSpinner message="Evaluating Pearson (linear) and Spearman (monotonic) rank correlations..." />
            </div>
          ) : corrData && corrData.pearson_matrix ? (
            <>
              {/* Correlation Heatmaps Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pearson Heatmap */}
                <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-card">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">
                        Pearson Correlation Matrix (r)
                      </h3>
                      <p className="text-xs text-slate-400">
                        Measures linear bivariate correlation between continuous variables (-1 to +1)
                      </p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      Linear
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-center text-xs border-collapse font-mono">
                      <thead>
                        <tr>
                          <th className="py-2 px-2 text-left font-sans text-slate-400">Metric</th>
                          {corrData.columns.map((c) => (
                            <th key={c} className="py-2 px-2 font-sans font-semibold text-slate-700">
                              {c.replace('_ms', '').replace('_usage', '')}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {corrData.columns.map((rowCol) => (
                          <tr key={rowCol} className="border-t border-slate-100">
                            <td className="py-3 px-2 text-left font-sans font-semibold text-slate-700">
                              {rowCol.replace('_ms', '').replace('_usage', '')}
                            </td>
                            {corrData.columns.map((colCol) => {
                              const val = corrData.pearson_matrix[rowCol]?.[colCol] ?? 0;
                              // Dynamic color styling for SaaS heatmap
                              const absVal = Math.abs(val);
                              let bg = 'bg-slate-50 text-slate-700';
                              if (val === 1.0) {
                                bg = 'bg-blue-600 text-white font-bold';
                              } else if (val > 0.6) {
                                bg = 'bg-indigo-500 text-white font-bold';
                              } else if (val > 0.3) {
                                bg = 'bg-indigo-100 text-indigo-900 font-semibold';
                              } else if (val < -0.3) {
                                bg = 'bg-rose-100 text-rose-900 font-semibold';
                              }
                              return (
                                <td key={colCol} className="py-3 px-2">
                                  <div className={`py-1 px-2 rounded-lg text-xs ${bg}`}>
                                    {val.toFixed(2)}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Spearman Rank Heatmap */}
                <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-card">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">
                        Spearman Rank Correlation (ρ)
                      </h3>
                      <p className="text-xs text-slate-400">
                        Measures monotonic relationship regardless of linearity (robust to outliers)
                      </p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200">
                      Nonparametric
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-center text-xs border-collapse font-mono">
                      <thead>
                        <tr>
                          <th className="py-2 px-2 text-left font-sans text-slate-400">Metric</th>
                          {corrData.columns.map((c) => (
                            <th key={c} className="py-2 px-2 font-sans font-semibold text-slate-700">
                              {c.replace('_ms', '').replace('_usage', '')}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {corrData.columns.map((rowCol) => (
                          <tr key={rowCol} className="border-t border-slate-100">
                            <td className="py-3 px-2 text-left font-sans font-semibold text-slate-700">
                              {rowCol.replace('_ms', '').replace('_usage', '')}
                            </td>
                            {corrData.columns.map((colCol) => {
                              const val = corrData.spearman_matrix[rowCol]?.[colCol] ?? 0;
                              let bg = 'bg-slate-50 text-slate-700';
                              if (val === 1.0) {
                                bg = 'bg-violet-600 text-white font-bold';
                              } else if (val > 0.6) {
                                bg = 'bg-violet-500 text-white font-bold';
                              } else if (val > 0.3) {
                                bg = 'bg-violet-100 text-violet-900 font-semibold';
                              } else if (val < -0.3) {
                                bg = 'bg-rose-100 text-rose-900 font-semibold';
                              }
                              return (
                                <td key={colCol} className="py-3 px-2">
                                  <div className={`py-1 px-2 rounded-lg text-xs ${bg}`}>
                                    {val.toFixed(2)}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Academic Pairwise Analysis Cards */}
              <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-card">
                <h3 className="text-sm font-bold text-slate-800 mb-1">
                  Empirical Pairwise Association & Technical Interpretation
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Statistical hypothesis evaluation with p-values and system queueing analysis
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {corrData.pairwise_analysis &&
                    corrData.pairwise_analysis.map((p, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="text-xs font-bold text-slate-800">{p.label}</h4>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              p.significance.includes('Significant')
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {p.significance}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 my-2 font-mono text-xs">
                          <div className="p-2 bg-white rounded-lg border border-slate-200">
                            <span className="text-[10px] text-slate-400 block font-sans">Pearson r:</span>
                            <span className="font-bold text-blue-700">{p.pearson_r}</span>
                            <span className="text-[10px] text-slate-400 block">p = {p.pearson_p < 0.001 ? '<0.001' : p.pearson_p.toFixed(3)}</span>
                          </div>
                          <div className="p-2 bg-white rounded-lg border border-slate-200">
                            <span className="text-[10px] text-slate-400 block font-sans">Spearman ρ:</span>
                            <span className="font-bold text-violet-700">{p.spearman_rho}</span>
                            <span className="text-[10px] text-slate-400 block">p = {p.spearman_p < 0.001 ? '<0.001' : p.spearman_p.toFixed(3)}</span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                          {p.impact_explanation}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500 text-xs">
              Insufficient records for correlation matrix. Minimum 3 records required.
            </div>
          )}
        </div>
      )}

      {/* -------------------------------------------------------------------------------- */}
      {/* SECTION C: PERFORMANCE TRENDS                                                    */}
      {/* -------------------------------------------------------------------------------- */}
      {activeTab === 'trends' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Multivariable Performance Degradation Trajectory
                </h3>
                <p className="text-xs text-slate-400">
                  Tracking response time, invocation frequency, and CPU utilization across load increments
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold">
                <span className="flex items-center gap-1 text-blue-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span> Latency (ms)
                </span>
                <span className="flex items-center gap-1 text-cyan-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-600"></span> Frequency (req/s)
                </span>
                <span className="flex items-center gap-1 text-indigo-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span> CPU %
                </span>
                <span className="flex items-center gap-1 text-teal-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-500"></span> Memory %
                </span>
              </div>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="idx" tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200 text-xs">
                            <p className="font-bold text-slate-800">Observation #{d.idx}</p>
                            <p className="text-blue-600 font-semibold mt-1">Latency: {d.latency} ms</p>
                            <p className="text-cyan-600 font-semibold">Frequency: {d.frequency} req/s</p>
                            <p className="text-indigo-600 font-semibold">CPU: {d.cpu}%</p>
                            <p className="text-teal-600 font-semibold">Memory: {d.memory}%</p>
                            <p className="text-slate-400 mt-1">Workload Stage: {d.workload}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line type="monotone" dataKey="latency" stroke="#2563eb" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="frequency" stroke="#06b6d4" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="cpu" stroke="#6366f1" strokeWidth={2} strokeDasharray="3 3" dot={false} />
                  <Line type="monotone" dataKey="memory" stroke="#14b8a6" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------------- */}
      {/* SECTION D: BOTTLENECK IDENTIFICATION                                             */}
      {/* -------------------------------------------------------------------------------- */}
      {activeTab === 'bottlenecks' && (
        <div className="space-y-6">
          {/* Threshold Sliders Card */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-violet-600" /> Academic Bottleneck Threshold Configuration
                </h3>
                <p className="text-xs text-slate-400">
                  Adjust Service Level Agreement (SLA) boundaries and trigger automated analytical detection
                </p>
              </div>

              <button
                onClick={handleReevaluateBottlenecks}
                disabled={isLoadingBottlenecks}
                className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs tracking-wide shadow-sm transition-all flex items-center gap-1.5 self-start sm:self-auto disabled:opacity-50"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isLoadingBottlenecks ? 'animate-spin' : ''}`} />
                {isLoadingBottlenecks ? 'Re-evaluating...' : 'Re-evaluate Findings'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-slate-700">Latency Threshold</label>
                  <span className="text-xs font-bold text-blue-600 font-mono">{rtThreshold} ms</span>
                </div>
                <input
                  type="range"
                  min="200"
                  max="3000"
                  step="50"
                  value={rtThreshold}
                  onChange={(e) => setRtThreshold(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <p className="text-[10px] text-slate-400 mt-1">SLA Latency Ceiling</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-slate-700">CPU Saturation</label>
                  <span className="text-xs font-bold text-indigo-600 font-mono">{cpuThreshold}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="95"
                  step="5"
                  value={cpuThreshold}
                  onChange={(e) => setCpuThreshold(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <p className="text-[10px] text-slate-400 mt-1">Host CPU Warning Limit</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-slate-700">Memory Pressure</label>
                  <span className="text-xs font-bold text-cyan-600 font-mono">{memThreshold}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="95"
                  step="5"
                  value={memThreshold}
                  onChange={(e) => setMemThreshold(Number(e.target.value))}
                  className="w-full accent-cyan-600 cursor-pointer"
                />
                <p className="text-[10px] text-slate-400 mt-1">RAM Capacity Limit</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-slate-700">Error Tolerance</label>
                  <span className="text-xs font-bold text-rose-600 font-mono">{errorThreshold}%</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="1"
                  value={errorThreshold}
                  onChange={(e) => setErrorThreshold(Number(e.target.value))}
                  className="w-full accent-rose-600 cursor-pointer"
                />
                <p className="text-[10px] text-slate-400 mt-1">HTTP 4xx/5xx Tolerance</p>
              </div>
            </div>
          </div>

          {/* Detected Bottlenecks Cards */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center justify-between">
              <span>Identified Bottlenecks & Anomalies ({bottlenecks.length})</span>
              <span className="text-xs font-normal text-slate-400">
                Evaluated against {records.length} records in SQLite
              </span>
            </h3>

            {isLoadingBottlenecks ? (
              <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-card">
                <LoadingSpinner message="Evaluating rule-based and IQR outlier criteria..." />
              </div>
            ) : bottlenecks.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {bottlenecks.map((finding, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-card hover:shadow-card-hover transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <StatusBadge type="severity" value={finding.severity} />
                        <h4 className="text-sm font-bold text-slate-900">{finding.bottleneck_name}</h4>
                      </div>
                      <div className="text-xs font-mono text-slate-500">
                        {finding.threshold}
                      </div>
                    </div>

                    <div className="my-3 p-3 bg-slate-50 rounded-lg text-xs font-mono text-slate-700 border border-slate-100">
                      <span className="font-sans font-semibold text-slate-500 block text-[11px] mb-0.5">
                        Observed Metric Signature:
                      </span>
                      {finding.observed_metric}
                    </div>

                    <div className="text-xs text-slate-600 leading-relaxed mb-3">
                      <span className="font-semibold text-slate-800">Academic Explanation: </span>
                      {finding.explanation}
                    </div>

                    <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Recommended Architectural Optimization: </span>
                        {finding.suggested_optimization}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white p-12 rounded-xl border border-slate-200 text-center shadow-card">
                <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <h4 className="text-base font-bold text-slate-800">No Bottlenecks Detected</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  All observed metrics conform to the configured SLA boundaries. Lower the threshold sliders to simulate stricter SLA conditions.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
