import React, { useMemo, useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Activity, BarChart2, PieChart as PieIcon, Cpu, AlertTriangle, Layers } from 'lucide-react';
import { MetricRecord, BottleneckFinding, CorrelationAnalysisResponse } from '../types/api';
import { apiService } from '../services/api';
import { EmptyState } from '../components/EmptyState';

interface PerformanceVisualizationProps {
  records: MetricRecord[];
  bottlenecks: BottleneckFinding[];
  onSeedData: () => void;
}

export const PerformanceVisualization: React.FC<PerformanceVisualizationProps> = ({
  records,
  bottlenecks,
  onSeedData,
}) => {
  const [corrData, setCorrData] = useState<CorrelationAnalysisResponse | null>(null);

  useEffect(() => {
    apiService.getCorrelationAnalysis().then((res) => {
      if (res && !res.error) setCorrData(res);
    }).catch(console.error);
  }, [records]);
  // 1. Time series data (subsampled for responsiveness)
  const timeSeriesData = useMemo(() => {
    if (!records || records.length === 0) return [];
    const step = Math.max(1, Math.floor(records.length / 45));
    return records
      .filter((_, idx) => idx % step === 0)
      .map((r, i) => ({
        index: i + 1,
        time: r.timestamp ? r.timestamp.split(' ')[1] || r.timestamp : `#${i + 1}`,
        responseTime: Math.round(r.response_time_ms),
        frequency: Math.round(r.request_frequency || 1),
        cpu: Math.round(r.cpu_usage),
        memory: Math.round(r.memory_usage),
        workload: r.workload || 'General',
      }));
  }, [records]);

  // 2. Response Time Histogram (binned into 10 intervals)
  const histogramData = useMemo(() => {
    if (!records || records.length === 0) return [];
    const rts = records.map((r) => Number(r.response_time_ms) || 0);
    const min = Math.min(...rts);
    const max = Math.max(...rts);
    const numBins = 10;
    const binSize = Math.max(10, Math.ceil((max - min) / numBins));

    const bins = Array.from({ length: numBins }, (_, i) => {
      const lower = Math.round(min + i * binSize);
      const upper = Math.round(lower + binSize);
      return {
        label: `${lower}-${upper}ms`,
        count: 0,
        lower,
        upper,
      };
    });

    rts.forEach((val) => {
      for (const b of bins) {
        if (val >= b.lower && (val < b.upper || b === bins[bins.length - 1])) {
          b.count += 1;
          break;
        }
      }
    });

    return bins;
  }, [records]);

  // 3. HTTP Status Code Distribution
  const statusData = useMemo(() => {
    if (!records || records.length === 0) return [];
    const counts: Record<string, number> = {};
    records.forEach((r) => {
      const s = String(r.status_code || 200);
      counts[s] = (counts[s] || 0) + 1;
    });

    const colors: Record<string, string> = {
      '200': '#10b981',
      '404': '#f59e0b',
      '408': '#fbbf24',
      '500': '#f43f5e',
      '503': '#e11d48',
    };

    return Object.entries(counts).map(([code, count]) => ({
      name: `HTTP ${code}`,
      value: count,
      color: colors[code] || '#6366f1',
    }));
  }, [records]);

  // 4. Endpoint Comparison
  const endpointData = useMemo(() => {
    if (!records || records.length === 0) return [];
    const map: Record<string, { totalRt: number; count: number; maxRt: number }> = {};
    records.forEach((r) => {
      const ep = r.endpoint.replace('http://127.0.0.1:8000', '') || '/';
      if (!map[ep]) map[ep] = { totalRt: 0, count: 0, maxRt: 0 };
      const rt = Number(r.response_time_ms) || 0;
      map[ep].totalRt += rt;
      map[ep].count += 1;
      map[ep].maxRt = Math.max(map[ep].maxRt, rt);
    });

    return Object.entries(map).slice(0, 8).map(([name, val]) => ({
      name: name.length > 20 ? name.slice(0, 18) + '...' : name,
      fullName: name,
      avgLatency: Math.round(val.totalRt / val.count),
      maxLatency: Math.round(val.maxRt),
      requests: val.count,
    }));
  }, [records]);

  // 5. Bottleneck Severity Distribution
  const severityData = useMemo(() => {
    const counts: Record<string, number> = { Critical: 0, High: 0, Medium: 0, Low: 0, Normal: 0 };
    bottlenecks.forEach((b) => {
      if (counts[b.severity] !== undefined) {
        counts[b.severity] += 1;
      }
    });

    return [
      { name: 'Critical', count: counts.Critical, fill: '#f43f5e' },
      { name: 'High', count: counts.High, fill: '#f97316' },
      { name: 'Medium', count: counts.Medium, fill: '#f59e0b' },
      { name: 'Low', count: counts.Low, fill: '#0ea5e9' },
      { name: 'Normal', count: counts.Normal, fill: '#10b981' },
    ];
  }, [bottlenecks]);

  if (!records || records.length === 0) {
    return (
      <EmptyState
        title="Visualization Engine Awaiting Telemetry Data"
        description="Load the benchmark sample dataset or dispatch API requests from Module 1 to populate the 8 interactive Recharts visualization panels."
        onAction={onSeedData}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-card">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-50 text-cyan-700 text-xs font-bold uppercase tracking-wider mb-2 border border-cyan-200">
          <Activity className="w-3.5 h-3.5" /> High-Resolution Analytics Suite
        </div>
        <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
          Performance Visualization & Empirical Charts
        </h2>
        <p className="text-xs md:text-sm text-slate-500 mt-1">
          Comprehensive suite of 9 interactive analytical charts visualizing response times, concurrency histograms, server load footprint, endpoint latencies, correlation heatmaps, and anomaly severity.
        </p>
      </div>

      {/* Grid of 8 Comprehensive Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Response Time Line Chart */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">1. Response Time Progression</h3>
              <p className="text-xs text-slate-400">Sequential request latency trajectory (ms)</p>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-200">
              Line Chart
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeSeriesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="index" tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="responseTime"
                  name="Latency (ms)"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Request Frequency Bar Chart */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">2. Request Frequency (Throughput)</h3>
              <p className="text-xs text-slate-400">Dispatched requests per second (req/s)</p>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded bg-teal-50 text-teal-700 font-semibold border border-teal-200">
              Bar Chart
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeSeriesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="index" tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip />
                <Bar dataKey="frequency" name="Frequency (req/s)" fill="#0d9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. CPU & Memory Area Chart */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">3. Host CPU & Memory Utilization Footprint</h3>
              <p className="text-xs text-slate-400">Synchronous host telemetry area overlays (%)</p>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
              Area Chart
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeSeriesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="cpuGradVis" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="memGradVis" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="index" tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis domain={[0, 100]} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip />
                <Area type="monotone" dataKey="cpu" name="CPU %" stroke="#6366f1" fill="url(#cpuGradVis)" />
                <Area type="monotone" dataKey="memory" name="RAM %" stroke="#06b6d4" fill="url(#memGradVis)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4. Response Time Distribution Histogram */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">4. Response Time Latency Histogram</h3>
              <p className="text-xs text-slate-400">Binned frequency distribution highlighting skewness</p>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold border border-amber-200">
              Histogram
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={histogramData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip />
                <Bar dataKey="count" name="Frequency Count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 5. HTTP Status Code Distribution */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">5. HTTP Status Composition</h3>
              <p className="text-xs text-slate-400">Breakdown of 2xx success vs 4xx/5xx failure rates</p>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
              Donut Chart
            </span>
          </div>
          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 6. Endpoint Latency Comparison */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">6. Endpoint Latency Comparison</h3>
              <p className="text-xs text-slate-400">Mean vs Peak response time across monitored routes (ms)</p>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded bg-violet-50 text-violet-700 font-semibold border border-violet-200">
              Grouped Bar
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={endpointData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip />
                <Bar dataKey="avgLatency" name="Mean Latency (ms)" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="maxLatency" name="Peak Latency (ms)" fill="#c4b5fd" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 7. Correlation Heatmap Matrix */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">7. Correlation Heatmap Matrix (Pearson r)</h3>
              <p className="text-xs text-slate-400">Inter-metric linear dependency coefficients (-1 to +1)</p>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded bg-violet-50 text-violet-700 font-semibold border border-violet-200">
              Heatmap
            </span>
          </div>
          {corrData && corrData.columns ? (
            <div className="overflow-x-auto h-64 flex flex-col justify-center">
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
                      <td className="py-2 px-2 text-left font-sans font-semibold text-slate-700">
                        {rowCol.replace('_ms', '').replace('_usage', '')}
                      </td>
                      {corrData.columns.map((colCol) => {
                        const val = corrData.pearson_matrix?.[rowCol]?.[colCol] ?? 0;
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
                          <td key={colCol} className="py-2 px-2">
                            <div className={`py-1.5 px-2 rounded-lg text-xs ${bg}`}>
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
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400 text-xs">
              Calculating statistical correlation matrix from backend...
            </div>
          )}
        </div>

        {/* 8. Bottleneck Severity Distribution */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">8. Bottleneck Findings Severity</h3>
              <p className="text-xs text-slate-400">Classification of system bottlenecks across severity tiers</p>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-semibold border border-rose-200">
              Severity Bar
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={severityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip />
                <Bar dataKey="count" name="Identified Count" radius={[4, 4, 0, 0]}>
                  {severityData.map((entry, index) => (
                    <Cell key={`sev-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 8. Interactive Latency vs Throughput Scatter Representation */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">8. Workload Latency vs Request Rate</h3>
              <p className="text-xs text-slate-400">Empirical load queueing relationship</p>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded bg-sky-50 text-sky-700 font-semibold border border-sky-200">
              Dual Axis
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeSeriesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="index" tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis yAxisId="left" tickLine={false} tick={{ fontSize: 11, fill: '#2563eb' }} />
                <YAxis yAxisId="right" orientation="right" tickLine={false} tick={{ fontSize: 11, fill: '#06b6d4' }} />
                <Tooltip />
                <Line yAxisId="left" type="monotone" dataKey="responseTime" name="Latency (ms)" stroke="#2563eb" strokeWidth={2} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="frequency" name="Frequency (req/s)" stroke="#06b6d4" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
