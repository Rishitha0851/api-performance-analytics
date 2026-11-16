"""
FastAPI Backend for API Performance Analytics.
Academic research web service providing:
- Health and psutil system telemetry
- Built-in test endpoints for zero-dependency local benchmarking
- Live API measurement and async httpx load testing
- SQLite data persistence
- Descriptive statistics, correlation matrices, and bottleneck detection
- Preprocessing and PDF report generation
"""

import os
import sys
import time
import psutil
import httpx
import pandas as pd
from datetime import datetime
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, HTTPException, Query, UploadFile, File, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field

# Ensure backend directory is in sys.path regardless of execution root
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from database import (
    init_db,
    insert_metric,
    insert_metrics_bulk,
    insert_load_test_run,
    insert_system_snapshot,
    fetch_all_metrics,
    fetch_load_test_runs,
    clear_all_metrics,
    count_simulated_metrics,
    delete_simulated_metrics,
    DB_PATH
)
from analytics import (
    generate_sample_dataset,
    compute_descriptive_statistics,
    compute_correlation_analysis,
    detect_bottlenecks,
    preprocess_dataset,
    SAMPLE_CSV_PATH
)
from load_tester import execute_load_test
from report_generator import build_pdf_report

# Initialize database
init_db()

app = FastAPI(
    title="API Performance Analytics Service",
    description="Backend microservice for Statistical Analysis of API Response Time, Request Frequency and Server Load",
    version="1.0.0"
)

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_cors_pna_headers(request, call_next):
    # Support Chromium Private Network Access (PNA) preflight & response
    response = await call_next(request)
    if request.headers.get("access-control-request-private-network") or request.method == "OPTIONS":
        response.headers["Access-Control-Allow-Private-Network"] = "true"
    return response

# ---------------------------------------------------------
# Request / Response Models
# ---------------------------------------------------------
class SingleMeasureRequest(BaseModel):
    url: str = Field(..., example="http://127.0.0.1:8000/api/test/ping")
    method: str = Field("GET", example="GET")
    headers: Optional[Dict[str, str]] = None
    payload: Optional[Dict[str, Any]] = None
    timeout_sec: float = 5.0
    record_to_db: bool = True

class LoadTestRequest(BaseModel):
    target_url: str = Field(..., example="http://127.0.0.1:8000/api/test/ping")
    method: str = Field("GET", example="GET")
    concurrency: int = Field(10, ge=1, le=50)
    total_requests: int = Field(50, ge=1, le=200)
    timeout_sec: float = Field(5.0, ge=0.5, le=15.0)
    headers: Optional[Dict[str, str]] = None
    payload: Optional[Dict[str, Any]] = None
    record_to_db: bool = True

class BottleneckConfigRequest(BaseModel):
    rt_threshold_ms: float = 1000.0
    cpu_threshold_pct: float = 80.0
    mem_threshold_pct: float = 85.0
    error_threshold_pct: float = 5.0
    records: Optional[List[Dict[str, Any]]] = None

class PreprocessRequest(BaseModel):
    records: List[Dict[str, Any]]
    column_mapping: Optional[Dict[str, str]] = None
    handle_missing: str = "impute"
    remove_duplicates: bool = True
    detect_outliers: bool = True

# ---------------------------------------------------------
# Health and Built-in Test Endpoints (Zero External Dependencies)
# ---------------------------------------------------------
@app.get("/api/health")
def health():
    """Service health and uptime probe."""
    return {
        "status": "healthy",
        "service": "API Performance Analytics Backend",
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }

@app.get("/api/server-metrics")
def server_metrics():
    """
    Returns real-time host CPU & Memory metrics using psutil.
    Clearly identifies these as local machine metrics.
    """
    cpu_pct = psutil.cpu_percent(interval=0.1)
    vm = psutil.virtual_memory()
    total_mb = round(vm.total / (1024 * 1024), 2)
    avail_mb = round(vm.available / (1024 * 1024), 2)
    used_pct = vm.percent

    snapshot = {
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "cpu_usage": cpu_pct,
        "memory_usage": used_pct,
        "available_memory_mb": avail_mb,
        "total_memory_mb": total_mb,
        "metric_scope": "Local Host Machine"
    }
    insert_system_snapshot(snapshot)
    return snapshot

# Built-in mock endpoints for easy local testing
@app.get("/api/test/ping")
def test_ping():
    """High-speed low-latency endpoint (<5ms)."""
    return {"message": "pong", "status": "ok", "timestamp": time.time()}

@app.get("/api/test/echo")
@app.post("/api/test/echo")
def test_echo(data: Optional[Dict[str, Any]] = Body(None)):
    """Echoes received payload."""
    return {"status": "echoed", "data": data, "timestamp": time.time()}

@app.get("/api/test/compute")
def test_compute(n: int = Query(150000, ge=1000, le=2000000)):
    """Simulates CPU load with mathematical computation."""
    total = sum(i * i for i in range(n))
    return {"computation_result": total, "iterations": n}

@app.get("/api/test/delay")
def test_delay(ms: int = Query(150, ge=10, le=4000)):
    """Simulates controlled latency delay."""
    time.sleep(ms / 1000.0)
    return {"slept_ms": ms, "status": "delayed"}

# ---------------------------------------------------------
# Module 1: API Measurement & Load Testing
# ---------------------------------------------------------
@app.post("/api/measure")
def measure_request(req: SingleMeasureRequest):
    """
    Executes a single HTTP request, calculates latency, status code, response size,
    captures local CPU/memory snapshot, and persists to SQLite.
    """
    vm = psutil.virtual_memory()
    cpu_before = psutil.cpu_percent(interval=None)

    t_start = time.perf_counter()
    status_code = 0
    size_bytes = 0
    error_msg = None

    target_url = req.url
    if target_url.startswith("/"):
        target_url = f"http://127.0.0.1:8000{target_url}"

    try:
        with httpx.Client(verify=False, timeout=req.timeout_sec) as client:
            if req.method.upper() == "POST":
                resp = client.post(target_url, json=req.payload, headers=req.headers)
            else:
                resp = client.get(target_url, headers=req.headers)
            t_end = time.perf_counter()
            status_code = resp.status_code
            size_bytes = len(resp.content)
    except httpx.TimeoutException:
        t_end = time.perf_counter()
        status_code = 408
        error_msg = "Request timed out"
    except Exception as e:
        t_end = time.perf_counter()
        status_code = 500
        error_msg = str(e)

    latency_ms = round((t_end - t_start) * 1000.0, 2)
    cpu_after = psutil.cpu_percent(interval=None)

    metric_record = {
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "endpoint": req.url,
        "method": req.method.upper(),
        "status_code": status_code,
        "response_time_ms": latency_ms,
        "response_size_bytes": size_bytes,
        "request_frequency": 1.0, # single request
        "cpu_usage": round(max(cpu_before, cpu_after), 2),
        "memory_usage": round(vm.percent, 2),
        "workload": "Ad-Hoc Single Request",
        "is_simulated": 0
    }

    if req.record_to_db:
        row_id = insert_metric(metric_record)
        metric_record["id"] = row_id

    metric_record["error"] = error_msg
    return metric_record

@app.post("/api/load-test")
async def run_load_test(req: LoadTestRequest):
    """
    Executes async load testing via httpx with safe concurrency boundaries.
    """
    target_url = req.target_url
    if target_url.startswith("/"):
        target_url = f"http://127.0.0.1:8000{target_url}"

    res = await execute_load_test(
        target_url=target_url,
        method=req.method,
        concurrency=req.concurrency,
        total_requests=req.total_requests,
        headers=req.headers,
        payload=req.payload,
        timeout_sec=req.timeout_sec
    )

    if req.record_to_db:
        insert_load_test_run(res)
        
        # Also batch insert individual traces into api_metrics
        vm = psutil.virtual_memory()
        cpu_snap = psutil.cpu_percent(interval=None)
        bulk_items = []
        for item in res["individual_results"]:
            bulk_items.append({
                "timestamp": item["timestamp"],
                "endpoint": req.target_url,
                "method": req.method.upper(),
                "status_code": item["status_code"],
                "response_time_ms": item["response_time_ms"],
                "response_size_bytes": item["response_size_bytes"],
                "request_frequency": res["throughput_rps"],
                "cpu_usage": cpu_snap,
                "memory_usage": vm.percent,
                "workload": f"LoadTest-C{req.concurrency}",
                "is_simulated": 0
            })
        insert_metrics_bulk(bulk_items)

    return res

@app.get("/api/load-test/runs")
def get_load_test_runs(limit: Optional[int] = 50):
    """Returns past load test summary executions."""
    runs = fetch_load_test_runs(limit=limit)
    return {"runs": runs, "count": len(runs)}

# ---------------------------------------------------------
# Dataset Storage, Sample Data & Preprocessing
# ---------------------------------------------------------
@app.get("/api/data/records")
def get_records(limit: Optional[int] = 1000, workload: Optional[str] = None):
    """Returns stored metric records from SQLite."""
    records = fetch_all_metrics(limit=limit, workload=workload)
    return {"count": len(records), "records": records}

@app.get("/api/data/export-csv")
def export_csv(limit: Optional[int] = 2000, workload: Optional[str] = None):
    """Exports SQLite records as a downloadable CSV file."""
    records = fetch_all_metrics(limit=limit, workload=workload)
    df = pd.DataFrame(records)
    csv_str = df.to_csv(index=False)
    return JSONResponse(
        content={"csv": csv_str, "count": len(df)},
        headers={"Content-Disposition": "attachment; filename=api_performance_data.csv"}
    )

@app.get("/api/data/export-stats-csv")
def export_stats_csv():
    """Exports descriptive statistics summary table as CSV."""
    db_records = fetch_all_metrics(limit=2500)
    df = pd.DataFrame(db_records)
    if df.empty:
        df = generate_sample_dataset(n_samples=500)
    stats_dict = compute_descriptive_statistics(df)
    stats_df = pd.DataFrame.from_dict(stats_dict, orient="index")
    stats_df.index.name = "metric"
    stats_df = stats_df.reset_index()
    csv_str = stats_df.to_csv(index=False)
    return JSONResponse(
        content={"csv": csv_str, "count": len(stats_df)},
        headers={"Content-Disposition": "attachment; filename=statistical_summary.csv"}
    )

@app.post("/api/data/upload-csv")
async def upload_csv(file: UploadFile = File(...)):
    """Accepts a CSV file upload, parses records, and returns them."""
    try:
        content = await file.read()
        import io
        df = pd.read_csv(io.BytesIO(content))
        return {
            "filename": file.filename,
            "row_count": len(df),
            "columns": list(df.columns),
            "records": df.to_dict(orient="records")
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV file: {str(e)}")

@app.post("/api/data/records")
def save_records(records: List[Dict[str, Any]] = Body(...)):
    """Inserts batch records into SQLite database."""
    count = insert_metrics_bulk(records)
    return {"inserted": count, "status": "success"}

@app.post("/api/data/clear")
def clear_data():
    """Resets database metrics."""
    clear_all_metrics()
    return {"status": "cleared"}

@app.post("/api/sample-data/seed")
def seed_sample_data(n: int = Query(600, ge=100, le=2000), force: bool = Query(False)):
    """
    Loads 600-sample academic dataset from sample_dataset.csv (or generates if missing).
    Preserves user live data. Prevents accidental duplicate seeding unless force=True.
    """
    try:
        existing_sim = count_simulated_metrics()
        if existing_sim >= n and not force:
            all_records = fetch_all_metrics()
            return {
                "status": "already_seeded",
                "inserted": 0,
                "count": len(all_records),
                "message": f"Academic sample dataset already present in SQLite ({existing_sim} records).",
                "file_path": SAMPLE_CSV_PATH,
                "workloads": ["Normal", "Moderate", "High", "Heavy"]
            }

        # Clear only simulated records, keeping live user traces and load tests
        delete_simulated_metrics()

        # Load from sample_dataset.csv if present, else generate
        if os.path.exists(SAMPLE_CSV_PATH):
            df = pd.read_csv(SAMPLE_CSV_PATH)
            if len(df) > n:
                df = df.head(n)
        else:
            df = generate_sample_dataset(n_samples=n)

        records = df.to_dict(orient="records")
        inserted = insert_metrics_bulk(records)
        all_records = fetch_all_metrics()

        return {
            "status": "seeded",
            "inserted": inserted,
            "count": len(all_records),
            "message": f"Successfully loaded {inserted} sample academic records into SQLite database.",
            "file_path": SAMPLE_CSV_PATH,
            "workloads": ["Normal", "Moderate", "High", "Heavy"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database seeding error: {str(e)}")

@app.post("/api/preprocess")
def preprocess(req: PreprocessRequest):
    """
    Runs the full Module 1 data cleaning, missing value imputation,
    duplicate removal, and IQR outlier detection pipeline.
    """
    df = pd.DataFrame(req.records)
    if df.empty:
        raise HTTPException(status_code=400, detail="Empty dataset provided for preprocessing.")
    
    cleaned_df, audit = preprocess_dataset(
        df=df,
        column_mapping=req.column_mapping,
        handle_missing=req.handle_missing,
        remove_duplicates=req.remove_duplicates,
        detect_outliers=req.detect_outliers
    )
    return {
        "audit": audit,
        "cleaned_records": cleaned_df.to_dict(orient="records")
    }

# ---------------------------------------------------------
# Module 2: Statistical Analysis & Bottleneck Identification
# ---------------------------------------------------------
@app.post("/api/analysis/descriptive")
def descriptive_stats(records: Optional[List[Dict[str, Any]]] = Body(None)):
    """
    Computes Mean, Median, Mode, Min, Max, Range, Variance, Std,
    Q1, Q3, IQR, P50, P90, P95, P99 for performance metrics.
    """
    if records:
        df = pd.DataFrame(records)
    else:
        db_records = fetch_all_metrics(limit=2000)
        df = pd.DataFrame(db_records)

    if df.empty:
        return {"error": "No records available for statistical analysis."}

    stats_res = compute_descriptive_statistics(df)
    return {"statistics": stats_res, "record_count": len(df)}

@app.post("/api/analysis/correlation")
def correlation_analysis(records: Optional[List[Dict[str, Any]]] = Body(None)):
    """
    Computes Pearson and Spearman correlation matrices and pairwise insights.
    """
    if records:
        df = pd.DataFrame(records)
    else:
        db_records = fetch_all_metrics(limit=2000)
        df = pd.DataFrame(db_records)

    if df.empty:
        return {"error": "No records available for correlation analysis."}

    return compute_correlation_analysis(df)

@app.post("/api/analysis/bottlenecks")
def bottleneck_analysis(req: BottleneckConfigRequest):
    """
    Evaluates rule-based, IQR outlier, Z-score, and rolling average
    anomalies against configurable thresholds.
    """
    if req.records:
        df = pd.DataFrame(req.records)
    else:
        db_records = fetch_all_metrics(limit=2000)
        df = pd.DataFrame(db_records)

    if df.empty:
        return {"error": "No records available for bottleneck detection.", "findings": []}

    findings = detect_bottlenecks(
        df=df,
        rt_threshold_ms=req.rt_threshold_ms,
        cpu_threshold_pct=req.cpu_threshold_pct,
        mem_threshold_pct=req.mem_threshold_pct,
        error_threshold_pct=req.error_threshold_pct
    )
    return {"findings": findings, "record_count": len(df)}

# ---------------------------------------------------------
# Reports: PDF and Summary Data
# ---------------------------------------------------------
@app.post("/api/report/generate-pdf")
def generate_pdf(
    rt_threshold_ms: float = Query(1000.0),
    cpu_threshold_pct: float = Query(80.0),
    mem_threshold_pct: float = Query(85.0),
    error_threshold_pct: float = Query(5.0)
):
    """Generates and returns an academic PDF report."""
    db_records = fetch_all_metrics(limit=2000)
    df = pd.DataFrame(db_records)

    if df.empty:
        # Seed if empty to guarantee functional reporting
        df = generate_sample_dataset(n_samples=500)

    # Compute stats
    stats_data = compute_descriptive_statistics(df)
    corr_data = compute_correlation_analysis(df)
    bottlenecks = detect_bottlenecks(
        df=df,
        rt_threshold_ms=rt_threshold_ms,
        cpu_threshold_pct=cpu_threshold_pct,
        mem_threshold_pct=mem_threshold_pct,
        error_threshold_pct=error_threshold_pct
    )

    rt_col = pd.to_numeric(df.get("response_time_ms", pd.Series([0])), errors='coerce').dropna()
    cpu_col = pd.to_numeric(df.get("cpu_usage", pd.Series([0])), errors='coerce').dropna()
    mem_col = pd.to_numeric(df.get("memory_usage", pd.Series([0])), errors='coerce').dropna()
    sc_col = pd.to_numeric(df.get("status_code", pd.Series([200])), errors='coerce').dropna()

    summary_data = {
        "total_requests": len(df),
        "avg_response_time": float(rt_col.mean()) if not rt_col.empty else 0.0,
        "p95_response_time": float(rt_col.quantile(0.95)) if not rt_col.empty else 0.0,
        "error_rate": float((sc_col >= 400).mean() * 100.0) if not sc_col.empty else 0.0,
        "avg_cpu": float(cpu_col.mean()) if not cpu_col.empty else 0.0,
        "avg_mem": float(mem_col.mean()) if not mem_col.empty else 0.0,
    }

    report_pdf_path = os.path.join(os.path.dirname(SAMPLE_CSV_PATH), "performance_report.pdf")
    build_pdf_report(
        summary_data=summary_data,
        stats_data=stats_data,
        correlation_data=corr_data,
        bottlenecks=bottlenecks,
        output_path=report_pdf_path
    )

    return FileResponse(
        report_pdf_path,
        media_type="application/pdf",
        filename="API_Performance_Academic_Report.pdf"
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=False)
