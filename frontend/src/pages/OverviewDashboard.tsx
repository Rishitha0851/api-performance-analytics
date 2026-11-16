import React, { useMemo } from 'react';
import {
  Activity,
  Clock,
  Gauge,
  Zap,
  AlertTriangle,
  Cpu,
  Server,
  Layers,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { MetricRecord, ServerMetrics, BottleneckFinding } from '../types/api';
import { MetricCard } from '../components/MetricCard';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';

interface OverviewDashboardProps {
  records: MetricRecord[];
  serverMetrics: ServerMetrics | null;
  bottlenecks: BottleneckFinding[];
  onSeedData: () => void;
  onNavigateToModule: (tab: string) => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  records,
  serverMetrics,
  bottlenecks,
  onSeedData,
  onNavigateToModule,
}) => {
  // Compute High-Level Metrics from records
  const kpis = useMemo(() => {
    if (!records || records.length === 0) {
      return {
        totalRequests: 0,
        avgResponseTime: 0,
        p95ResponseTime: 0,
        avgRps: 0,
        errorRate: 0,
        avgCpu: serverMetrics?.cpu_usage || 0,
        avgMem: serverMetrics?.memory_usage || 0,
        criticalBottlenecks: 0,
      };
    }

    const total = records.length;
    const rts = records.map((r) => Number(r.response_time_ms) || 0).sort((a, b) => a - b);
    const avgRt = rts.reduce((acc, v) => acc + v, 0) / (total || 1);
    const p95Index = Math.min(Math.floor(total * 0.95), total - 1);
    const p95Rt = rts[p95Index] || 0;

    const rpsValues = records.map((r) => Number(r.request_frequency) || 1);
    const avgRps = rpsValues.reduce((acc, v) => acc + v, 0) / (total || 1);

    const errorCount = records.filter((r) => Number(r.status_code) >= 400 || Number(r.status_code) === 0).length;
    const errorRate = (errorCount / (total || 1)) * 100;

    const cpuValues = records.map((r) => Number(r.cpu_usage) || 0);
    const avgCpu = cpuValues.reduce((acc, v) => acc + v, 0) / (total || 1);

    const memValues = records.map((r) => Number(r.memory_usage) || 0);
    const avgMem = memValues.reduce((acc, v) => acc + v, 0) / (total || 1);

    const criticalCount = bottlenecks.filter((b) => b.severity === 'Critical' || b.severity === 'High').length;

    return {
      totalRequests: total,
      avgResponseTime: Math.round(avgRt * 10) / 10,
      p95ResponseTime: Math.round(p95Rt * 10) / 10,
      avgRps: Math.round(avgRps * 10) / 10,
      errorRate: Math.round(errorRate * 10) / 10,
      avgCpu: Math.round(avgCpu * 10) / 10,
      avgMem: Math.round(avgMem * 10) / 10,
      criticalBottlenecks: criticalCount,
    };
  }, [records, serverMetrics, bottlenecks]);

  // Chart data: sample down to 50 points for smooth interactive charts
  const timeSeriesData = useMemo(() => {
    if (!records || records.length === 0) return [];
    const step = Math.max(1, Math.floor(records.length / 50));
    return records
      .filter((_, idx) => idx % step === 0)
      .map((r, i) => ({
        index: i + 1,
        time: r.timestamp ? r.timestamp.split(' ')[1] || r.timestamp : `#${i + 1}`,
        responseTime: Math.round(r.response_time_ms),
        frequency: Math.round(r.request_frequency || 1),
        cpu: Math.round(r.cpu_usage),
        memory: Math.round(r.memory_usage),
        workload: r.workload || 'Trace',
      }));
  }, [records]);

  // Status code distribution for Pie Chart
  const statusPieData = useMemo(() => {
    if (!records || records.length === 0) return [];
    let s200 = 0;
    let s400 = 0;
    let s500 = 0;
    records.forEach((r) => {
      const c = Number(r.status_code);
      if (c >= 200 && c < 300) s200++;
      else if (c >= 400 && c < 500) s400++;
      else s500++;
    });
    return [
      { name: '200 OK', value: s200, color: '#10b981' },
      { name: '4xx Client Err', value: s400, color: '#f59e0b' },
      { name: '5xx Server Err', value: s500, color: '#f43f5e' },
    ].filter((item) => item.value > 0);
  }, [records]);

  // Workload summary distribution
  const workloadData = useMemo(() => {
    if (!records || records.length === 0) return [];
    const counts: Record<string, { count: number; avgRt: number; totalRt: number }> = {};
    records.forEach((r) => {
      const w = r.workload || 'General';
      if (!counts[w]) counts[w] = { count: 0, avgRt: 0, totalRt: 0 };
      counts[w].count += 1;
      counts[w].totalRt += Number(r.response_time_ms) || 0;
    });
    return Object.entries(counts).map(([name, val]) => ({
      name,
      requests: val.count,
      avgLatency: Math.round(val.totalRt / val.count),
    }));
  }, [records]);

  const recentRecords = useMemo(() => {
    return [...records].reverse().slice(0, 10);
  }, [records]);

  if (!records || records.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 rounded-2xl p-8 text-white shadow-lg">
          <h2 className="text-2xl font-black tracking-tight">Overview Telemetry Dashboard</h2>
          <p className="mt-2 text-blue-100 max-w-2xl text-sm leading-relaxed">
            Welcome to the academic empirical benchmarking dashboard. Load live HTTP traffic traces or seed the standardized multi-workload dataset to analyze latency dynamics, queuing bottlenecks, and server resource constraints.
          </p>
        </div>
        <EmptyState
          title="Telemetry Database is Empty"
          description="Click below to seed the 600-sample academic dataset across 4 workloads (Normal, Moderate, High, Heavy), or navigate to Module 1 to perform live API measurements."
          onAction={onSeedData}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Welcome & Academic Context Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-600 p-6 md:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold uppercase tracking-wider text-cyan-200 mb-3 border border-white/20">
              <Zap className="w-3.5 h-3.5 text-cyan-300" /> Empirical Performance Telemetry
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              API Performance & System Dynamics
            </h2>
            <p className="mt-2 text-sm text-blue-100 leading-relaxed">
              Real-time monitoring and empirical evaluation across API latency, invocation frequency, and host CPU/RAM saturation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigateToModule('module1')}
              className="px-4 py-2.5 rounded-xl bg-white text-blue-700 hover:bg-blue-50 font-semibold text-xs tracking-wide shadow-md transition-all flex items-center gap-2"
            >
              <Activity className="w-4 h-4 text-blue-600" />
              Collect Live Traces
            </button>
            <button
              onClick={() => onNavigateToModule('module2')}
              className="px-4 py-2.5 rounded-xl bg-indigo-900/60 hover:bg-indigo-900/80 text-white font-semibold text-xs tracking-wide border border-white/20 backdrop-blur-md shadow-md transition-all flex items-center gap-2"
            >
              <TrendingUp className="w-4 h-4 text-cyan-300" />
              Statistical Diagnostics
            </button>
          </div>
        </div>

        {/* Decorative background glow circles */}
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-cyan-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -top-12 w-64 h-64 bg-violet-400/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Primary KPI Grid (8 Cards as requested in Project Spec) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total API Requests"
          value={kpis.totalRequests.toLocaleString()}
          subtitle="Processed traces"
          icon={Layers}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
          badge="100% Persisted"
          badgeColor="bg-blue-50 text-blue-700 border border-blue-200"
        />

        <MetricCard
          title="Average Response Time"
          value={`${kpis.avgResponseTime} ms`}
          subtitle="Mean execution latency"
          icon={Clock}
          iconColor="text-cyan-600"
          iconBg="bg-cyan-50"
          badge={kpis.avgResponseTime < 300 ? 'Optimal' : kpis.avgResponseTime < 800 ? 'Moderate' : 'High Latency'}
          badgeColor={
            kpis.avgResponseTime < 300
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : kpis.avgResponseTime < 800
              ? 'bg-amber-50 text-amber-700 border border-amber-200'
              : 'bg-rose-50 text-rose-700 border border-rose-200'
          }
        />

        <MetricCard
          title="P95 Latency"
          value={`${kpis.p95ResponseTime} ms`}
          subtitle="95th percentile SLA tail"
          icon={Gauge}
          iconColor="text-violet-600"
          iconBg="bg-violet-50"
          badge="SLA Boundary"
          badgeColor="bg-violet-50 text-violet-700 border border-violet-200"
        />

        <MetricCard
          title="Requests Per Second"
          value={`${kpis.avgRps} req/s`}
          subtitle="Mean transaction throughput"
          icon={Zap}
          iconColor="text-teal-600"
          iconBg="bg-teal-50"
          badge="Frequency"
          badgeColor="bg-teal-50 text-teal-700 border border-teal-200"
        />

        <MetricCard
          title="Error Rate"
          value={`${kpis.errorRate}%`}
          subtitle="HTTP 4xx & 5xx failures"
          icon={AlertTriangle}
          iconColor={kpis.errorRate > 5 ? 'text-rose-600' : 'text-emerald-600'}
          iconBg={kpis.errorRate > 5 ? 'bg-rose-50' : 'bg-emerald-50'}
          badge={kpis.errorRate === 0 ? 'Zero Errors' : kpis.errorRate < 5 ? 'Acceptable' : 'High Failure'}
          badgeColor={
            kpis.errorRate < 5
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-rose-50 text-rose-700 border border-rose-200'
          }
        />

        <MetricCard
          title="CPU Utilization"
          value={`${kpis.avgCpu}%`}
          subtitle={serverMetrics ? `Live host: ${serverMetrics.cpu_usage}%` : 'Host average'}
          icon={Cpu}
          iconColor="text-indigo-600"
          iconBg="bg-indigo-50"
          badge={kpis.avgCpu < 70 ? 'Healthy' : 'High Compute'}
          badgeColor={
            kpis.avgCpu < 70
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-orange-50 text-orange-700 border border-orange-200'
          }
        />

        <MetricCard
          title="Memory Utilization"
          value={`${kpis.avgMem}%`}
          subtitle={serverMetrics ? `${serverMetrics.available_memory_mb} MB free` : 'Host average'}
          icon={Server}
          iconColor="text-sky-600"
          iconBg="bg-sky-50"
          badge={kpis.avgMem < 80 ? 'Normal' : 'High Allocation'}
          badgeColor={
            kpis.avgMem < 80
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-amber-50 text-amber-700 border border-amber-200'
          }
        />

        <MetricCard
          title="Active Bottlenecks"
          value={bottlenecks.length}
          subtitle={`${kpis.criticalBottlenecks} high or critical`}
          icon={AlertTriangle}
          iconColor={bottlenecks.length > 0 ? 'text-amber-600' : 'text-emerald-600'}
          iconBg={bottlenecks.length > 0 ? 'bg-amber-50' : 'bg-emerald-50'}
          badge={bottlenecks.length === 0 ? 'Optimal' : `${bottlenecks.length} Identified`}
          badgeColor={
            bottlenecks.length === 0
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-amber-50 text-amber-700 border border-amber-200'
          }
        />
      </div>

      {/* Main Interactive Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Latency Over Time (Recharts Line Chart) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Response Time Evolution</h3>
              <p className="text-xs text-slate-400">Sequential trace latency (ms) with P95 baseline</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <span className="inline-block w-3 h-3 rounded-full bg-blue-600"></span> Latency (ms)
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeSeriesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="index" tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200 text-xs">
                          <p className="font-bold text-slate-800">Record #{data.index}</p>
                          <p className="text-blue-600 font-semibold mt-1">Latency: {data.responseTime} ms</p>
                          <p className="text-slate-500">Workload: {data.workload}</p>
                          <p className="text-slate-500">Time: {data.time}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="responseTime"
                  stroke="#2563eb"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#latencyGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* HTTP Status Breakdown (Donut Chart) */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-card flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800">HTTP Status Composition</h3>
            <p className="text-xs text-slate-400">Response code distribution across workload calls</p>
          </div>

          <div className="h-48 w-full my-auto flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {statusPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-2 rounded-lg shadow-md border border-slate-200 text-xs">
                          <span className="font-bold">{data.name}:</span> {data.value} requests
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-around text-xs">
            {statusPieData.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                <span className="text-slate-600 font-medium">{item.name}</span>
                <span className="font-bold text-slate-800">({item.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Second Charts Row: Workload Throughput & Server Resource Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Workload Stages Throughput */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Workload Stage Latency Comparison</h3>
              <p className="text-xs text-slate-400">Average response time grouped by academic stress tiers</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              Stress Tiers
            </span>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={workloadData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200 text-xs">
                          <p className="font-bold text-slate-800">Workload: {data.name}</p>
                          <p className="text-indigo-600 font-semibold mt-1">Avg Latency: {data.avgLatency} ms</p>
                          <p className="text-slate-500">Total Requests: {data.requests}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="avgLatency" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Server Resource Trends (CPU & RAM overlay) */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Server Load Footprint</h3>
              <p className="text-xs text-slate-400">CPU % and Memory % telemetry synchronized with requests</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium">
              <span className="flex items-center gap-1 text-indigo-600">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span> CPU %
              </span>
              <span className="flex items-center gap-1 text-cyan-600">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500"></span> RAM %
              </span>
            </div>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeSeriesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="memGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="index" tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis domain={[0, 100]} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200 text-xs">
                          <p className="font-bold text-slate-800">Observation #{data.index}</p>
                          <p className="text-indigo-600 font-semibold mt-1">CPU Load: {data.cpu}%</p>
                          <p className="text-cyan-600 font-semibold">Memory Usage: {data.memory}%</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area type="monotone" dataKey="cpu" stroke="#6366f1" strokeWidth={2} fill="url(#cpuGradient)" />
                <Area type="monotone" dataKey="memory" stroke="#06b6d4" strokeWidth={2} fill="url(#memGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Performance Activity Section */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Recent API Execution Log</h3>
            <p className="text-xs text-slate-400">Latest 10 traces captured in SQLite persistence layer</p>
          </div>
          <button
            onClick={() => onNavigateToModule('module1')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            Explore all records in Module 1 <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 font-semibold">
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Method</th>
                <th className="py-2.5 px-3">Endpoint</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Response Time</th>
                <th className="py-2.5 px-3">CPU %</th>
                <th className="py-2.5 px-3">RAM %</th>
                <th className="py-2.5 px-3">Workload</th>
                <th className="py-2.5 px-3 text-right">Data Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentRecords.map((r, i) => (
                <tr key={r.id || i} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2 px-3 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                    {r.timestamp}
                  </td>
                  <td className="py-2 px-3 font-semibold text-slate-700">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100">
                      {r.method}
                    </span>
                  </td>
                  <td className="py-2 px-3 font-mono text-slate-800 max-w-xs truncate" title={r.endpoint}>
                    {r.endpoint}
                  </td>
                  <td className="py-2 px-3">
                    <StatusBadge type="status" value={r.status_code} />
                  </td>
                  <td className="py-2 px-3 font-semibold text-slate-900 font-mono">
                    {r.response_time_ms} ms
                  </td>
                  <td className="py-2 px-3 font-mono text-slate-600">{r.cpu_usage}%</td>
                  <td className="py-2 px-3 font-mono text-slate-600">{r.memory_usage}%</td>
                  <td className="py-2 px-3">
                    <StatusBadge type="workload" value={r.workload || 'Default'} />
                  </td>
                  <td className="py-2 px-3 text-right">
                    <StatusBadge type="simulated" value={r.is_simulated || 0} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
