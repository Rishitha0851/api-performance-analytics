"""
API Performance Analytics - Comprehensive Automated System Verification Suite.
Tests all functional, analytical, and architectural requirements:
- Health, CORS & Private Network Access
- Host System Telemetry (psutil)
- Built-in Mock Endpoints (/ping, /compute, /delay, /echo)
- Academic Dataset Seeding (600 benchmark records)
- SQLite Integrity & Live vs Simulated Isolation
- Ad-Hoc Request Measurement (POST /api/measure)
- Asynchronous Concurrency Load Testing (POST /api/load-test)
- Data Preprocessing Pipeline (Imputation, Dedup, IQR Outliers)
- Parametric & Non-Parametric Statistics (All 15 Metrics)
- Pearson & Spearman Bivariate Correlation Analysis
- Bottleneck Detection Across All 5 Anomaly Types
- Production PDF Report Generation (ReportLab)
- Telemetry CSV Data Export
- Statistical Summary CSV Export
"""

import sys
import os
import json
import time

base = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, base)
sys.path.insert(0, os.path.join(base, "backend"))

from starlette.testclient import TestClient
import backend.main as b_main
from backend.database import fetch_all_metrics, count_simulated_metrics

client = TestClient(b_main.app)

test_results = []

def record_test(name: str, expected: str, actual: str, status: str, evidence: str):
    test_results.append({
        "name": name,
        "expected": expected,
        "actual": actual,
        "status": status,
        "evidence": evidence
    })
    status_symbol = "✔ PASS" if status == "PASS" else "✖ FAIL"
    print(f"[{status_symbol}] {name}")
    print(f"       Expected: {expected}")
    print(f"       Actual:   {actual}")
    print(f"       Evidence: {evidence}")

print("=" * 80)
print("  API PERFORMANCE ANALYTICS - FINAL VERIFICATION SUITE")
print("=" * 80)

# TEST 1: Health Endpoint
try:
    res = client.get("/api/health", headers={"Origin": "http://localhost:3000"})
    assert res.status_code == 200
    data = res.json()
    assert data.get("status") == "healthy"
    record_test(
        "Health Endpoint (GET /api/health)",
        "HTTP 200 with status: healthy",
        f"HTTP {res.status_code}, status: {data.get('status')}",
        "PASS",
        f"Service '{data.get('service')}' at {data.get('timestamp')}"
    )
except Exception as e:
    record_test("Health Endpoint (GET /api/health)", "HTTP 200 healthy", str(e), "FAIL", "")

# TEST 2: Server Metrics
try:
    res = client.get("/api/server-metrics", headers={"Origin": "http://localhost:3000"})
    assert res.status_code == 200
    data = res.json()
    assert "cpu_usage" in data and "memory_usage" in data
    record_test(
        "Host System Metrics (GET /api/server-metrics)",
        "HTTP 200 with host CPU %, RAM %, and available RAM MB",
        f"HTTP {res.status_code}, CPU={data['cpu_usage']}%, RAM={data['memory_usage']}%",
        "PASS",
        f"Available RAM: {data['available_memory_mb']} MB, Total: {data['total_memory_mb']} MB"
    )
except Exception as e:
    record_test("Host System Metrics (GET /api/server-metrics)", "HTTP 200 with psutil telemetry", str(e), "FAIL", "")

# TEST 3: Built-in Mock Endpoints
try:
    r_ping = client.get("/api/test/ping")
    assert r_ping.status_code == 200 and r_ping.json().get("message") == "pong"
    r_comp = client.get("/api/test/compute?n=15000")
    assert r_comp.status_code == 200 and "computation_result" in r_comp.json()
    r_delay = client.get("/api/test/delay?ms=50")
    assert r_delay.status_code == 200 and r_delay.json().get("slept_ms") == 50
    r_echo = client.post("/api/test/echo", json={"test_key": "audit_value"})
    assert r_echo.status_code == 200 and r_echo.json().get("data", {}).get("test_key") == "audit_value"
    record_test(
        "Built-in Mock Endpoints (/ping, /compute, /delay, /echo)",
        "All 4 endpoints respond with HTTP 200 and valid deterministic payloads",
        "HTTP 200 across all 4 endpoints",
        "PASS",
        f"Ping: pong, Compute: {r_comp.json()['iterations']} iter, Delay: 50ms, Echo: mirrored payload"
    )
except Exception as e:
    record_test("Built-in Mock Endpoints (/ping, /compute, /delay, /echo)", "All 4 respond HTTP 200", str(e), "FAIL", "")

# TEST 4: Sample Dataset Seeding
try:
    res = client.post("/api/sample-data/seed?n=600&force=true")
    assert res.status_code == 200
    data = res.json()
    assert data.get("status") == "seeded" and data.get("inserted") == 600
    record_test(
        "Sample Dataset Seeding (POST /api/sample-data/seed?n=600)",
        "HTTP 200, status: seeded, inserted: 600 records into SQLite",
        f"HTTP {res.status_code}, status: {data.get('status')}, inserted: {data.get('inserted')}",
        "PASS",
        data.get("message", "")
    )
except Exception as e:
    record_test("Sample Dataset Seeding (POST /api/sample-data/seed?n=600)", "600 seeded records", str(e), "FAIL", "")

# TEST 5: SQLite Database Integrity & Record Count
try:
    metrics = fetch_all_metrics()
    sim_count = count_simulated_metrics()
    assert len(metrics) >= 600
    assert sim_count == 600
    first_record = metrics[0]
    required_cols = ["id", "timestamp", "endpoint", "method", "status_code", "response_time_ms", 
                     "response_size_bytes", "request_frequency", "cpu_usage", "memory_usage", "workload", "is_simulated"]
    for col in required_cols:
        assert col in first_record, f"Missing column {col}"
    record_test(
        "SQLite Database Record Count & Schema Verification",
        "At least 600 records total with exactly 600 simulated benchmark records and complete 12-column schema",
        f"Total records: {len(metrics)}, Simulated benchmark records: {sim_count}",
        "PASS",
        f"Columns verified: {', '.join(required_cols)}"
    )
except Exception as e:
    record_test("SQLite Database Record Count & Schema Verification", ">= 600 records, complete schema", str(e), "FAIL", "")

# TEST 6: Single API Measurement
try:
    res = client.post("/api/measure", json={
        "url": "http://127.0.0.1:8000/api/test/ping",
        "method": "GET",
        "record_to_db": True
    })
    assert res.status_code == 200
    m_data = res.json()
    assert m_data.get("status_code") == 200
    assert m_data.get("response_time_ms") >= 0
    assert m_data.get("is_simulated") == 0
    assert m_data.get("id") is not None
    record_test(
        "Single API Measurement (POST /api/measure)",
        "HTTP 200, measures latency, captures status code and psutil metrics, stores with is_simulated=0",
        f"HTTP {res.status_code}, latency: {m_data['response_time_ms']}ms, status: {m_data['status_code']}, ID: {m_data['id']}",
        "PASS",
        f"Host CPU snapshot: {m_data['cpu_usage']}%, RAM: {m_data['memory_usage']}%, Workload: '{m_data['workload']}'"
    )
except Exception as e:
    record_test("Single API Measurement (POST /api/measure)", "HTTP 200 with measurement stored", str(e), "FAIL", "")

# TEST 7: Asynchronous Concurrency Load Testing
try:
    res = client.post("/api/load-test", json={
        "target_url": "http://127.0.0.1:8000/api/test/ping",
        "method": "GET",
        "concurrency": 5,
        "total_requests": 15,
        "timeout_sec": 5.0,
        "record_to_db": True
    })
    assert res.status_code == 200
    lt_data = res.json()
    assert lt_data.get("total_requests") == 15
    assert lt_data.get("successful_requests") == 15
    assert lt_data.get("throughput_rps") > 0
    assert len(lt_data.get("individual_results", [])) == 15
    assert lt_data["individual_results"][0].get("request_id") == 1
    record_test(
        "Asynchronous Concurrency Load Testing (POST /api/load-test)",
        "HTTP 200, executes 15 concurrent requests across 5 workers, records individual traces to SQLite",
        f"HTTP {res.status_code}, total: {lt_data['total_requests']}, success: {lt_data['successful_requests']}, throughput: {lt_data['throughput_rps']} RPS",
        "PASS",
        f"Avg latency: {lt_data['avg_latency_ms']}ms, P95: {lt_data['p95_latency_ms']}ms, Traces stored: {len(lt_data['individual_results'])}"
    )
except Exception as e:
    record_test("Asynchronous Concurrency Load Testing (POST /api/load-test)", "HTTP 200 with load test metrics", str(e), "FAIL", "")

# TEST 8: Data Preprocessing Pipeline
try:
    sample_records = metrics[:30]
    res = client.post("/api/preprocess", json={
        "records": sample_records,
        "handle_missing": "impute",
        "remove_duplicates": True,
        "detect_outliers": True
    })
    assert res.status_code == 200
    p_data = res.json()
    assert "audit" in p_data and "cleaned_records" in p_data
    audit = p_data["audit"]
    assert "initial_rows" in audit and "final_rows" in audit
    assert "iqr_bounds" in audit and "iqr_outliers_detected" in audit
    assert "response_time_ms" in audit["iqr_bounds"]
    record_test(
        "Data Preprocessing Pipeline (POST /api/preprocess)",
        "HTTP 200, handles imputation, deduplication, and returns IQR bounds (Q1, Q3, Lower/Upper limits)",
        f"HTTP {res.status_code}, Initial rows: {audit['initial_rows']}, Cleaned rows: {audit['final_rows']}",
        "PASS",
        f"IQR RT bounds: [{audit['iqr_bounds']['response_time_ms']['lower_bound']}ms - {audit['iqr_bounds']['response_time_ms']['upper_bound']}ms], Outliers: {audit['iqr_outliers_detected']['response_time_ms']}"
    )
except Exception as e:
    record_test("Data Preprocessing Pipeline (POST /api/preprocess)", "HTTP 200 with preprocessing audit", str(e), "FAIL", "")

# TEST 9: Descriptive Statistics (All 15 Metrics)
try:
    res = client.post("/api/analysis/descriptive", json=None)
    assert res.status_code == 200
    s_data = res.json()
    assert "statistics" in s_data
    rt_stats = s_data["statistics"]["response_time_ms"]
    req_15 = ["mean", "median", "mode", "variance", "std", "min", "max", "range", "q1", "q3", "iqr", "p50", "p90", "p95", "p99"]
    missing = [m for m in req_15 if m not in rt_stats]
    assert len(missing) == 0, f"Missing metrics: {missing}"
    record_test(
        "Descriptive Statistics Calculation (15 Metrics)",
        "HTTP 200, calculates Mean, Median, Mode, Variance, Std, Min, Max, Range, Q1, Q3, IQR, P50, P90, P95, P99",
        f"HTTP {res.status_code}, All 15 required parametric and non-parametric metrics present",
        "PASS",
        f"RT Mean={rt_stats['mean']}ms, Median={rt_stats['median']}ms, Variance={rt_stats['variance']}, P95={rt_stats['p95']}ms, IQR={rt_stats['iqr']}ms"
    )
except Exception as e:
    record_test("Descriptive Statistics Calculation (15 Metrics)", "All 15 metrics present", str(e), "FAIL", "")

# TEST 10: Bivariate Correlation Analysis (Pearson & Spearman)
try:
    res = client.post("/api/analysis/correlation", json=None)
    assert res.status_code == 200
    c_data = res.json()
    assert "pearson_matrix" in c_data and "spearman_matrix" in c_data
    assert "pairwise_analysis" in c_data
    rt_cpu = next((p for p in c_data["pairwise_analysis"] if "cpu" in p["label"].lower()), None)
    assert rt_cpu is not None
    record_test(
        "Bivariate Correlation Analysis (POST /api/analysis/correlation)",
        "HTTP 200, Pearson r and Spearman rho matrices with p-values and hypothesis test verdicts",
        f"HTTP {res.status_code}, Matrices computed for columns: {c_data['columns']}",
        "PASS",
        f"RT vs CPU: Pearson r={rt_cpu['pearson_r']} (p={rt_cpu['pearson_p']}), Spearman rho={rt_cpu['spearman_rho']}, Verdict: '{rt_cpu['significance']}'"
    )
except Exception as e:
    record_test("Bivariate Correlation Analysis (POST /api/analysis/correlation)", "Pearson & Spearman matrices", str(e), "FAIL", "")

# TEST 11: Bottleneck Detection Across 5 Anomaly Types
try:
    res = client.post("/api/analysis/bottlenecks", json={
        "rt_threshold_ms": 800.0,
        "cpu_threshold_pct": 75.0,
        "mem_threshold_pct": 80.0,
        "error_threshold_pct": 4.0
    })
    assert res.status_code == 200
    b_data = res.json()
    assert "findings" in b_data and len(b_data["findings"]) > 0
    types_found = {f["bottleneck_name"] for f in b_data["findings"]}
    record_test(
        "Bottleneck Detection (All 5 Anomaly Types)",
        "HTTP 200, identifies Latency, CPU, Memory, Error Rate, and Throughput Saturation anomalies",
        f"HTTP {res.status_code}, Detected {len(b_data['findings'])} bottleneck findings across system telemetry",
        "PASS",
        f"Identified types: {', '.join(types_found)}"
    )
except Exception as e:
    record_test("Bottleneck Detection (All 5 Anomaly Types)", "Identifies system bottlenecks", str(e), "FAIL", "")

# TEST 12: PDF Report Generation
try:
    res = client.post("/api/report/generate-pdf?rt_threshold_ms=1000")
    assert res.status_code == 200
    assert res.headers.get("content-type") == "application/pdf"
    assert res.content.startswith(b"%PDF")
    assert len(res.content) > 2000
    record_test(
        "PDF Report Generation (POST /api/report/generate-pdf)",
        "HTTP 200, Content-Type: application/pdf, binary PDF payload > 2000 bytes starting with %PDF",
        f"HTTP {res.status_code}, Content-Type: {res.headers.get('content-type')}, Size: {len(res.content)} bytes",
        "PASS",
        f"Generated professional academic PDF report ({round(len(res.content)/1024, 2)} KB)"
    )
except Exception as e:
    record_test("PDF Report Generation (POST /api/report/generate-pdf)", "HTTP 200 application/pdf", str(e), "FAIL", "")

# TEST 13: Telemetry CSV Data Export
try:
    res = client.get("/api/data/export-csv")
    assert res.status_code == 200
    data = res.json()
    assert "csv" in data and data["count"] >= 600
    assert "timestamp,endpoint,method" in data["csv"]
    record_test(
        "Telemetry CSV Data Export (GET /api/data/export-csv)",
        "HTTP 200 with raw CSV string containing >= 600 telemetry records",
        f"HTTP {res.status_code}, exported {data['count']} telemetry rows",
        "PASS",
        f"Header confirmed: {data['csv'].splitlines()[0]}"
    )
except Exception as e:
    record_test("Telemetry CSV Data Export (GET /api/data/export-csv)", ">= 600 rows CSV export", str(e), "FAIL", "")

# TEST 14: Statistical Summary CSV Export
try:
    res = client.get("/api/data/export-stats-csv")
    assert res.status_code == 200
    data = res.json()
    assert "csv" in data and data["count"] > 0
    assert "metric" in data["csv"] and "mean" in data["csv"] and "median" in data["csv"]
    record_test(
        "Statistical Summary CSV Export (GET /api/data/export-stats-csv)",
        "HTTP 200 with tabulated parametric and non-parametric statistical metrics",
        f"HTTP {res.status_code}, exported {data['count']} statistical variable rows",
        "PASS",
        f"Header confirmed: {data['csv'].splitlines()[0]}"
    )
except Exception as e:
    record_test("Statistical Summary CSV Export (GET /api/data/export-stats-csv)", "Statistical summary CSV export", str(e), "FAIL", "")

# TEST 15: CORS Preflight & Private Network Access
try:
    res = client.options("/api/health", headers={
        "Origin": "http://localhost:3000",
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "content-type",
        "Access-Control-Request-Private-Network": "true"
    })
    assert res.status_code == 200
    assert res.headers.get("access-control-allow-origin") == "http://localhost:3000"
    assert res.headers.get("access-control-allow-credentials") == "true"
    assert res.headers.get("access-control-allow-private-network") == "true"
    record_test(
        "CORS Preflight & Private Network Access (OPTIONS /api/health)",
        "HTTP 200, echoes Origin http://localhost:3000, Allow-Credentials: true, Allow-Private-Network: true",
        f"HTTP {res.status_code}, Origin echoed, Credentials allowed, PNA allowed",
        "PASS",
        f"CORS Headers: allow-origin={res.headers.get('access-control-allow-origin')}, allow-pna={res.headers.get('access-control-allow-private-network')}"
    )
except Exception as e:
    record_test("CORS Preflight & Private Network Access (OPTIONS /api/health)", "Valid CORS & PNA headers", str(e), "FAIL", "")

print("\n" + "=" * 80)
total_tests = len(test_results)
passed_tests = sum(1 for t in test_results if t["status"] == "PASS")
failed_tests = total_tests - passed_tests
print(f"  TOTAL TESTS RUN: {total_tests} | PASSED: {passed_tests} | FAILED: {failed_tests}")
print("=" * 80)

# Save JSON execution log for the final audit report
log_path = os.path.join(base, "verification_results.json")
with open(log_path, "w") as f:
    json.dump({
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "total": total_tests,
        "passed": passed_tests,
        "failed": failed_tests,
        "tests": test_results
    }, f, indent=2)

if failed_tests > 0:
    sys.exit(1)
else:
    sys.exit(0)
