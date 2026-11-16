export interface MetricRecord {
  id?: number;
  timestamp: string;
  endpoint: string;
  method: string;
  status_code: number;
  response_time_ms: number;
  response_size_bytes?: number;
  request_frequency?: number;
  cpu_usage: number;
  memory_usage: number;
  workload?: string;
  is_simulated?: number;
  error?: string | null;
}

export interface ServerMetrics {
  timestamp: string;
  cpu_usage: number;
  memory_usage: number;
  available_memory_mb: number;
  total_memory_mb: number;
  metric_scope: string;
}

export interface SingleMeasureRequest {
  url: string;
  method: string;
  headers?: Record<string, string>;
  payload?: any;
  timeout_sec?: number;
  record_to_db?: boolean;
}

export interface LoadTestRequest {
  target_url: string;
  method: string;
  concurrency: number;
  total_requests: number;
  timeout_sec?: number;
  headers?: Record<string, string>;
  payload?: any;
  record_to_db?: boolean;
}

export interface LoadTestResultItem {
  request_id: number;
  status_code: number;
  response_time_ms: number;
  response_size_bytes: number;
  timestamp: string;
  error?: string | null;
}

export interface LoadTestResponse {
  target_url: string;
  method: string;
  concurrency: number;
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  duration_sec: number;
  throughput_rps: number;
  error_rate_pct: number;
  avg_response_time_ms: number;
  p95_response_time_ms: number;
  min_response_time_ms: number;
  max_response_time_ms: number;
  timestamp: string;
  individual_results: LoadTestResultItem[];
}

export interface DescriptiveStatMetric {
  count: number;
  mean: number;
  median: number;
  mode: number;
  min: number;
  max: number;
  range: number;
  variance: number;
  std: number;
  q1: number;
  q3: number;
  iqr: number;
  p50: number;
  p90: number;
  p95: number;
  p99: number;
}

export type DescriptiveStatistics = Record<string, DescriptiveStatMetric>;

export interface PairwiseCorrelation {
  label: string;
  col1: string;
  col2: string;
  pearson_r: number;
  pearson_p: number;
  spearman_rho: number;
  spearman_p: number;
  strength: string;
  direction: string;
  significance: string;
  impact_explanation: string;
}

export interface CorrelationAnalysisResponse {
  columns: string[];
  pearson_matrix: Record<string, Record<string, number>>;
  spearman_matrix: Record<string, Record<string, number>>;
  pairwise_analysis: PairwiseCorrelation[];
  error?: string;
}

export interface BottleneckFinding {
  bottleneck_name: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Normal';
  observed_metric: string;
  threshold: string;
  explanation: string;
  suggested_optimization: string;
}

export interface BottleneckResponse {
  findings: BottleneckFinding[];
  record_count: number;
  error?: string;
}

export interface PreprocessAudit {
  initial_rows: number;
  final_rows: number;
  duplicates_removed: number;
  missing_values_handled: Record<string, number>;
  iqr_outliers_detected: Record<string, number>;
  iqr_bounds: Record<string, { q1: number; q3: number; iqr: number; lower_bound: number; upper_bound: number }>;
  cleaned_columns: string[];
}

export interface PreprocessResponse {
  audit: PreprocessAudit;
  cleaned_records: MetricRecord[];
}

export interface BackendHealth {
  status: string;
  service: string;
  timestamp: string;
}
