import React, { useState } from 'react';
import {
  FileText,
  Download,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  Clock,
  Layers,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { apiService } from '../services/api';
import { MetricRecord, BottleneckFinding } from '../types/api';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface ReportsDownloadsProps {
  records: MetricRecord[];
  bottlenecks: BottleneckFinding[];
  onSeedData: () => void;
  onClearData: () => void;
}

export const ReportsDownloads: React.FC<ReportsDownloadsProps> = ({
  records,
  bottlenecks,
  onSeedData,
  onClearData,
}) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [isExportingStatsCsv, setIsExportingStatsCsv] = useState(false);
  const [pdfSuccess, setPdfSuccess] = useState(false);
  const [csvSuccess, setCsvSuccess] = useState(false);
  const [statsCsvSuccess, setStatsCsvSuccess] = useState(false);
  const [selectedWorkload, setSelectedWorkload] = useState('All');

  // PDF report configurable thresholds
  const [rtThreshold, setRtThreshold] = useState(1000);
  const [cpuThreshold, setCpuThreshold] = useState(80);
  const [memThreshold, setMemThreshold] = useState(85);
  const [errorThreshold, setErrorThreshold] = useState(5);

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    setPdfSuccess(false);
    try {
      const blob = await apiService.downloadPdfReport({
        rt_threshold_ms: rtThreshold,
        cpu_threshold_pct: cpuThreshold,
        mem_threshold_pct: memThreshold,
        error_threshold_pct: errorThreshold,
      });

      // Create download anchor
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'API_Performance_Academic_Report.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setPdfSuccess(true);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      alert('Error generating PDF report. Make sure backend is running.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownloadCsv = async () => {
    setIsExportingCsv(true);
    setCsvSuccess(false);
    try {
      const csvStr = await apiService.exportCsv(selectedWorkload);
      const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        selectedWorkload === 'All'
          ? 'api_performance_metrics.csv'
          : `api_performance_${selectedWorkload.toLowerCase()}.csv`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setCsvSuccess(true);
    } catch (err) {
      console.error('Failed to export CSV:', err);
      alert('Error exporting CSV.');
    } finally {
      setIsExportingCsv(false);
    }
  };

  const handleDownloadStatsCsv = async () => {
    setIsExportingStatsCsv(true);
    setStatsCsvSuccess(false);
    try {
      const csvStr = await apiService.exportStatsCsv();
      const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'academic_statistical_summary.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setStatsCsvSuccess(true);
    } catch (err) {
      console.error('Failed to export stats CSV:', err);
      alert('Error exporting statistical summary CSV.');
    } finally {
      setIsExportingStatsCsv(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-card">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold uppercase tracking-wider mb-2 border border-amber-200">
          <FileText className="w-3.5 h-3.5" /> Research Deliverables & Exports
        </div>
        <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
          Reports & Analytical Downloads
        </h2>
        <p className="text-xs md:text-sm text-slate-500 mt-1">
          Export formal academic PDF reports with embedded parametric distributions, correlation tables, and empirical SQLite raw datasets.
        </p>
      </div>

      {/* Main Download Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PDF Academic Report Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-card flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white mb-4 shadow-md shadow-rose-500/20">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Academic Research Report (PDF)
            </h3>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              Generates a formal multi-page PDF document incorporating mathematical equations, descriptive statistics summary, Pearson/Spearman correlation matrices, and detected bottlenecks with remediation strategies.
            </p>

            {/* Configurable Thresholds for PDF */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 mb-5">
              <h4 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                Report SLA Thresholds:
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[11px] text-slate-500">Latency Limit:</span>
                  <input
                    type="number"
                    value={rtThreshold}
                    onChange={(e) => setRtThreshold(Number(e.target.value))}
                    className="w-full mt-0.5 p-1.5 border border-slate-300 rounded font-mono text-xs bg-white"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-slate-500">CPU Limit (%):</span>
                  <input
                    type="number"
                    value={cpuThreshold}
                    onChange={(e) => setCpuThreshold(Number(e.target.value))}
                    className="w-full mt-0.5 p-1.5 border border-slate-300 rounded font-mono text-xs bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-600 mb-5">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Executive Summary & System Telemetry</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Descriptive Statistics Table (Mean, Std, IQR, P95, P99)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Pearson & Spearman Correlation Analysis</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Automated Performance Bottlenecks & Optimization Guidelines</span>
              </div>
            </div>
          </div>

          <div>
            {pdfSuccess && (
              <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>PDF generated and downloaded successfully!</span>
              </div>
            )}
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white font-bold text-xs tracking-wider uppercase shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isGeneratingPdf ? <LoadingSpinner size="sm" message="" /> : <Download className="w-4 h-4" />}
              {isGeneratingPdf ? 'Compiling Academic PDF...' : 'Download Academic Research PDF'}
            </button>
          </div>
        </div>

        {/* Raw Dataset Export (CSV) Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-card flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white mb-4 shadow-md shadow-emerald-500/20">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Empirical Dataset Export (CSV)
            </h3>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              Export recorded telemetry observations from the SQLite persistence table (`api_metrics`). Filter by specific workload stress stage or export the comprehensive dataset.
            </p>

            {/* Filter by Workload */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 mb-5">
              <label className="text-xs font-bold text-slate-700 mb-2 block uppercase tracking-wider">
                Filter by Workload Stage:
              </label>
              <select
                value={selectedWorkload}
                onChange={(e) => setSelectedWorkload(e.target.value)}
                className="w-full p-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="All">All Workload Stages (Full Corpus)</option>
                <option value="Normal">Normal Workload Stage</option>
                <option value="Moderate">Moderate Workload Stage</option>
                <option value="High">High Workload Stage</option>
                <option value="Heavy">Heavy Stress Workload Stage</option>
              </select>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 mb-5 space-y-1 font-mono">
              <div className="flex justify-between">
                <span>Total Stored Records:</span>
                <span className="font-bold text-slate-900">{records.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Format:</span>
                <span className="text-slate-700">RFC 4180 CSV (UTF-8)</span>
              </div>
              <div className="flex justify-between">
                <span>Schema:</span>
                <span className="text-slate-700">10 standard telemetry columns</span>
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            {csvSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Telemetry CSV dataset exported successfully!</span>
              </div>
            )}
            {statsCsvSuccess && (
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg text-xs text-teal-700 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-teal-600" />
                <span>Statistical summary CSV exported successfully!</span>
              </div>
            )}
            <button
              onClick={handleDownloadCsv}
              disabled={isExportingCsv || records.length === 0}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs tracking-wider uppercase shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isExportingCsv ? <LoadingSpinner size="sm" message="" /> : <Download className="w-4 h-4" />}
              {isExportingCsv ? 'Extracting Records...' : 'Export Telemetry CSV Dataset'}
            </button>
            <button
              onClick={handleDownloadStatsCsv}
              disabled={isExportingStatsCsv}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs tracking-wider uppercase border border-slate-300 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isExportingStatsCsv ? <LoadingSpinner size="sm" message="" /> : <Download className="w-4 h-4" />}
              {isExportingStatsCsv ? 'Extracting Statistics...' : 'Export Statistical Summary CSV'}
            </button>
          </div>
        </div>
      </div>

      {/* Academic Methodology & Research Summary Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-card">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
          <BookOpen className="w-4 h-4 text-blue-600" /> Academic Project Methodology Overview
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600 leading-relaxed">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <h4 className="font-bold text-slate-800 mb-1">Module 1: Telemetry & Ingestion</h4>
            <p>
              Captures live HTTP transaction latency via microsecond precision timers, asynchronously stresses endpoints under varying concurrency loads, and conducts interquartile range (IQR) data scrubbing.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <h4 className="font-bold text-slate-800 mb-1">Module 2: Statistical Inference</h4>
            <p>
              Computes parametric (mean, standard deviation, variance) and non-parametric (median, IQR, percentiles) indicators, bivariate Pearson linear correlations, and Spearman rank monotonic associations.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <h4 className="font-bold text-slate-800 mb-1">Multi-Tier Bottleneck Engine</h4>
            <p>
              Applies automated heuristic decision matrices and dynamic rolling Z-scores to flag SLA degradations, CPU thrashing, memory leaks, and burst queueing bottlenecks with targeted remedies.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
