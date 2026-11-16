import sys
import os

base = r"C:\Users\rishi\.gemini\antigravity\scratch\api_performance_analytics"
sys.path.insert(0, base)
sys.path.insert(0, os.path.join(base, "backend"))

from backend.database import init_db, insert_metric, fetch_all_metrics, clear_all_metrics, insert_metrics_bulk
from backend.analytics import (
    generate_sample_dataset,
    compute_descriptive_statistics,
    compute_correlation_analysis,
    detect_bottlenecks,
    preprocess_dataset
)
from backend.report_generator import build_pdf_report

print("1. Initializing DB...")
init_db()
clear_all_metrics()

print("2. Generating 600-sample dataset...")
df = generate_sample_dataset(600)
print(f"Sample shape: {df.shape}")

print("3. Seeding DB with records...")
inserted = insert_metrics_bulk(df.to_dict(orient="records"))
print(f"Inserted: {inserted} records")

fetched = fetch_all_metrics(limit=10)
print(f"Fetched {len(fetched)} test records from SQLite")

print("4. Testing Descriptive Statistics...")
stats_res = compute_descriptive_statistics(df)
print("Stats keys:", list(stats_res.keys()))
print("RT Mean:", stats_res["response_time_ms"]["mean"], "P95:", stats_res["response_time_ms"]["p95"], "IQR:", stats_res["response_time_ms"]["iqr"])

print("5. Testing Correlation Analysis...")
corr = compute_correlation_analysis(df)
print("Correlation columns:", corr["columns"])
for p in corr["pairwise_analysis"]:
    print(f"  {p['label']}: Pearson r={p['pearson_r']}, Spearman rho={p['spearman_rho']}")

print("6. Testing Bottleneck Detection...")
findings = detect_bottlenecks(df, rt_threshold_ms=1000.0)
print(f"Findings count: {len(findings)}")
for f in findings:
    print(f"  [{f['severity']}] {f['bottleneck_name']} -> {f['observed_metric']}")

print("7. Testing Preprocessing Pipeline...")
clean_df, audit = preprocess_dataset(df)
print("Preprocessing audit:", audit)

print("8. Testing PDF Report Generation...")
summary = {
    "total_requests": len(df),
    "avg_response_time": float(df["response_time_ms"].mean()),
    "p95_response_time": float(df["response_time_ms"].quantile(0.95)),
    "error_rate": 5.2,
    "avg_cpu": float(df["cpu_usage"].mean()),
    "avg_mem": float(df["memory_usage"].mean())
}
pdf_path = os.path.join(base, "data", "test_report.pdf")
build_pdf_report(summary, stats_res, corr, findings, pdf_path)
print(f"PDF generated successfully! Size: {os.path.getsize(pdf_path)} bytes")

print("\nALL VERIFICATIONS PASSED CLEANLY!")
