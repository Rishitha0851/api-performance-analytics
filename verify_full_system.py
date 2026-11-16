"""
Automated Verification Suite for API Performance Analytics.
Tests all 12 requirements outlined in Task 7.
"""

import sys
import os
import json

base = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, base)
sys.path.insert(0, os.path.join(base, "backend"))

from starlette.testclient import TestClient
import backend.main as b_main
from backend.database import fetch_all_metrics, count_simulated_metrics

client = TestClient(b_main.app)

print("=" * 70)
print("  API PERFORMANCE ANALYTICS - AUTOMATED SYSTEM VERIFICATION")
print("=" * 70)

# 1. Test GET /api/health
print("\n[TEST 1] GET /api/health ...")
res = client.get("/api/health", headers={"Origin": "http://localhost:3000"})
assert res.status_code == 200, f"Expected 200, got {res.status_code}"
assert res.json().get("status") == "healthy", "Health status not healthy"
assert res.headers.get("access-control-allow-origin") == "http://localhost:3000"
print(f"  -> SUCCESS: Status {res.status_code}, service: '{res.json().get('service')}'")

# 2. Test GET /api/server-metrics
print("\n[TEST 2] GET /api/server-metrics ...")
res = client.get("/api/server-metrics", headers={"Origin": "http://localhost:3000"})
assert res.status_code == 200
data = res.json()
assert "cpu_usage" in data and "memory_usage" in data
print(f"  -> SUCCESS: Host CPU={data['cpu_usage']}%, RAM={data['memory_usage']}%, Free RAM={data['available_memory_mb']}MB")

# 3. Test Sample Built-in Endpoints
print("\n[TEST 3] Built-in test endpoints (/api/test/ping, compute, delay, echo) ...")
r_ping = client.get("/api/test/ping")
assert r_ping.status_code == 200 and r_ping.json().get("message") == "pong"
r_comp = client.get("/api/test/compute?n=10000")
assert r_comp.status_code == 200 and "computation_result" in r_comp.json()
r_echo = client.post("/api/test/echo", json={"test": 123})
assert r_echo.status_code == 200 and r_echo.json().get("data", {}).get("test") == 123
print(f"  -> SUCCESS: /api/test/ping (pong), /api/test/compute ({r_comp.json()['iterations']} iter), /api/test/echo ok")

# 4. Test Sample Dataset Seeding
print("\n[TEST 4] POST /api/sample-data/seed?n=600&force=true ...")
res = client.post("/api/sample-data/seed?n=600&force=true")
assert res.status_code == 200
seed_data = res.json()
assert seed_data.get("status") == "seeded"
assert seed_data.get("inserted") == 600
print(f"  -> SUCCESS: {seed_data.get('message')}")

# 5. Verify SQLite Record Count
print("\n[TEST 5] Verifying SQLite Record Count ...")
metrics = fetch_all_metrics()
sim_count = count_simulated_metrics()
print(f"  -> SUCCESS: Total SQLite records: {len(metrics)}, Simulated benchmark records: {sim_count}")
assert len(metrics) >= 600, f"Expected >= 600 records, found {len(metrics)}"

# 6. Test API Measurement
print("\n[TEST 6] POST /api/measure ...")
res = client.post("/api/measure", json={
    "url": "http://127.0.0.1:8000/api/test/ping",
    "method": "GET",
    "record_to_db": True
})
assert res.status_code == 200
m_data = res.json()
assert m_data.get("status_code") == 200
assert m_data.get("response_time_ms") >= 0
print(f"  -> SUCCESS: Measured latency: {m_data['response_time_ms']}ms, Status: {m_data['status_code']}, ID: {m_data.get('id')}")

# 7. Test Data Preprocessing
print("\n[TEST 7] POST /api/preprocess ...")
sample_batch = metrics[:10]
res = client.post("/api/preprocess", json={
    "records": sample_batch,
    "handle_missing": "impute",
    "remove_duplicates": True,
    "detect_outliers": True
})
assert res.status_code == 200
p_data = res.json()
assert "audit" in p_data and "cleaned_records" in p_data
assert "initial_rows" in p_data["audit"] and "final_rows" in p_data["audit"]
print(f"  -> SUCCESS: Cleaned rows: {p_data['audit']['final_rows']}, Initial rows: {p_data['audit']['initial_rows']}")

# 8. Verify Statistical Calculations
print("\n[TEST 8] POST /api/analysis/descriptive ...")
res = client.post("/api/analysis/descriptive", json=None)
assert res.status_code == 200
s_data = res.json()
assert "statistics" in s_data
rt_stats = s_data["statistics"]["response_time_ms"]
req_metrics = ["mean", "median", "mode", "variance", "std", "min", "max", "range", "q1", "q3", "iqr", "p50", "p90", "p95", "p99"]
for m in req_metrics:
    assert m in rt_stats, f"Missing metric {m} in descriptive stats"
print(f"  -> SUCCESS: Computed all 15 metrics! Mean RT={rt_stats['mean']}ms, Median={rt_stats['median']}ms, P95={rt_stats['p95']}ms, IQR={rt_stats['iqr']}ms")

# 9. Test Correlation Analysis
print("\n[TEST 9] POST /api/analysis/correlation ...")
res = client.post("/api/analysis/correlation", json=None)
assert res.status_code == 200
c_data = res.json()
assert "pearson_matrix" in c_data and "spearman_matrix" in c_data
print(f"  -> SUCCESS: Pearson & Spearman matrices computed across columns: {c_data['columns']}")
for p in c_data.get("pairwise_analysis", [])[:2]:
    print(f"     * {p['label']}: r={p['pearson_r']}, rho={p['spearman_rho']}, {p['significance']}")

# 10. Test Bottleneck Detection
print("\n[TEST 10] POST /api/analysis/bottlenecks ...")
res = client.post("/api/analysis/bottlenecks", json={
    "rt_threshold_ms": 1000.0,
    "cpu_threshold_pct": 80.0,
    "mem_threshold_pct": 85.0,
    "error_threshold_pct": 5.0
})
assert res.status_code == 200
b_data = res.json()
assert "findings" in b_data
print(f"  -> SUCCESS: Detected {len(b_data['findings'])} bottleneck findings across system telemetry:")
for f in b_data["findings"]:
    print(f"     [{f['severity']}] {f['bottleneck_name']} -> {f['threshold']}")

# 11. Test PDF and CSV Downloads
print("\n[TEST 11] Report Downloads (PDF, Telemetry CSV, Stats CSV) ...")
# PDF
res_pdf = client.post("/api/report/generate-pdf?rt_threshold_ms=1000")
assert res_pdf.status_code == 200
assert res_pdf.headers.get("content-type") == "application/pdf"
assert len(res_pdf.content) > 1000
print(f"  -> SUCCESS (PDF): Generated academic report ({len(res_pdf.content)} bytes)")

# Telemetry CSV
res_csv = client.get("/api/data/export-csv")
assert res_csv.status_code == 200
csv_json = res_csv.json()
assert "csv" in csv_json and csv_json["count"] >= 600
print(f"  -> SUCCESS (Telemetry CSV): Exported {csv_json['count']} records")

# Stats CSV
res_stats_csv = client.get("/api/data/export-stats-csv")
assert res_stats_csv.status_code == 200
stats_csv_json = res_stats_csv.json()
assert "csv" in stats_csv_json and stats_csv_json["count"] > 0
print(f"  -> SUCCESS (Stats Summary CSV): Exported {stats_csv_json['count']} statistical rows")

# 12. Verify Frontend-Backend Integration
print("\n[TEST 12] Frontend-Backend Integration verification ...")
# Verify options preflight
opt_res = client.options("/api/health", headers={
    "Origin": "http://localhost:3000",
    "Access-Control-Request-Method": "GET"
})
assert opt_res.status_code == 200
assert opt_res.headers.get("access-control-allow-origin") == "http://localhost:3000"
assert opt_res.headers.get("access-control-allow-credentials") == "true"
print("  -> SUCCESS: Preflight OPTIONS returned valid CORS headers for http://localhost:3000")

print("\n" + "=" * 70)
print("  ALL 12 TASK 7 VERIFICATION CRITERIA PASSED CLEANLY WITH ZERO ERRORS!")
print("=" * 70)
