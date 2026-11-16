import React, { useState, useEffect } from 'react';
import {
  Send,
  Zap,
  Activity,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  Server,
  Cpu,
  UploadCloud,
  FileSpreadsheet,
  Download,
  Play,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts';
import { apiService } from '../services/api';
import { MetricRecord, ServerMetrics, LoadTestResponse, PreprocessResponse } from '../types/api';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface Module1CollectionProps {
  records: MetricRecord[];
  serverMetrics: ServerMetrics | null;
  onRefreshRecords: () => void;
}

export const Module1Collection: React.FC<Module1CollectionProps> = ({
  records,
  serverMetrics,
  onRefreshRecords,
}) => {
  const [activeTab, setActiveTab] = useState<'measure' | 'loadtest' | 'monitoring' | 'preprocess'>('measure');

  // -------------------------------------------------------------
  // TAB A: Single API Measurement State
  // -------------------------------------------------------------
  const [url, setUrl] = useState('http://127.0.0.1:8000/api/test/ping');
  const [method, setMethod] = useState<'GET' | 'POST'>('GET');
  const [headersJson, setHeadersJson] = useState('');
  const [payloadJson, setPayloadJson] = useState('{"test": "telemetry_ping"}');
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measureResult, setMeasureResult] = useState<MetricRecord | null>(null);
  const [measureError, setMeasureError] = useState<string | null>(null);

  const handleExecuteMeasure = async () => {
    setIsMeasuring(true);
    setMeasureError(null);
    try {
      let parsedHeaders: Record<string, string> | undefined = undefined;
      let parsedPayload: any = undefined;

      if (headersJson.trim()) {
        try {
          parsedHeaders = JSON.parse(headersJson);
        } catch {
          throw new Error('Invalid JSON format in custom headers');
        }
      }

      if (method === 'POST' && payloadJson.trim()) {
        try {
          parsedPayload = JSON.parse(payloadJson);
        } catch {
          throw new Error('Invalid JSON format in payload body');
        }
      }

      const res = await apiService.measureRequest({
        url,
        method,
        headers: parsedHeaders,
        payload: parsedPayload,
        record_to_db: true,
      });
      setMeasureResult(res);
      onRefreshRecords();
    } catch (err: any) {
      setMeasureError(err?.response?.data?.detail || err.message || 'Failed to execute measurement');
    } finally {
      setIsMeasuring(false);
    }
  };

  // -------------------------------------------------------------
  // TAB B: Load Testing State
  // -------------------------------------------------------------
  const [ltUrl, setLtUrl] = useState('http://127.0.0.1:8000/api/test/ping');
  const [ltMethod, setLtMethod] = useState<'GET' | 'POST'>('GET');
  const [concurrency, setConcurrency] = useState(10);
  const [totalRequests, setTotalRequests] = useState(50);
  const [timeoutSec, setTimeoutSec] = useState(5.0);
  const [isLoadTesting, setIsLoadTesting] = useState(false);
  const [loadTestResult, setLoadTestResult] = useState<LoadTestResponse | null>(null);
  const [loadTestError, setLoadTestError] = useState<string | null>(null);
  const [pastRuns, setPastRuns] = useState<any[]>([]);

  const fetchPastRuns = async () => {
    try {
      const runs = await apiService.getLoadTestRuns(10);
      setPastRuns(runs);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (activeTab === 'loadtest') {
      fetchPastRuns();
    }
  }, [activeTab]);

  const handleExecuteLoadTest = async () => {
    setIsLoadTesting(true);
    setLoadTestError(null);
    try {
      const res = await apiService.runLoadTest({
        target_url: ltUrl,
        method: ltMethod,
        concurrency,
        total_requests: totalRequests,
        timeout_sec: timeoutSec,
        record_to_db: true,
      });
      setLoadTestResult(res);
      onRefreshRecords();
      fetchPastRuns();
    } catch (err: any) {
      setLoadTestError(err?.response?.data?.detail || err.message || 'Load test execution failed');
    } finally {
      setIsLoadTesting(false);
    }
  };

  // -------------------------------------------------------------
  // TAB C: Live Monitoring State
  // -------------------------------------------------------------
  const [monitoringHistory, setMonitoringHistory] = useState<
    Array<{ time: string; cpu: number; memory: number }>
  >([]);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (serverMetrics) {
      const timeStr = serverMetrics.timestamp.split(' ')[1] || serverMetrics.timestamp;
      setMonitoringHistory((prev) => {
        const next = [...prev, { time: timeStr, cpu: serverMetrics.cpu_usage, memory: serverMetrics.memory_usage }];
        return next.slice(-30);
      });
    }
  }, [serverMetrics]);

  // -------------------------------------------------------------
  // TAB D: Preprocessing State
  // -------------------------------------------------------------
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedData, setUploadedData] = useState<{
    filename: string;
    row_count: number;
    columns: string[];
    records: any[];
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [handleMissing, setHandleMissing] = useState<'impute' | 'drop'>('impute');
  const [removeDuplicates, setRemoveDuplicates] = useState(true);
  const [detectOutliers, setDetectOutliers] = useState(true);
  const [isPreprocessing, setIsPreprocessing] = useState(false);
  const [preprocessResult, setPreprocessResult] = useState<PreprocessResponse | null>(null);
  const [preprocessError, setPreprocessError] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);
    setIsUploading(true);
    setPreprocessError(null);
    try {
      const res = await apiService.uploadCsv(file);
      setUploadedData(res);
      setPreprocessResult(null);
    } catch (err: any) {
      setPreprocessError(err?.response?.data?.detail || err.message || 'Failed to upload CSV file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRunPreprocessing = async () => {
    setIsPreprocessing(true);
    setPreprocessError(null);
    try {
      // Use uploaded records if available, otherwise current SQLite records
      const datasetToProcess =
        uploadedData && uploadedData.records.length > 0 ? uploadedData.records : records;

      if (!datasetToProcess || datasetToProcess.length === 0) {
        throw new Error('No dataset available for preprocessing. Please upload a CSV or load sample data.');
      }

      const res = await apiService.preprocessData({
        records: datasetToProcess,
        handle_missing: handleMissing,
        remove_duplicates: removeDuplicates,
        detect_outliers: detectOutliers,
      });
      setPreprocessResult(res);
    } catch (err: any) {
      setPreprocessError(err?.response?.data?.detail || err.message || 'Preprocessing failed');
    } finally {
      setIsPreprocessing(false);
    }
  };

  const handleDownloadCleanedCsv = () => {
    if (!preprocessResult || !preprocessResult.cleaned_records.length) return;
    const items = preprocessResult.cleaned_records;
    const keys = Object.keys(items[0]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        keys.join(','),
        ...items.map((row: any) => keys.map((k) => JSON.stringify(row[k] ?? '')).join(',')),
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'cleaned_telemetry_dataset.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Module 1 Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider mb-2 border border-blue-200">
              <Activity className="w-3.5 h-3.5" /> Module 1 Academic Specification
            </div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
              Performance Data Collection & Preprocessing
            </h2>
            <p className="text-xs md:text-sm text-slate-500 mt-1">
              Active telemetry harvesting, asynchronous concurrency load testing, server resource profiling, and robust IQR data cleaning.
            </p>
          </div>

          {/* Module 1 Sub-Tab Navigation */}
          <div className="flex flex-wrap p-1 bg-slate-100/80 rounded-xl border border-slate-200/80">
            <button
              onClick={() => setActiveTab('measure')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'measure'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Send className="w-3.5 h-3.5" /> API Collection
            </button>
            <button
              onClick={() => setActiveTab('loadtest')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'loadtest'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Zap className="w-3.5 h-3.5" /> Load Testing
            </button>
            <button
              onClick={() => setActiveTab('monitoring')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'monitoring'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Server className="w-3.5 h-3.5" /> Host Monitoring
            </button>
            <button
              onClick={() => setActiveTab('preprocess')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'preprocess'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Filter className="w-3.5 h-3.5" /> Preprocessing & IQR
            </button>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------------------------- */}
      {/* SECTION A: API PERFORMANCE COLLECTION                                            */}
      {/* -------------------------------------------------------------------------------- */}
      {activeTab === 'measure' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Request Form */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 p-5 shadow-card">
              <h3 className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-2">
                <Send className="w-4 h-4 text-blue-600" /> Execute Ad-Hoc API Measurement
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Executes an HTTP trace via FastAPI backend, captures round-trip execution latency, and commits the metric to SQLite.
              </p>

              {/* Endpoint Presets */}
              <div className="mb-4">
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                  Built-In Benchmarking Presets (Zero External Dependencies):
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Ping (<5ms)', url: 'http://127.0.0.1:8000/api/test/ping', m: 'GET' },
                    { label: 'Compute (CPU 150k)', url: 'http://127.0.0.1:8000/api/test/compute?n=150000', m: 'GET' },
                    { label: 'Latency Delay (150ms)', url: 'http://127.0.0.1:8000/api/test/delay?ms=150', m: 'GET' },
                    { label: 'JSON Echo (POST)', url: 'http://127.0.0.1:8000/api/test/echo', m: 'POST' },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setUrl(preset.url);
                        setMethod(preset.m as 'GET' | 'POST');
                      }}
                      className="px-2.5 py-1 text-xs rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-medium transition-colors border border-slate-200"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* URL & Method Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
                <div className="sm:col-span-1">
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Method</label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value as 'GET' | 'POST')}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label className="text-xs font-semibold text-slate-600 block mb-1">API Target URL</label>
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="http://127.0.0.1:8000/api/test/ping"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Optional POST Payload */}
              {method === 'POST' && (
                <div className="mb-4">
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    JSON Request Payload
                  </label>
                  <textarea
                    rows={3}
                    value={payloadJson}
                    onChange={(e) => setPayloadJson(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Optional Custom Headers */}
              <div className="mb-5">
                <details className="text-xs">
                  <summary className="font-semibold text-slate-600 cursor-pointer hover:text-blue-600">
                    + Advanced Custom Headers (Optional JSON)
                  </summary>
                  <textarea
                    rows={2}
                    value={headersJson}
                    onChange={(e) => setHeadersJson(e.target.value)}
                    placeholder='{"Authorization": "Bearer token123"}'
                    className="w-full mt-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </details>
              </div>

              {measureError && (
                <div className="p-3 mb-4 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{measureError}</span>
                </div>
              )}

              <button
                onClick={handleExecuteMeasure}
                disabled={isMeasuring || !url}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs tracking-wide shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isMeasuring ? <LoadingSpinner size="sm" message="" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                {isMeasuring ? 'Executing HTTP Trace...' : 'Dispatch HTTP Measurement'}
              </button>
            </div>

            {/* Live Result Inspector */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-card flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-1">Execution Telemetry</h3>
                <p className="text-xs text-slate-400 mb-4">Latest response characteristics</p>

                {measureResult ? (
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-slate-500">HTTP Status:</span>
                      <StatusBadge type="status" value={measureResult.status_code} />
                    </div>

                    <div className="p-3 rounded-lg bg-blue-50/60 border border-blue-100 flex items-center justify-between">
                      <span className="text-xs text-blue-900 font-medium">Response Time:</span>
                      <span className="text-sm font-mono font-bold text-blue-700">
                        {measureResult.response_time_ms} ms
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-slate-500">Payload Size:</span>
                      <span className="text-xs font-mono font-semibold text-slate-800">
                        {measureResult.response_size_bytes ?? 0} bytes
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-slate-500">Host CPU / RAM:</span>
                      <span className="text-xs font-mono font-semibold text-slate-800">
                        {measureResult.cpu_usage}% / {measureResult.memory_usage}%
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center gap-2 text-xs text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Committed to SQLite table `api_metrics`</span>
                    </div>
                  </div>
                ) : (
                  <div className="h-48 border border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center text-center p-4 text-slate-400">
                    <Activity className="w-8 h-8 mb-2 opacity-50" />
                    <p className="text-xs">No measurement executed in this session yet.</p>
                  </div>
                )}
              </div>

              <div className="text-[11px] text-slate-400 pt-3 border-t border-slate-100">
                All measurements record high-precision microsecond timers via Python `time.perf_counter()`.
              </div>
            </div>
          </div>

          {/* Collection History Table */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Telemetry History Log</h3>
                <p className="text-xs text-slate-400">Past collected measurements stored in database</p>
              </div>
              <button
                onClick={onRefreshRecords}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Refresh List
              </button>
            </div>

            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Time</th>
                    <th className="py-2 px-3">Method</th>
                    <th className="py-2 px-3">Endpoint</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3">Response Time</th>
                    <th className="py-2 px-3">CPU</th>
                    <th className="py-2 px-3">RAM</th>
                    <th className="py-2 px-3">Workload</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.slice(-15).reverse().map((r, i) => (
                    <tr key={r.id || i} className="hover:bg-slate-50/70">
                      <td className="py-2 px-3 font-mono text-slate-500 text-[11px]">{r.timestamp}</td>
                      <td className="py-2 px-3 font-semibold">{r.method}</td>
                      <td className="py-2 px-3 font-mono text-slate-700 truncate max-w-xs">{r.endpoint}</td>
                      <td className="py-2 px-3">
                        <StatusBadge type="status" value={r.status_code} />
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-blue-700">{r.response_time_ms} ms</td>
                      <td className="py-2 px-3 font-mono">{r.cpu_usage}%</td>
                      <td className="py-2 px-3 font-mono">{r.memory_usage}%</td>
                      <td className="py-2 px-3">
                        <StatusBadge type="workload" value={r.workload || 'General'} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------------- */}
      {/* SECTION B: LOAD TESTING                                                          */}
      {/* -------------------------------------------------------------------------------- */}
      {activeTab === 'loadtest' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Load Test Configurator */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 p-5 shadow-card">
              <h3 className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-600" /> Asynchronous Stress & Load Generation
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Executes controlled concurrent requests using Python `httpx.AsyncClient` with bounded worker concurrency to empirically analyze server degradation.
              </p>

              {/* Target Endpoint */}
              <div className="mb-4">
                <label className="text-xs font-semibold text-slate-600 block mb-1">Target Endpoint</label>
                <input
                  type="text"
                  value={ltUrl}
                  onChange={(e) => setLtUrl(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              {/* Sliders Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-slate-700">Concurrency</label>
                    <span className="text-xs font-bold text-blue-600 font-mono">{concurrency} workers</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={concurrency}
                    onChange={(e) => setConcurrency(Number(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Parallel connection workers (1 - 50)</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-slate-700">Total Requests</label>
                    <span className="text-xs font-bold text-cyan-600 font-mono">{totalRequests} calls</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="200"
                    step="10"
                    value={totalRequests}
                    onChange={(e) => setTotalRequests(Number(e.target.value))}
                    className="w-full accent-cyan-600 cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Total requests dispatched (10 - 200)</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-slate-700">Timeout Ceiling</label>
                    <span className="text-xs font-bold text-indigo-600 font-mono">{timeoutSec}s</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="15.0"
                    step="0.5"
                    value={timeoutSec}
                    onChange={(e) => setTimeoutSec(Number(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Per-request HTTP timeout</p>
                </div>
              </div>

              {loadTestError && (
                <div className="p-3 mb-4 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{loadTestError}</span>
                </div>
              )}

              <button
                onClick={handleExecuteLoadTest}
                disabled={isLoadTesting}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-semibold text-xs tracking-wide shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoadTesting ? (
                  <LoadingSpinner size="sm" message="" />
                ) : (
                  <Zap className="w-3.5 h-3.5 fill-current" />
                )}
                {isLoadTesting ? `Executing Load Test (${concurrency} workers)...` : 'Launch Controlled Load Test'}
              </button>
            </div>

            {/* Load Test Summary Result */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-card">
              <h3 className="text-sm font-bold text-slate-800 mb-1">Load Test Benchmark</h3>
              <p className="text-xs text-slate-400 mb-4">Empirical throughput and percentile metrics</p>

              {loadTestResult ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 bg-cyan-50 rounded-lg border border-cyan-100">
                      <p className="text-[11px] text-cyan-800">Throughput</p>
                      <p className="text-base font-bold text-cyan-900 font-mono">
                        {loadTestResult.throughput_rps} rps
                      </p>
                    </div>

                    <div className="p-2.5 bg-blue-50 rounded-lg border border-blue-100">
                      <p className="text-[11px] text-blue-800">Avg Latency</p>
                      <p className="text-base font-bold text-blue-900 font-mono">
                        {loadTestResult.avg_response_time_ms} ms
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 bg-violet-50 rounded-lg border border-violet-100">
                      <p className="text-[11px] text-violet-800">P95 Latency</p>
                      <p className="text-base font-bold text-violet-900 font-mono">
                        {loadTestResult.p95_response_time_ms} ms
                      </p>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                      <p className="text-[11px] text-slate-600">Error Rate</p>
                      <p
                        className={`text-base font-bold font-mono ${
                          loadTestResult.error_rate_pct > 0 ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        {loadTestResult.error_rate_pct}%
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-600 space-y-1">
                    <div className="flex justify-between">
                      <span>Total Requests / Success:</span>
                      <span className="font-bold text-slate-800">
                        {loadTestResult.total_requests} / {loadTestResult.successful_requests}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Min / Max Latency:</span>
                      <span className="font-mono text-slate-800">
                        {loadTestResult.min_response_time_ms}ms / {loadTestResult.max_response_time_ms}ms
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Duration:</span>
                      <span className="font-mono text-slate-800">{loadTestResult.duration_sec} sec</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-48 border border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center text-center p-4 text-slate-400">
                  <Clock className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-xs">Configure parameters and run a load test to view live throughput metrics.</p>
                </div>
              )}
            </div>
          </div>

          {/* Individual Results Latency Chart from Load Test */}
          {loadTestResult && loadTestResult.individual_results && (
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-card">
              <h3 className="text-sm font-bold text-slate-800 mb-1">Individual Request Latency Progression</h3>
              <p className="text-xs text-slate-400 mb-4">
                Sequential response time (ms) for all {loadTestResult.individual_results.length} dispatched requests
              </p>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={loadTestResult.individual_results.map((item, idx) => ({
                      reqIndex: idx + 1,
                      latency: item.response_time_ms,
                      status: item.status_code,
                    }))}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="reqIndex" tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white p-2 rounded-lg shadow-md border border-slate-200 text-xs">
                              <p className="font-bold text-slate-800">Request #{data.reqIndex}</p>
                              <p className="text-cyan-600 font-semibold">Latency: {data.latency} ms</p>
                              <p className="text-slate-500">Status: {data.status}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="latency"
                      stroke="#06b6d4"
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Past Load Test History Runs */}
          {pastRuns.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-card">
              <h3 className="text-sm font-bold text-slate-800 mb-3">Load Test Run Log</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold">
                      <th className="py-2 px-3">Timestamp</th>
                      <th className="py-2 px-3">Target Endpoint</th>
                      <th className="py-2 px-3">Concurrency</th>
                      <th className="py-2 px-3">Total Reqs</th>
                      <th className="py-2 px-3">Throughput</th>
                      <th className="py-2 px-3">Avg Latency</th>
                      <th className="py-2 px-3">P95 Latency</th>
                      <th className="py-2 px-3">Errors</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pastRuns.map((run, i) => (
                      <tr key={run.id || i} className="hover:bg-slate-50/70">
                        <td className="py-2 px-3 font-mono text-slate-500 text-[11px]">{run.timestamp}</td>
                        <td className="py-2 px-3 font-mono text-slate-700 truncate max-w-xs">{run.target_url}</td>
                        <td className="py-2 px-3 font-semibold text-blue-700">{run.concurrency} w</td>
                        <td className="py-2 px-3 font-mono">{run.total_requests}</td>
                        <td className="py-2 px-3 font-mono font-bold text-cyan-700">{run.throughput_rps} rps</td>
                        <td className="py-2 px-3 font-mono">{run.avg_response_time_ms} ms</td>
                        <td className="py-2 px-3 font-mono">{run.p95_response_time_ms} ms</td>
                        <td className="py-2 px-3">
                          <span
                            className={`font-semibold ${
                              run.error_rate_pct > 0 ? 'text-rose-600' : 'text-emerald-600'
                            }`}
                          >
                            {run.error_rate_pct}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* -------------------------------------------------------------------------------- */}
      {/* SECTION C: HOST SERVER MONITORING                                                */}
      {/* -------------------------------------------------------------------------------- */}
      {activeTab === 'monitoring' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Host CPU</span>
                <Cpu className="w-5 h-5 text-indigo-600" />
              </div>
              <h3 className="text-3xl font-bold text-slate-900 font-mono">
                {serverMetrics ? `${serverMetrics.cpu_usage}%` : '--'}
              </h3>
              <p className="text-xs text-slate-400 mt-2">Captured via psutil.cpu_percent</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Host Memory</span>
                <Server className="w-5 h-5 text-cyan-600" />
              </div>
              <h3 className="text-3xl font-bold text-slate-900 font-mono">
                {serverMetrics ? `${serverMetrics.memory_usage}%` : '--'}
              </h3>
              <p className="text-xs text-slate-400 mt-2">
                {serverMetrics
                  ? `Available: ${serverMetrics.available_memory_mb} MB / Total: ${serverMetrics.total_memory_mb} MB`
                  : 'psutil.virtual_memory'}
              </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Telemetry Scope</span>
                <Activity className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Local Host Machine</h3>
              <p className="text-xs text-emerald-600 font-medium mt-2 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> psutil Daemon Polling Live
              </p>
            </div>
          </div>

          {/* Real-time Hardware Load Timeline */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Resource Utilization Timeline</h3>
                <p className="text-xs text-slate-400">Continuous CPU and Memory tracking (psutil snapshot series)</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`text-xs px-2.5 py-1 rounded-md font-medium border ${
                    autoRefresh
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {autoRefresh ? '● Auto-Polling (Active)' : '○ Polling Paused'}
                </button>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monitoringHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="monCpuGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="monMemGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="time" tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis domain={[0, 100]} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="cpu" name="CPU %" stroke="#4f46e5" strokeWidth={2} fill="url(#monCpuGrad)" />
                  <Area type="monotone" dataKey="memory" name="RAM %" stroke="#06b6d4" strokeWidth={2} fill="url(#monMemGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------------- */}
      {/* SECTION D: DATA PREPROCESSING & IQR CLEANING                                      */}
      {/* -------------------------------------------------------------------------------- */}
      {activeTab === 'preprocess' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Upload or Select Dataset Card */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-card">
              <h3 className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-blue-600" /> 1. Dataset Input Source
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Upload a custom CSV file or use the current {records.length} SQLite telemetry records.
              </p>

              {/* Upload Input */}
              <label className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50/60 mb-4 text-center">
                <FileSpreadsheet className="w-8 h-8 text-blue-500 mb-2" />
                <span className="text-xs font-semibold text-slate-700">Click to upload CSV</span>
                <span className="text-[11px] text-slate-400 mt-1">Accepts telemetry or workload CSV files</span>
                <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
              </label>

              {isUploading && <LoadingSpinner size="sm" message="Parsing CSV structure..." />}

              {uploadedData && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 text-xs text-blue-800 mb-3">
                  <p className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" /> {uploadedData.filename}
                  </p>
                  <p className="mt-1 text-[11px] text-blue-600">
                    Parsed {uploadedData.row_count} rows across {uploadedData.columns.length} columns.
                  </p>
                </div>
              )}

              {!uploadedData && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600">
                  <p className="font-medium text-slate-800">Source: Stored SQLite Metrics</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Using active database with {records.length} records.
                  </p>
                </div>
              )}
            </div>

            {/* Pipeline Configuration Card */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 p-5 shadow-card">
              <h3 className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-2">
                <Filter className="w-4 h-4 text-indigo-600" /> 2. Preprocessing & Outlier Rules
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Configure data normalization, missing imputation, duplicate stripping, and academic IQR threshold boundaries.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                {/* Missing Values */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="text-xs font-bold text-slate-700 block mb-1">Missing Value Policy</label>
                  <select
                    value={handleMissing}
                    onChange={(e) => setHandleMissing(e.target.value as 'impute' | 'drop')}
                    className="w-full text-xs font-medium rounded-lg border border-slate-300 p-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="impute">Impute with Column Median</option>
                    <option value="drop">Drop Incomplete Rows</option>
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">Preserves sample distribution</p>
                </div>

                {/* Duplicates */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Deduplication</label>
                    <p className="text-[11px] text-slate-500">Remove duplicate trace rows</p>
                  </div>
                  <label className="inline-flex items-center gap-2 mt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={removeDuplicates}
                      onChange={(e) => setRemoveDuplicates(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                    <span className="text-xs font-semibold text-slate-700">Strip Duplicates</span>
                  </label>
                </div>

                {/* IQR Outlier Detection */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">IQR Outlier Detection</label>
                    <p className="text-[10px] text-slate-500 font-mono">Q1 - 1.5×IQR to Q3 + 1.5×IQR</p>
                  </div>
                  <label className="inline-flex items-center gap-2 mt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={detectOutliers}
                      onChange={(e) => setDetectOutliers(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                    <span className="text-xs font-semibold text-slate-700">Tag Statistical Outliers</span>
                  </label>
                </div>
              </div>

              {preprocessError && (
                <div className="p-3 mb-4 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{preprocessError}</span>
                </div>
              )}

              <button
                onClick={handleRunPreprocessing}
                disabled={isPreprocessing}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-semibold text-xs tracking-wide shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isPreprocessing ? <LoadingSpinner size="sm" message="" /> : <Sparkles className="w-3.5 h-3.5" />}
                {isPreprocessing ? 'Executing Preprocessing Pipeline...' : 'Run Module 1 Preprocessing Pipeline'}
              </button>
            </div>
          </div>

          {/* Audit Results Section */}
          {preprocessResult && (
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-card space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Data Preprocessing Audit & Verification
                  </h3>
                  <p className="text-xs text-slate-400">
                    Mathematical validation produced by backend `analytics.preprocess_dataset()`
                  </p>
                </div>
                <button
                  onClick={handleDownloadCleanedCsv}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs tracking-wide shadow-sm transition-all flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <Download className="w-3.5 h-3.5" /> Download Cleaned CSV
                </button>
              </div>

              {/* Before vs After Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[11px] text-slate-500">Initial Rows</span>
                  <p className="text-lg font-bold text-slate-800 font-mono">
                    {preprocessResult.audit.initial_rows}
                  </p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <span className="text-[11px] text-emerald-700">Cleaned Rows</span>
                  <p className="text-lg font-bold text-emerald-800 font-mono">
                    {preprocessResult.audit.final_rows}
                  </p>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                  <span className="text-[11px] text-blue-700">Duplicates Removed</span>
                  <p className="text-lg font-bold text-blue-800 font-mono">
                    {preprocessResult.audit.duplicates_removed}
                  </p>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <span className="text-[11px] text-amber-700">Total Outliers Flagged</span>
                  <p className="text-lg font-bold text-amber-800 font-mono">
                    {Object.values(preprocessResult.audit.iqr_outliers_detected || {}).reduce((a, b) => a + b, 0)}
                  </p>
                </div>
              </div>

              {/* IQR Boundary Calculations Table */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Interquartile Range (IQR) Boundary Calculations
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                        <th className="py-2 px-3">Metric Feature</th>
                        <th className="py-2 px-3">Q1 (25th)</th>
                        <th className="py-2 px-3">Q3 (75th)</th>
                        <th className="py-2 px-3">IQR (Q3 - Q1)</th>
                        <th className="py-2 px-3">Lower Fence (Q1 - 1.5×IQR)</th>
                        <th className="py-2 px-3">Upper Fence (Q3 + 1.5×IQR)</th>
                        <th className="py-2 px-3 text-right">Outliers Flagged</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {Object.entries(preprocessResult.audit.iqr_bounds || {}).map(([col, b]) => (
                        <tr key={col} className="hover:bg-slate-50/70">
                          <td className="py-2 px-3 font-sans font-semibold text-slate-800">{col}</td>
                          <td className="py-2 px-3 text-slate-600">{b.q1}</td>
                          <td className="py-2 px-3 text-slate-600">{b.q3}</td>
                          <td className="py-2 px-3 text-blue-700 font-bold">{b.iqr}</td>
                          <td className="py-2 px-3 text-amber-700">{b.lower_bound}</td>
                          <td className="py-2 px-3 text-amber-700">{b.upper_bound}</td>
                          <td className="py-2 px-3 text-right font-bold text-rose-600">
                            {preprocessResult.audit.iqr_outliers_detected?.[col] ?? 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Cleaned Dataset Preview */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Cleaned Dataset Preview (First 8 Records)
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse font-mono">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-sans font-semibold">
                        <th className="py-2 px-3">Timestamp</th>
                        <th className="py-2 px-3">Endpoint</th>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3">Latency (ms)</th>
                        <th className="py-2 px-3">CPU %</th>
                        <th className="py-2 px-3">RAM %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {preprocessResult.cleaned_records.slice(0, 8).map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50/70">
                          <td className="py-2 px-3 text-slate-500 text-[11px]">{r.timestamp}</td>
                          <td className="py-2 px-3 text-slate-700 truncate max-w-xs">{r.endpoint}</td>
                          <td className="py-2 px-3">
                            <StatusBadge type="status" value={r.status_code} />
                          </td>
                          <td className="py-2 px-3 font-bold text-blue-700">{r.response_time_ms} ms</td>
                          <td className="py-2 px-3">{r.cpu_usage}%</td>
                          <td className="py-2 px-3">{r.memory_usage}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
