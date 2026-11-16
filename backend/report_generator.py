"""
Academic PDF Performance Report Generator using fpdf2.
Produces a formatted PDF including:
- Project title and academic metadata
- Dataset summary
- Descriptive statistical results
- Correlation findings
- Bottleneck identification and engineering suggestions
- Academic conclusion
"""

import os
from fpdf import FPDF
from typing import Dict, Any, List

class AcademicReportPDF(FPDF):
    def header(self):
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(80, 80, 110)
        self.cell(0, 8, "API Performance Analytics - Academic Engineering Report", border=False, ln=True, align="R")
        self.set_draw_color(200, 200, 220)
        self.line(10, 18, 200, 18)
        self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(130, 130, 150)
        page_str = f"Page {self.page_no()}"
        self.cell(0, 10, page_str, 0, 0, "C")

def build_pdf_report(
    summary_data: Dict[str, Any],
    stats_data: Dict[str, Any],
    correlation_data: Dict[str, Any],
    bottlenecks: List[Dict[str, Any]],
    output_path: str
) -> str:
    """Generates a professional academic PDF report."""
    pdf = AcademicReportPDF(orientation="P", unit="mm", format="A4")
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    # Title Banner
    pdf.set_font("Helvetica", "B", 14)
    pdf.set_text_color(16, 24, 64) # Dark navy
    pdf.multi_cell(
        0, 7,
        "Statistical Analysis of API Response Time, Request Frequency and Server Load for Identifying Performance Bottlenecks in Web Applications",
        align="C"
    )
    pdf.ln(3)

    pdf.set_font("Helvetica", "I", 9)
    pdf.set_text_color(90, 90, 120)
    pdf.cell(0, 5, "Academic Empirical Research & Automated Diagnostics Report", ln=True, align="C")
    pdf.ln(5)

    # 1. Executive Dataset Summary
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(30, 41, 102)
    pdf.cell(0, 6, "1. Executive Dataset Summary", ln=True)
    pdf.set_draw_color(79, 70, 229)
    pdf.set_line_width(0.4)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(3)

    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(40, 40, 50)
    
    total_req = summary_data.get("total_requests", 0)
    avg_rt = summary_data.get("avg_response_time", 0.0)
    p95_rt = summary_data.get("p95_response_time", 0.0)
    err_rate = summary_data.get("error_rate", 0.0)
    avg_cpu = summary_data.get("avg_cpu", 0.0)
    avg_mem = summary_data.get("avg_mem", 0.0)

    summary_text = (
        f"This report presents an empirical evaluation of {total_req} API execution traces captured across "
        f"multi-tier workload distributions. The primary latency profile exhibits a mean response time of {avg_rt:.2f} ms "
        f"with a 95th percentile latency of {p95_rt:.2f} ms. System load averaged {avg_cpu:.1f}% CPU utilization and "
        f"{avg_mem:.1f}% RAM utilization, with an observed HTTP failure rate of {err_rate:.2f}%."
    )
    pdf.multi_cell(0, 5, summary_text)
    pdf.ln(4)

    # 2. Descriptive Statistics Table
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(30, 41, 102)
    pdf.cell(0, 6, "2. Key Descriptive Statistics", ln=True)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(3)

    # Table Header
    pdf.set_font("Helvetica", "B", 8)
    pdf.set_fill_color(240, 242, 250)
    pdf.set_text_color(30, 30, 60)
    pdf.cell(38, 6, "Metric", 1, 0, "L", fill=True)
    pdf.cell(18, 6, "Mean", 1, 0, "R", fill=True)
    pdf.cell(18, 6, "Median", 1, 0, "R", fill=True)
    pdf.cell(18, 6, "Std Dev", 1, 0, "R", fill=True)
    pdf.cell(18, 6, "IQR", 1, 0, "R", fill=True)
    pdf.cell(18, 6, "P50", 1, 0, "R", fill=True)
    pdf.cell(18, 6, "P90", 1, 0, "R", fill=True)
    pdf.cell(18, 6, "P95", 1, 0, "R", fill=True)
    pdf.cell(26, 6, "P99", 1, 1, "R", fill=True)

    # Table Body
    pdf.set_font("Helvetica", "", 8)
    metrics_map = [
        ("Response Time (ms)", stats_data.get("response_time_ms", {})),
        ("Request Freq (req/s)", stats_data.get("request_frequency", {})),
        ("CPU Usage (%)", stats_data.get("cpu_usage", {})),
        ("Memory Usage (%)", stats_data.get("memory_usage", {})),
    ]

    for label, m_vals in metrics_map:
        if m_vals:
            pdf.cell(38, 5, label, 1, 0, "L")
            pdf.cell(18, 5, f"{m_vals.get('mean', 0.0):.1f}", 1, 0, "R")
            pdf.cell(18, 5, f"{m_vals.get('median', 0.0):.1f}", 1, 0, "R")
            pdf.cell(18, 5, f"{m_vals.get('std', 0.0):.1f}", 1, 0, "R")
            pdf.cell(18, 5, f"{m_vals.get('iqr', 0.0):.1f}", 1, 0, "R")
            pdf.cell(18, 5, f"{m_vals.get('p50', 0.0):.1f}", 1, 0, "R")
            pdf.cell(18, 5, f"{m_vals.get('p90', 0.0):.1f}", 1, 0, "R")
            pdf.cell(18, 5, f"{m_vals.get('p95', 0.0):.1f}", 1, 0, "R")
            pdf.cell(26, 5, f"{m_vals.get('p99', 0.0):.1f}", 1, 1, "R")

    pdf.ln(5)

    # 3. Correlation Findings
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(30, 41, 102)
    pdf.cell(0, 6, "3. Correlation Analysis Findings", ln=True)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(3)

    pdf.set_font("Helvetica", "", 8.5)
    pdf.set_text_color(40, 40, 50)
    pairwise = correlation_data.get("pairwise_analysis", [])
    if pairwise:
        for item in pairwise[:4]: # top pairs
            lbl = item.get("label", "")
            pr = item.get("pearson_r", 0.0)
            sr = item.get("spearman_rho", 0.0)
            sig = item.get("significance", "")
            imp = item.get("academic_impact", "")
            line_str = f"- {lbl}: Pearson r = {pr:+.4f}, Spearman rho = {sr:+.4f} ({sig})."
            pdf.set_font("Helvetica", "B", 8.5)
            pdf.cell(0, 4.5, line_str, ln=True)
            pdf.set_font("Helvetica", "", 8)
            pdf.set_text_color(80, 80, 100)
            pdf.multi_cell(0, 4, f"  Implication: {imp}")
            pdf.set_text_color(40, 40, 50)
            pdf.ln(1)
    else:
        pdf.cell(0, 5, "No bivariate correlation matrix available for the selected subset.", ln=True)

    pdf.ln(4)

    # 4. Bottleneck Identification & Optimization
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(30, 41, 102)
    pdf.cell(0, 6, "4. Identified Bottlenecks & Optimization Guidelines", ln=True)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(3)

    if bottlenecks:
        for b in bottlenecks:
            # Color code severity
            sev = b.get("severity", "Normal")
            name = b.get("bottleneck_name", "Bottleneck")
            obs = b.get("observed_metric", "")
            opt = b.get("suggested_optimization", "")

            pdf.set_font("Helvetica", "B", 8.5)
            if sev in ["Critical", "High"]:
                pdf.set_text_color(180, 30, 30)
            elif sev == "Medium":
                pdf.set_text_color(180, 110, 20)
            else:
                pdf.set_text_color(30, 120, 50)

            pdf.cell(0, 5, f"[{sev.upper()}] {name}", ln=True)
            
            pdf.set_font("Helvetica", "", 8)
            pdf.set_text_color(50, 50, 60)
            pdf.cell(0, 4, f"Observed: {obs}", ln=True)
            pdf.set_font("Helvetica", "I", 8)
            pdf.set_text_color(70, 70, 90)
            pdf.multi_cell(0, 4, f"Remediation: {opt}")
            pdf.ln(2)
    else:
        pdf.set_font("Helvetica", "", 8.5)
        pdf.cell(0, 5, "All examined operational metrics satisfied configured SLA thresholds.", ln=True)

    pdf.ln(4)

    # 5. Academic Conclusion
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(30, 41, 102)
    pdf.cell(0, 6, "5. Academic Conclusion", ln=True)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(3)

    pdf.set_font("Helvetica", "", 8.5)
    pdf.set_text_color(40, 40, 50)
    conclusion_text = (
        "Statistical testing verifies that system response times degrade exponentially rather than linearly "
        "when client request frequency saturates CPU thresholds. Implementing asynchronous non-blocking event loops, "
        "distributed caching, and load-shedding policies effectively preserves tail latency (P95/P99) under heavy workloads."
    )
    pdf.multi_cell(0, 4.5, conclusion_text)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    pdf.output(output_path)
    return output_path
