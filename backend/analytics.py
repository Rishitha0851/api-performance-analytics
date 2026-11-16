"""
Statistical Analysis and Data Preprocessing Engine.
Implements:
- Module 1: Preprocessing, IQR outlier detection, frequency calculation
- Module 2: Descriptive statistics, Pearson/Spearman correlation, bottleneck identification
- Sample dataset generation with 4 workloads
"""

import os
import numpy as np
import pandas as pd
from scipy import stats
from typing import Dict, Any, List, Optional, Tuple

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))
SAMPLE_CSV_PATH = os.path.join(DATA_DIR, "sample_dataset.csv")

STANDARD_COLUMNS = [
    "timestamp",
    "endpoint",
    "method",
    "status_code",
    "response_time_ms",
    "request_frequency",
    "cpu_usage",
    "memory_usage",
    "workload",
    "is_simulated"
]

def generate_sample_dataset(n_samples: int = 600) -> pd.DataFrame:
    """
    Generates a reproducible, academic-grade sample dataset with 4 workload stages:
    Normal, Moderate, High, Heavy.
    Clearly labels records with is_simulated=1.
    """
    np.random.seed(42)
    os.makedirs(DATA_DIR, exist_ok=True)
    
    samples_per_workload = max(1, n_samples // 4)
    workload_configs = [
        {
            "name": "Normal",
            "count": samples_per_workload,
            "rt_mean": 65.0,
            "rt_std": 15.0,
            "rt_min": 35.0,
            "freq_mean": 6.0,
            "freq_std": 2.0,
            "freq_min": 1.0,
            "cpu_mean": 24.0,
            "cpu_std": 5.0,
            "mem_mean": 45.0,
            "mem_std": 3.0,
            "error_prob": 0.00
        },
        {
            "name": "Moderate",
            "count": samples_per_workload,
            "rt_mean": 185.0,
            "rt_std": 45.0,
            "rt_min": 90.0,
            "freq_mean": 22.0,
            "freq_std": 4.0,
            "freq_min": 10.0,
            "cpu_mean": 48.0,
            "cpu_std": 7.0,
            "mem_mean": 56.0,
            "mem_std": 4.0,
            "error_prob": 0.02
        },
        {
            "name": "High",
            "count": samples_per_workload,
            "rt_mean": 520.0,
            "rt_std": 140.0,
            "rt_min": 250.0,
            "freq_mean": 48.0,
            "freq_std": 8.0,
            "freq_min": 25.0,
            "cpu_mean": 72.0,
            "cpu_std": 6.0,
            "mem_mean": 68.0,
            "mem_std": 5.0,
            "error_prob": 0.06
        },
        {
            "name": "Heavy",
            "count": n_samples - (samples_per_workload * 3), # remainder
            "rt_mean": 1280.0,
            "rt_std": 380.0,
            "rt_min": 650.0,
            "freq_mean": 82.0,
            "freq_std": 12.0,
            "freq_min": 50.0,
            "cpu_mean": 88.0,
            "cpu_std": 6.0,
            "mem_mean": 84.0,
            "mem_std": 6.0,
            "error_prob": 0.14
        }
    ]

    endpoints = [
        "/api/v1/auth/login",
        "/api/v1/users/profile",
        "/api/v1/products/search",
        "/api/v1/orders/create",
        "/api/v1/analytics/report"
    ]
    methods = ["GET", "GET", "GET", "POST", "GET"]

    rows = []
    base_time = pd.Timestamp.now() - pd.Timedelta(minutes=n_samples // 10)
    current_time = base_time

    for config in workload_configs:
        w_name = config["name"]
        cnt = config["count"]

        # Synthetic values with realistic physics-based correlation
        rt = np.clip(np.random.normal(config["rt_mean"], config["rt_std"], cnt), config["rt_min"], 4500.0)
        freq = np.clip(np.random.normal(config["freq_mean"], config["freq_std"], cnt), config["freq_min"], 150.0)
        
        # Add slight correlation noise: higher frequency elevates CPU and response time
        cpu = np.clip(
            np.random.normal(config["cpu_mean"], config["cpu_std"], cnt) + (freq - config["freq_mean"]) * 0.25,
            10.0, 99.5
        )
        mem = np.clip(
            np.random.normal(config["mem_mean"], config["mem_std"], cnt) + (cpu - config["cpu_mean"]) * 0.15,
            20.0, 98.0
        )

        for i in range(cnt):
            current_time += pd.Timedelta(seconds=np.random.randint(1, 4))
            ep_idx = np.random.choice(len(endpoints), p=[0.2, 0.25, 0.3, 0.15, 0.1])
            endpoint = endpoints[ep_idx]
            method = methods[ep_idx]

            # Assign status code
            if np.random.rand() < config["error_prob"]:
                status_code = np.random.choice([429, 500, 503, 504], p=[0.4, 0.3, 0.2, 0.1])
                # Failed requests often have delayed timeout or fast circuit break
                if status_code in [504, 503]:
                    rt[i] += 1200.0
            else:
                status_code = 200

            response_size = int(np.random.choice([420, 1250, 3400, 8900, 15400]) * (1 + 0.1 * np.random.randn()))
            response_size = max(128, response_size)

            rows.append({
                "timestamp": current_time.strftime("%Y-%m-%d %H:%M:%S"),
                "endpoint": endpoint,
                "method": method,
                "status_code": int(status_code),
                "response_time_ms": round(float(rt[i]), 2),
                "response_size_bytes": int(response_size),
                "request_frequency": round(float(freq[i]), 2),
                "cpu_usage": round(float(cpu[i]), 2),
                "memory_usage": round(float(mem[i]), 2),
                "workload": w_name,
                "is_simulated": 1
            })

    df = pd.DataFrame(rows)
    df.to_csv(SAMPLE_CSV_PATH, index=False)
    return df

def compute_descriptive_statistics(df: pd.DataFrame, columns: Optional[List[str]] = None) -> Dict[str, Dict[str, Any]]:
    """
    Computes rigorous descriptive statistics:
    Mean, Median, Mode, Min, Max, Range, Variance, Std, Q1, Q3, IQR, P50, P90, P95, P99.
    """
    if columns is None:
        columns = ["response_time_ms", "request_frequency", "cpu_usage", "memory_usage"]

    results = {}
    for col in columns:
        if col not in df.columns:
            continue
        series = pd.to_numeric(df[col], errors='coerce').dropna()
        if series.empty:
            continue

        arr = series.values
        count = int(len(arr))
        mean_val = float(np.mean(arr))
        median_val = float(np.median(arr))
        
        # Mode calculation
        try:
            m = stats.mode(arr, keepdims=False)
            mode_val = float(m.mode) if np.isscalar(m.mode) else float(m.mode[0])
        except Exception:
            mode_series = series.mode()
            mode_val = float(mode_series.iloc[0]) if not mode_series.empty else median_val

        min_val = float(np.min(arr))
        max_val = float(np.max(arr))
        range_val = float(max_val - min_val)
        var_val = float(np.var(arr, ddof=1)) if count > 1 else 0.0
        std_val = float(np.std(arr, ddof=1)) if count > 1 else 0.0

        q1 = float(np.percentile(arr, 25))
        q3 = float(np.percentile(arr, 75))
        iqr = float(q3 - q1)

        p50 = median_val
        p90 = float(np.percentile(arr, 90))
        p95 = float(np.percentile(arr, 95))
        p99 = float(np.percentile(arr, 99))

        results[col] = {
            "count": count,
            "mean": round(mean_val, 2),
            "median": round(median_val, 2),
            "mode": round(mode_val, 2),
            "min": round(min_val, 2),
            "max": round(max_val, 2),
            "range": round(range_val, 2),
            "variance": round(var_val, 2),
            "std": round(std_val, 2),
            "q1": round(q1, 2),
            "q3": round(q3, 2),
            "iqr": round(iqr, 2),
            "p50": round(p50, 2),
            "p90": round(p90, 2),
            "p95": round(p95, 2),
            "p99": round(p99, 2)
        }
    return results

def compute_correlation_analysis(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Computes Pearson and Spearman rank correlation coefficients, p-values,
    and pairwise interpretations for specified academic metrics.
    """
    target_cols = ["response_time_ms", "request_frequency", "cpu_usage", "memory_usage"]
    available_cols = [c for c in target_cols if c in df.columns]

    sub_df = df[available_cols].apply(pd.to_numeric, errors='coerce').dropna()
    if len(sub_df) < 3:
        return {"error": "Insufficient valid data points for correlation analysis (minimum 3 required)."}

    # Compute matrices
    pearson_matrix = sub_df.corr(method="pearson").round(4).to_dict()
    spearman_matrix = sub_df.corr(method="spearman").round(4).to_dict()

    # Specific pairs requested in project spec
    pairs = [
        ("response_time_ms", "request_frequency", "Response Time vs Request Frequency"),
        ("response_time_ms", "cpu_usage", "Response Time vs CPU Utilization"),
        ("response_time_ms", "memory_usage", "Response Time vs Memory Utilization"),
        ("request_frequency", "cpu_usage", "Request Frequency vs CPU Utilization"),
        ("request_frequency", "memory_usage", "Request Frequency vs Memory Utilization"),
    ]

    pair_results = []
    for col1, col2, label in pairs:
        if col1 in sub_df.columns and col2 in sub_df.columns:
            s1 = sub_df[col1].values
            s2 = sub_df[col2].values

            p_corr, p_pval = stats.pearsonr(s1, s2)
            s_corr, s_pval = stats.spearmanr(s1, s2)

            # Determine qualitative interpretation
            abs_p = abs(p_corr)
            if abs_p >= 0.7:
                strength = "Strong"
            elif abs_p >= 0.4:
                strength = "Moderate"
            elif abs_p >= 0.2:
                strength = "Weak"
            else:
                strength = "Negligible"

            direction = "positive" if p_corr > 0 else "negative"
            significance = "Statistically Significant (p < 0.05)" if p_pval < 0.05 else "Not Statistically Significant (p >= 0.05)"

            # Academic rationale
            if "Response Time vs Request Frequency" in label:
                impact = f"{strength} {direction} association indicates request queueing delay under higher client call frequencies."
            elif "Response Time vs CPU" in label:
                impact = f"{strength} {direction} correlation suggests CPU computational bottlenecks directly prolong request handling time."
            elif "Request Frequency vs CPU" in label:
                impact = f"{strength} {direction} correlation demonstrates increased server workload scaling directly with transaction load."
            else:
                impact = f"{strength} {direction} correlation between memory consumption and execution metrics."

            pair_results.append({
                "label": label,
                "col1": col1,
                "col2": col2,
                "pearson_r": round(float(p_corr), 4),
                "pearson_p": float(p_pval),
                "spearman_rho": round(float(s_corr), 4),
                "spearman_p": float(s_pval),
                "strength": strength,
                "direction": direction,
                "significance": significance,
                "academic_impact": impact
            })

    return {
        "columns": available_cols,
        "pearson_matrix": pearson_matrix,
        "spearman_matrix": spearman_matrix,
        "pairwise_analysis": pair_results
    }

def detect_bottlenecks(
    df: pd.DataFrame,
    rt_threshold_ms: float = 1000.0,
    cpu_threshold_pct: float = 80.0,
    mem_threshold_pct: float = 85.0,
    error_threshold_pct: float = 5.0
) -> List[Dict[str, Any]]:
    """
    Multi-criteria bottleneck detection combining:
    1. Static configurable thresholds
    2. Statistical IQR outlier detection
    3. Z-score anomaly detection
    4. Moving average surge analysis
    Classifies findings into: Normal, Low, Medium, High, Critical.
    """
    findings = []
    if df.empty:
        return findings

    clean_df = df.copy()
    for col in ["response_time_ms", "cpu_usage", "memory_usage", "request_frequency", "status_code"]:
        if col in clean_df.columns:
            clean_df[col] = pd.to_numeric(clean_df[col], errors='coerce')

    clean_df = clean_df.dropna(subset=["response_time_ms"])
    n_records = len(clean_df)
    if n_records == 0:
        return findings

    # 1. Latency Bottleneck Analysis
    rt = clean_df["response_time_ms"].values
    rt_mean = float(np.mean(rt))
    rt_std = float(np.std(rt, ddof=1)) if n_records > 1 else 1.0
    rt_q1 = float(np.percentile(rt, 25))
    rt_q3 = float(np.percentile(rt, 75))
    rt_iqr = rt_q3 - rt_q1
    rt_iqr_threshold = rt_q3 + 1.5 * rt_iqr

    rt_violations = np.sum(rt > rt_threshold_ms)
    rt_violation_rate = (rt_violations / n_records) * 100.0
    rt_outliers = np.sum(rt > rt_iqr_threshold)
    rt_z_scores = (rt - rt_mean) / (rt_std if rt_std > 0 else 1.0)
    rt_critical_z = np.sum(rt_z_scores > 3.0)

    # Classify Latency
    if rt_violation_rate > 25.0 or (rt_mean > rt_threshold_ms * 1.2):
        lat_sev = "Critical"
    elif rt_violation_rate > 10.0 or rt_critical_z > 5:
        lat_sev = "High"
    elif rt_violation_rate > 3.0 or rt_outliers > 0:
        lat_sev = "Medium"
    elif rt_violation_rate > 0.0:
        lat_sev = "Low"
    else:
        lat_sev = "Normal"

    findings.append({
        "bottleneck_name": "API Response Time Latency SLA",
        "severity": lat_sev,
        "observed_metric": f"Mean: {rt_mean:.1f} ms | P95: {np.percentile(rt, 95):.1f} ms | Violations: {rt_violations} ({rt_violation_rate:.1f}%)",
        "threshold": f"SLA Limit: {rt_threshold_ms:.0f} ms | IQR Upper Fence: {rt_iqr_threshold:.1f} ms",
        "explanation": f"Evaluated across {n_records} requests. {rt_violations} requests exceeded SLA threshold of {rt_threshold_ms}ms, with {rt_outliers} IQR statistical outliers. High latency directly impairs throughput and responsiveness.",
        "suggested_optimization": "Implement server-side HTTP response caching (Redis/Memcached), optimize underlying DB indices, enable async route handlers, and evaluate reverse proxy keep-alive connection pooling."
    })

    # 2. Server CPU Utilization Bottleneck
    if "cpu_usage" in clean_df.columns:
        cpu = clean_df["cpu_usage"].dropna().values
        if len(cpu) > 0:
            cpu_mean = float(np.mean(cpu))
            cpu_max = float(np.max(cpu))
            cpu_violations = np.sum(cpu > cpu_threshold_pct)
            cpu_violation_rate = (cpu_violations / len(cpu)) * 100.0

            if cpu_violation_rate > 20.0 or cpu_mean > cpu_threshold_pct:
                cpu_sev = "Critical"
            elif cpu_violation_rate > 8.0 or cpu_max > 95.0:
                cpu_sev = "High"
            elif cpu_violation_rate > 2.0:
                cpu_sev = "Medium"
            elif cpu_violations > 0:
                cpu_sev = "Low"
            else:
                cpu_sev = "Normal"

            findings.append({
                "bottleneck_name": "Server CPU Capacity Saturation",
                "severity": cpu_sev,
                "observed_metric": f"Mean CPU: {cpu_mean:.1f}% | Peak CPU: {cpu_max:.1f}% | Over Threshold: {cpu_violations} records ({cpu_violation_rate:.1f}%)",
                "threshold": f"Target Limit: {cpu_threshold_pct:.0f}%",
                "explanation": f"System observed {cpu_violations} instances where CPU utilization breached the {cpu_threshold_pct}% boundary. Elevated CPU leads to instruction execution starvation and prolonged request handling queues.",
                "suggested_optimization": "Offload CPU-intensive operations to background worker queues (Celery/RQ), increase compute worker processes (e.g. Uvicorn workers), or scale compute instances horizontally."
            })

    # 3. Server Memory Utilization Bottleneck
    if "memory_usage" in clean_df.columns:
        mem = clean_df["memory_usage"].dropna().values
        if len(mem) > 0:
            mem_mean = float(np.mean(mem))
            mem_max = float(np.max(mem))
            mem_violations = np.sum(mem > mem_threshold_pct)
            mem_violation_rate = (mem_violations / len(mem)) * 100.0

            if mem_violation_rate > 25.0 or mem_mean > mem_threshold_pct:
                mem_sev = "Critical"
            elif mem_violation_rate > 10.0 or mem_max > 92.0:
                mem_sev = "High"
            elif mem_violation_rate > 2.0:
                mem_sev = "Medium"
            elif mem_violations > 0:
                mem_sev = "Low"
            else:
                mem_sev = "Normal"

            findings.append({
                "bottleneck_name": "Server Memory Allocation Pressure",
                "severity": mem_sev,
                "observed_metric": f"Mean RAM: {mem_mean:.1f}% | Max RAM: {mem_max:.1f}% | Over Threshold: {mem_violations} records ({mem_violation_rate:.1f}%)",
                "threshold": f"Target Limit: {mem_threshold_pct:.0f}%",
                "explanation": f"Memory utilization exceeded safety ceiling ({mem_threshold_pct}%) in {mem_violations} observations. Memory exhaustion can trigger OS swapping (thrashing) or process OOM termination.",
                "suggested_optimization": "Audit memory leaks, stream large file responses instead of buffering in memory, tune garbage collection, and increase RAM or container cgroup memory limits."
            })

    # 4. HTTP Error Rate Bottleneck
    if "status_code" in clean_df.columns:
        sc = clean_df["status_code"].dropna().astype(int).values
        if len(sc) > 0:
            error_count = int(np.sum((sc >= 400)))
            error_rate = (error_count / len(sc)) * 100.0

            if error_rate > 15.0:
                err_sev = "Critical"
            elif error_rate > error_threshold_pct:
                err_sev = "High"
            elif error_rate > 1.0:
                err_sev = "Medium"
            elif error_count > 0:
                err_sev = "Low"
            else:
                err_sev = "Normal"

            findings.append({
                "bottleneck_name": "HTTP Request Error & Failure Rate",
                "severity": err_sev,
                "observed_metric": f"Failure Count: {error_count} | Error Rate: {error_rate:.2f}%",
                "threshold": f"Acceptable Error Budget: < {error_threshold_pct:.1f}%",
                "explanation": f"{error_count} requests returned HTTP client/server errors (4xx/5xx codes). Rates above {error_threshold_pct}% violate basic service reliability objectives.",
                "suggested_optimization": "Inspect web server access logs for 429 rate limit errors (scale rate limits) and 500/502/503/504 errors (upstream database connectivity timeouts or unhandled exceptions)."
            })

    # 5. Workload Concurrency Spike Bottleneck (Moving Average surge)
    if "request_frequency" in clean_df.columns:
        rf = clean_df["request_frequency"].dropna().values
        if len(rf) >= 10:
            rolling_rt = pd.Series(clean_df["response_time_ms"]).rolling(window=10, min_periods=1).mean()
            rt_surge_ratio = clean_df["response_time_ms"] / (rolling_rt + 1e-5)
            high_surges = np.sum(rt_surge_ratio > 2.0)

            surge_sev = "High" if high_surges > 15 else ("Medium" if high_surges > 5 else "Normal")
            if surge_sev != "Normal":
                findings.append({
                    "bottleneck_name": "Transient Request Surge & Queue Saturation",
                    "severity": surge_sev,
                    "observed_metric": f"{high_surges} requests exhibited latency >200% above moving average",
                    "threshold": "Moving Average Spike Ratio > 2.0x",
                    "explanation": "Detected sudden latency spikes relative to local moving averages, characteristic of thread pool exhaustion or lock contention during traffic bursts.",
                    "suggested_optimization": "Configure token-bucket rate limiters at API gateway layer, deploy auto-scaling trigger based on request rate, and optimize thread pool worker capacity."
                })

    return findings

def preprocess_dataset(
    df: pd.DataFrame,
    column_mapping: Optional[Dict[str, str]] = None,
    handle_missing: str = "impute",
    remove_duplicates: bool = True,
    detect_outliers: bool = True
) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Full data preprocessing pipeline:
    - Normalizes column names
    - Calculates before-and-after metrics
    - Handles missing values (drop or median imputation)
    - Removes duplicate rows
    - Calculates request frequency if missing
    - Identifies IQR outliers
    - Returns cleaned DataFrame and diagnostic audit dict.
    """
    raw_shape = df.shape
    raw_missing = int(df.isna().sum().sum())
    raw_duplicates = int(df.duplicated().sum())

    processed_df = df.copy()

    # Column mapping & normalization
    if column_mapping:
        processed_df = processed_df.rename(columns=column_mapping)
    
    # Standardize column names (strip whitespace, lowercase)
    processed_df.columns = [str(c).strip().lower().replace(" ", "_").replace("-", "_") for c in processed_df.columns]

    # Ensure required columns exist or synthesize reasonable defaults
    if "response_time_ms" not in processed_df.columns:
        # Check potential aliases
        for candidate in ["response_time", "latency", "latency_ms", "duration", "duration_ms", "time_ms"]:
            if candidate in processed_df.columns:
                processed_df = processed_df.rename(columns={candidate: "response_time_ms"})
                break

    if "endpoint" not in processed_df.columns:
        for candidate in ["url", "path", "api_endpoint", "route"]:
            if candidate in processed_df.columns:
                processed_df = processed_df.rename(columns={candidate: "endpoint"})
                break
        if "endpoint" not in processed_df.columns:
            processed_df["endpoint"] = "/api/v1/default"

    if "timestamp" not in processed_df.columns:
        for candidate in ["time", "datetime", "date", "created_at"]:
            if candidate in processed_df.columns:
                processed_df = processed_df.rename(columns={candidate: "timestamp"})
                break
        if "timestamp" not in processed_df.columns:
            processed_df["timestamp"] = pd.date_range(end=pd.Timestamp.now(), periods=len(processed_df), freq='S').astype(str)

    # Convert timestamp safely
    try:
        processed_df["timestamp"] = pd.to_datetime(processed_df["timestamp"], errors="coerce")
        processed_df["timestamp"] = processed_df["timestamp"].dt.strftime("%Y-%m-%d %H:%M:%S")
    except Exception:
        pass

    # Ensure numerical types
    numeric_cols = ["response_time_ms", "request_frequency", "cpu_usage", "memory_usage", "status_code", "response_size_bytes"]
    for col in numeric_cols:
        if col in processed_df.columns:
            processed_df[col] = pd.to_numeric(processed_df[col], errors="coerce")

    # Handle duplicates
    if remove_duplicates:
        processed_df = processed_df.drop_duplicates()

    # Calculate request frequency if missing or mostly null
    if "request_frequency" not in processed_df.columns or processed_df["request_frequency"].isna().sum() > len(processed_df) * 0.5:
        # Group by 5-second timestamp intervals to estimate requests per second
        try:
            ts_series = pd.to_datetime(processed_df["timestamp"], errors="coerce")
            freq_est = processed_df.groupby(ts_series.dt.floor('5s'))['endpoint'].transform('count') / 5.0
            processed_df["request_frequency"] = freq_est.fillna(1.0).round(2)
        except Exception:
            processed_df["request_frequency"] = 5.0

    # Handle missing values
    missing_handled_count = 0
    if handle_missing == "drop":
        before_drop = len(processed_df)
        processed_df = processed_df.dropna(subset=["response_time_ms"])
        missing_handled_count = before_drop - len(processed_df)
    else: # impute with median for numerics, mode for categoricals
        for col in numeric_cols:
            if col in processed_df.columns:
                n_nulls = int(processed_df[col].isna().sum())
                if n_nulls > 0:
                    med = processed_df[col].median()
                    processed_df[col] = processed_df[col].fillna(med if not np.isnan(med) else 0.0)
                    missing_handled_count += n_nulls
        if "status_code" in processed_df.columns:
            processed_df["status_code"] = processed_df["status_code"].fillna(200).astype(int)

    # Outlier detection using IQR across key numeric dimensions
    iqr_bounds = {}
    iqr_outliers_detected = {}
    total_outlier_count = 0
    target_outlier_cols = [c for c in ["response_time_ms", "cpu_usage", "memory_usage", "request_frequency"] if c in processed_df.columns]

    for col in target_outlier_cols:
        series_vals = pd.to_numeric(processed_df[col], errors='coerce').dropna()
        if len(series_vals) > 4:
            q1 = float(np.percentile(series_vals, 25))
            q3 = float(np.percentile(series_vals, 75))
            iqr = float(q3 - q1)
            lower_fence = float(round(max(0.0, q1 - 1.5 * iqr), 2))
            upper_fence = float(round(q3 + 1.5 * iqr, 2))
            is_outlier = (series_vals < lower_fence) | (series_vals > upper_fence)
            outlier_cnt = int(is_outlier.sum())
            iqr_bounds[col] = {
                "q1": round(q1, 2),
                "q3": round(q3, 2),
                "iqr": round(iqr, 2),
                "lower_bound": lower_fence,
                "upper_bound": upper_fence
            }
            iqr_outliers_detected[col] = outlier_cnt
            total_outlier_count += outlier_cnt
            if col == "response_time_ms" and detect_outliers:
                processed_df["is_iqr_outlier"] = is_outlier.astype(int)

    if "is_iqr_outlier" not in processed_df.columns:
        processed_df["is_iqr_outlier"] = 0

    clean_shape = processed_df.shape
    clean_missing = int(processed_df.isna().sum().sum())

    stats_audit = {
        "raw_rows": raw_shape[0],
        "initial_rows": raw_shape[0],
        "raw_columns": raw_shape[1],
        "cleaned_rows": clean_shape[0],
        "final_rows": clean_shape[0],
        "cleaned_columns": list(processed_df.columns),
        "duplicates_removed": raw_duplicates if remove_duplicates else 0,
        "missing_values_before": raw_missing,
        "missing_values_after": clean_missing,
        "missing_handled_count": missing_handled_count,
        "missing_values_handled": {col: 0 for col in numeric_cols},
        "outliers_detected_iqr": total_outlier_count,
        "iqr_outliers_detected": iqr_outliers_detected,
        "iqr_bounds": iqr_bounds
    }

    return processed_df, stats_audit
