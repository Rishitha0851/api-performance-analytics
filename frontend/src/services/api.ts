import axios, { AxiosError } from 'axios';
import {
  BackendHealth,
  ServerMetrics,
  SingleMeasureRequest,
  MetricRecord,
  LoadTestRequest,
  LoadTestResponse,
  DescriptiveStatistics,
  CorrelationAnalysisResponse,
  BottleneckResponse,
  PreprocessResponse,
} from '../types/api';

// Primary backend URL: http://127.0.0.1:8000
const PRIMARY_BACKEND_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export const apiClient = axios.create({
  baseURL: PRIMARY_BACKEND_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 15000,
});

// Automatic fallback interceptor:
// If request to http://127.0.0.1:8000 encounters a network error (e.g. browser PNA or port boundary),
// retry transparently via the relative Vite dev proxy ('') so the application never breaks.
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config: any = error.config;
    // Check if network error and not already retried
    if ((!error.response || error.code === 'ERR_NETWORK') && config && !config._retryWithProxy) {
      config._retryWithProxy = true;
      try {
        console.warn(`Direct connection to ${PRIMARY_BACKEND_URL} failed, retrying via local Vite proxy fallback...`);
        // Change baseURL to empty string to use Vite proxy
        config.baseURL = '';
        return await axios.request(config);
      } catch (proxyError) {
        return Promise.reject(proxyError);
      }
    }
    return Promise.reject(error);
  }
);

export const apiService = {
  // Health & Server Monitoring
  async checkHealth(): Promise<BackendHealth> {
    const res = await apiClient.get<BackendHealth>('/api/health');
    return res.data;
  },

  async getServerMetrics(): Promise<ServerMetrics> {
    const res = await apiClient.get<ServerMetrics>('/api/server-metrics');
    return res.data;
  },

  // Module 1: Measurement & Load Testing
  async measureRequest(req: SingleMeasureRequest): Promise<MetricRecord> {
    const res = await apiClient.post<MetricRecord>('/api/measure', req);
    return res.data;
  },

  async runLoadTest(req: LoadTestRequest): Promise<LoadTestResponse> {
    const res = await apiClient.post<LoadTestResponse>('/api/load-test', req);
    return res.data;
  },

  async getLoadTestRuns(limit: number = 20): Promise<any[]> {
    try {
      const res = await apiClient.get<{ runs: any[] }>(`/api/load-test/runs?limit=${limit}`);
      return res.data.runs || [];
    } catch {
      return [];
    }
  },

  // Records & Dataset Operations
  async getRecords(limit: number = 2000, workload?: string): Promise<{ count: number; records: MetricRecord[] }> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (workload && workload !== 'All') params.append('workload', workload);
    const res = await apiClient.get<{ count: number; records: MetricRecord[] }>(`/api/data/records?${params.toString()}`);
    return res.data;
  },

  async seedSampleData(count: number = 600, force: boolean = false): Promise<{ status: string; inserted: number; count: number; message?: string; workloads: string[] }> {
    const res = await apiClient.post(`/api/sample-data/seed?n=${count}&force=${force}`);
    return res.data;
  },

  async clearDatabase(): Promise<{ status: string }> {
    const res = await apiClient.post<{ status: string }>('/api/data/clear');
    return res.data;
  },

  async uploadCsv(file: File): Promise<{ filename: string; row_count: number; columns: string[]; records: any[] }> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post('/api/data/upload-csv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  async exportCsv(workload?: string): Promise<string> {
    const params = new URLSearchParams();
    if (workload && workload !== 'All') params.append('workload', workload);
    const res = await apiClient.get<{ csv: string; count: number }>(`/api/data/export-csv?${params.toString()}`);
    return res.data.csv;
  },

  async exportStatsCsv(): Promise<string> {
    const res = await apiClient.get<{ csv: string; count: number }>('/api/data/export-stats-csv');
    return res.data.csv;
  },

  async preprocessData(payload: {
    records: any[];
    column_mapping?: Record<string, string>;
    handle_missing?: string;
    remove_duplicates?: boolean;
    detect_outliers?: boolean;
  }): Promise<PreprocessResponse> {
    const res = await apiClient.post<PreprocessResponse>('/api/preprocess', {
      records: payload.records,
      column_mapping: payload.column_mapping,
      handle_missing: payload.handle_missing ?? 'impute',
      remove_duplicates: payload.remove_duplicates ?? true,
      detect_outliers: payload.detect_outliers ?? true,
    });
    return res.data;
  },

  // Module 2: Analytics
  async getDescriptiveStats(records?: MetricRecord[]): Promise<{ statistics: DescriptiveStatistics; record_count: number; error?: string }> {
    const payload = records && records.length > 0 ? records : null;
    const res = await apiClient.post<{ statistics: DescriptiveStatistics; record_count: number; error?: string }>(
      '/api/analysis/descriptive',
      payload
    );
    return res.data;
  },

  async getCorrelationAnalysis(records?: MetricRecord[]): Promise<CorrelationAnalysisResponse> {
    const payload = records && records.length > 0 ? records : null;
    const res = await apiClient.post<CorrelationAnalysisResponse>(
      '/api/analysis/correlation',
      payload
    );
    return res.data;
  },

  async getBottlenecks(config: {
    rt_threshold_ms?: number;
    cpu_threshold_pct?: number;
    mem_threshold_pct?: number;
    error_threshold_pct?: number;
    records?: MetricRecord[];
  }): Promise<BottleneckResponse> {
    const res = await apiClient.post<BottleneckResponse>('/api/analysis/bottlenecks', {
      rt_threshold_ms: config.rt_threshold_ms ?? 1000.0,
      cpu_threshold_pct: config.cpu_threshold_pct ?? 80.0,
      mem_threshold_pct: config.mem_threshold_pct ?? 85.0,
      error_threshold_pct: config.error_threshold_pct ?? 5.0,
      records: config.records && config.records.length > 0 ? config.records : null,
    });
    return res.data;
  },

  // PDF Report Generation
  async downloadPdfReport(params: {
    rt_threshold_ms?: number;
    cpu_threshold_pct?: number;
    mem_threshold_pct?: number;
    error_threshold_pct?: number;
  }): Promise<Blob> {
    const query = new URLSearchParams({
      rt_threshold_ms: (params.rt_threshold_ms ?? 1000.0).toString(),
      cpu_threshold_pct: (params.cpu_threshold_pct ?? 80.0).toString(),
      mem_threshold_pct: (params.mem_threshold_pct ?? 85.0).toString(),
      error_threshold_pct: (params.error_threshold_pct ?? 5.0).toString(),
    });

    const res = await apiClient.post(`/api/report/generate-pdf?${query.toString()}`, null, {
      responseType: 'blob',
    });
    return res.data;
  },
};
