# API Performance Analytics – Statistical Analysis of API Response Time, Request Frequency and Server Load for Identifying Bottlenecks in Web Applications

An enterprise-grade academic research platform and diagnostic suite designed to empirically evaluate API performance, model the statistical interactions between transaction latencies, concurrency frequencies, and host hardware resources (CPU and Memory), and automatically identify infrastructure bottlenecks in distributed web services.

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Problem Statement](#2-problem-statement)
3. [Project Objectives](#3-project-objectives)
4. [Key Features](#4-key-features)
5. [Technology Stack](#5-technology-stack)
6. [System Architecture](#6-system-architecture)
7. [Module 1 – Performance Data Collection & Preprocessing](#7-module-1--performance-data-collection--preprocessing)
8. [Module 2 – Statistical Analysis & Bottleneck Identification](#8-module-2--statistical-analysis--bottleneck-identification)
9. [Dataset Description and Source](#9-dataset-description-and-source)
10. [Statistical Techniques & Mathematical Formulations](#10-statistical-techniques--mathematical-formulations)
11. [Project Folder Structure](#11-project-folder-structure)
12. [Installation Requirements](#12-installation-requirements)
13. [Step-by-Step Setup Instructions](#13-step-by-step-setup-instructions)
14. [How to Run the Backend](#14-how-to-run-the-backend)
15. [How to Run the Frontend](#15-how-to-run-the-frontend)
16. [How to Use the Application (Walkthrough)](#16-how-to-use-the-application-walkthrough)
17. [API Documentation (Interactive Swagger)](#17-api-documentation-interactive-swagger)
18. [Testing and Verification Results](#18-testing-and-verification-results)
19. [Limitations](#19-limitations)
20. [Future Enhancements](#20-future-enhancements)

---

## 1. Project Overview
Modern web applications and microservices operate under volatile traffic patterns where subtle resource contention can lead to cascading tail latency degradation, queue saturation, and failure cascades. **API Performance Analytics** is an applied computer science research platform that replaces black-box APM tools with a mathematically transparent, statistical telemetry engine. Built on a decoupled **FastAPI** backend and **React 18 + TypeScript + Vite** frontend, the system supports both parametric and non-parametric data evaluation, controlled asynchronous concurrency testing, empirical outlier filtering, automated bottleneck detection, and publication-ready PDF/CSV report exports.

---

## 2. Problem Statement
In modern distributed computing:
- **Mean response time obscures tail latency:** Highly skewed latency distributions render the arithmetic mean misleading. Percentiles ($P_{90}$, $P_{95}$, $P_{99}$) and interquartile ranges ($IQR$) are required to understand true user experience.
- **Hardware resource coupling is non-linear:** Server CPU and RAM usage often scale smoothly until a saturation inflection point is reached, after which response times degrade exponentially due to thread pool starvation, socket backlog queuing, or memory paging.
- **Lack of automated statistical diagnostics:** Standard monitoring dashboards display raw graphs without quantifying statistical correlation coefficients (Pearson $r$, Spearman $\rho$), two-tailed significance values ($p < 0.05$), or actionable root-cause recommendations.

---

## 3. Project Objectives
1. **Empirical Measurement:** Capture high-resolution round-trip latency ($ms$), HTTP status codes, payload bytes, and host hardware snapshots across single and concurrent HTTP requests.
2. **Controlled Load Testing:** Execute asynchronous concurrency stress tests ($1 - 50$ workers) with bounded timeouts to observe throughput ($RPS$) inflection points.
3. **Rigorous Data Preprocessing:** Implement an automated cleaning pipeline supporting median/mean imputation, deduplication, and Tukey's Interquartile Range ($IQR$) outlier boundaries.
4. **Parametric & Non-Parametric Evaluation:** Compute and contrast all 15 core descriptive indicators ($\mu, P_{50}, \text{Mode}, s^2, s, \min, \max, \text{Range}, Q_1, Q_3, IQR, P_{50}, P_{90}, P_{95}, P_{99}$).
5. **Bivariate Correlation Modeling:** Compute Pearson product-moment and Spearman rank correlation matrices with hypothesis significance testing to evaluate CPU and frequency impacts on latency.
6. **Multi-Anomaly Bottleneck Classification:** Automatically identify 5 distinct system anomalies (Latency SLA breaches, CPU saturation, Memory pressure, Queueing surges, Error spikes) with remediation guidelines.
7. **Production-Grade Delivery:** Provide interactive Recharts visualizations, formal academic PDF reporting via `fpdf2`, and raw CSV data exports.

---

## 4. Key Features
- **Modern SaaS Web Interface:** Clean light theme with blue, violet, cyan, and teal accents, soft shadows, rounded borders, and zero legacy Streamlit styling.
- **Dynamic Real-Time Health Detection:** Frontend navigation reflects active backend connection status via 5-second polling of `/api/health`.
- **Integrated Mock Testing Suite:** Built-in endpoints (`/api/test/ping`, `/compute`, `/delay`, `/echo`) allow immediate local demonstration without external network dependencies.
- **Dedicated Academic Modules:** Independent workflows for Module 1 (Collection & Preprocessing) and Module 2 (Analysis & Bottlenecks).
- **Nine Interactive Recharts Panels:** Latency histograms, empirical CDF curves, dual-axis time-series, regression scatter plots, CPU/memory dual trends, throughput saturation curves, correlation heatmaps, IQR box-plots, and status code distributions.
- **Academic Export Suite:** One-click generation of 2-page research PDF reports, raw telemetry CSV exports, and statistical summary tables.

---

## 5. Technology Stack

### Frontend
- **Framework:** React 18 (Functional components, Hooks)
- **Language:** TypeScript 5.7 (Strict type safety)
- **Build Tool:** Vite 6 (ESBuild-powered hot module reloading and production bundling)
- **Styling:** Tailwind CSS 3.4 (Custom utility classes, gradients, responsive breakpoints)
- **Data Visualization:** Recharts 2.15 (Hardware-accelerated SVG interactive charting)
- **Icons:** Lucide React
- **HTTP Client:** Axios 1.7 (With automatic Vite dev proxy fallback interceptor)

### Backend
- **Web Framework:** FastAPI 0.115 (High-performance ASGI microservice)
- **Server:** Uvicorn 0.34
- **Language:** Python 3.10+
- **Data Analysis:** Pandas 2.2, NumPy 2.2
- **Statistical Computing:** SciPy 1.15 (`scipy.stats` for Pearson $r$, Spearman $\rho$, two-tailed p-values)
- **System Telemetry:** `psutil` 7.0 (Host CPU, RAM, and available memory capture)
- **HTTP Benchmark Client:** `httpx` 0.28 (Asynchronous HTTP/2-ready client with connection pooling)
- **Report Generation:** `fpdf2` 2.8 (Vector PDF rendering engine)
- **Database:** SQLite 3 (Lightweight, zero-configuration local relational persistence)

---

## 6. System Architecture

```
+---------------------------------------------------------------------------------------+
|                                    REACT FRONTEND                                     |
|                                (http://localhost:3000)                                |
|                                                                                       |
|  [Overview Dashboard]  [Module 1: Collection]  [Module 2: Analytics]  [Visualizations]|
|  - Realtime KPIs       - Ad-Hoc Request Form   - 15 Descriptive Stats - 9 Recharts    |
|  - Hardware Gauges     - Async Load Tester     - Pearson & Spearman   - PDF & CSV     |
|  - Activity Feed       - Data Preprocessing    - Bottleneck Engine    - Data Purge    |
+-------------------------------------------+-------------------------------------------+
                                            | REST API / JSON Calls
                                            | (CORS + Private Network Access)
+-------------------------------------------v-------------------------------------------+
|                                  FASTAPI BACKEND                                      |
|                                (http://127.0.0.1:8000)                                |
|                                                                                       |
|  - Health & Telemetry Routes    - Built-in Mock Endpoints (/ping, /compute, /delay)   |
|  - Ad-Hoc Measurement Engine    - Asynchronous Concurrency Load Engine (httpx pool)   |
|  - Preprocessing Engine (IQR)   - Statistical & Correlation Computing (NumPy, SciPy)  |
|  - Bottleneck Diagnostic Rules  - Academic PDF Compiler (fpdf2) & CSV Exporters       |
+-------------------------------------------+-------------------------------------------+
                                            | SQL Queries & Bulk Inserts
+-------------------------------------------v-------------------------------------------+
|                                 SQLITE DATABASE                                       |
|                              `data/analytics.db`                                      |
|                                                                                       |
|  - `api_metrics`: 600 Synthetic Benchmark Traces (is_simulated=1)                    |
|                   + Ad-Hoc & Load-Test Experimental Traces (is_simulated=0)           |
|  - `load_test_runs`: Aggregated historical benchmark runs                             |
|  - `system_snapshots`: Timeline of local machine CPU and RAM metrics                  |
+---------------------------------------------------------------------------------------+
```

---

## 7. Module 1 – Performance Data Collection & Preprocessing
Module 1 contains the tools necessary to acquire, measure, monitor, and clean API performance telemetry:
1. **API Collection:** Execute live HTTP requests (`GET` or `POST`) against any local or remote target. Automatically captures round-trip latency ($ms$), HTTP status code, request/response payload byte sizes, and host machine hardware status.
2. **Load Testing:** Configurable asynchronous benchmarking supporting up to 50 concurrent workers and 200 total requests. Renders real-time throughput ($RPS$), average response time, $P_{95}$ latency, and individual request waterfall timelines.
3. **Server Monitoring:** Live 5-second polling of host hardware utilizing `psutil` to graph CPU and Memory utilization trends.
4. **Data Preprocessing Pipeline:**
   - Ingests CSV files or live database records.
   - Handles missing values via mean/median imputation or record dropping.
   - Performs record deduplication.
   - Computes Tukey's IQR Outlier Fences ($[Q_1 - 1.5 \times IQR, Q_3 + 1.5 \times IQR]$) and displays an audit table of detected outliers.

---

## 8. Module 2 – Statistical Analysis & Bottleneck Identification
Module 2 executes deep statistical inference on the ingested data:
1. **Descriptive Statistics:** Computes all 15 parametric and non-parametric indicators across response time, request frequency, CPU usage, and memory usage. Provides dedicated comparative views explaining the mathematical rationale for non-parametric evaluation on skewed latency data.
2. **Correlation Analysis:** Generates $4 \times 4$ Pearson product-moment ($r$) and Spearman rank ($\rho$) correlation matrices. Evaluates two-tailed p-values against significance threshold $\alpha = 0.05$ to validate or reject the null hypothesis ($H_0: \rho = 0$).
3. **Bottleneck Identification:** Evaluates system telemetry against 5 anomaly classifications:
   - *Response Time Latency SLA:* Flagged when tail latencies violate user SLA limits.
   - *CPU Capacity Saturation:* Flagged when CPU utilization exceeds threshold (default $80\%$).
   - *Memory Allocation Pressure:* Flagged when RAM utilization exceeds threshold (default $85\%$).
   - *Transient Request Surge:* Flagged when incoming RPS spikes cause queue build-up.
   - *HTTP Request Failure Spikes:* Flagged when 4xx/5xx error rates exceed threshold (default $5\%$).
   - Generates actionable software engineering recommendations for each finding.

---

## 9. Dataset Description and Source
To ensure rigorous academic transparency:
- **Synthetic Benchmark Dataset:** The primary baseline dataset located at `data/sample_dataset.csv` contains exactly **600 benchmark records synthetically generated using Python** (`numpy.random` with a fixed seed `42`). It is designed for controlled empirical experiments and **does not represent unverified real-world production traffic**.
- **Workload Stratification:**
  - `Normal Workload`: 150 records ($25\%$) — Baseline latency ($40 - 180\text{ ms}$), CPU $10 - 45\%$, RPS $10 - 35$.
  - `Moderate Workload`: 150 records ($25\%$) — Intermediate latency ($120 - 350\text{ ms}$), CPU $35 - 60\%$, RPS $30 - 55$.
  - `High Workload`: 150 records ($25\%$) — Elevated latency ($200 - 650\text{ ms}$), CPU $50 - 75\%$, RPS $50 - 85$.
  - `Heavy Workload`: 150 records ($25\%$) — High resource stress ($700 - 1800\text{ ms}$), CPU $75 - 92\%$, RPS $80 - 110$.
- **Data Segregation:** Benchmark records are permanently tagged with `is_simulated = 1`. All live ad-hoc user measurements and load tests are recorded with `is_simulated = 0` to preserve experimental validity.

---

## 10. Statistical Techniques & Mathematical Formulations

### 10.1 Parametric Measures
- **Sample Mean ($\mu$):**
  $$\mu = \frac{1}{N} \sum_{i=1}^N x_i$$
- **Sample Variance ($s^2$):**
  $$s^2 = \frac{1}{N - 1} \sum_{i=1}^N (x_i - \bar{x})^2$$
- **Standard Deviation ($s$):**
  $$s = \sqrt{s^2}$$

### 10.2 Non-Parametric & Dispersion Measures
- **Median ($P_{50}$):** Middle rank observation separating the higher and lower halves of the sample.
- **Percentiles ($P_k$):** The value below which $k\%$ of observations fall ($P_{50}, P_{90}, P_{95}, P_{99}$).
- **Interquartile Range ($IQR$):**
  $$IQR = Q_3 - Q_1$$
- **Tukey's Outlier Boundaries:**
  $$\text{Lower Bound} = Q_1 - 1.5 \times IQR, \quad \text{Upper Bound} = Q_3 + 1.5 \times IQR$$

### 10.3 Bivariate Correlation & Hypothesis Testing
- **Pearson Product-Moment Correlation ($r$):**
  $$r = \frac{\sum_{i=1}^N (x_i - \bar{x})(y_i - \bar{y})}{\sqrt{\sum_{i=1}^N (x_i - \bar{x})^2} \sqrt{\sum_{i=1}^N (y_i - \bar{y})^2}}$$
- **Spearman Rank Correlation ($\rho$):**
  $$\rho = 1 - \frac{6 \sum d_i^2}{N(N^2 - 1)}$$
  Where $d_i = \text{rank}(x_i) - \text{rank}(y_i)$.
- **Two-Tailed p-Value:** Evaluated using the Student's t-distribution with $N - 2$ degrees of freedom to determine whether the correlation is statistically significant ($p < 0.05$).

---

## 11. Project Folder Structure

```
api_performance_analytics/
├── .env.example                       # Environment configuration template
├── .gitignore                         # Git exclusion rules
├── FINAL_DEVELOPMENT_VERIFICATION_REPORT.md  # Detailed verification audit report
├── FINAL_AUDIT_REVIEW.md              # Evidence-based QA review document
├── GITHUB_SETUP_AND_DEPLOYMENT.md     # Deployment and repository guide
├── README.md                          # Comprehensive project documentation
├── requirements.txt                   # Python backend dependencies
├── run.bat                            # One-click Windows launch script
├── verify_final_system.py             # 15-test automated verification suite
│
├── backend/
│   ├── analytics.py                   # Statistical algorithms, IQR cleaning, benchmark generator
│   ├── database.py                    # SQLite connection pool and schema definitions
│   ├── load_tester.py                 # Async concurrency benchmark engine (httpx)
│   ├── main.py                        # FastAPI routes, CORS, PNA middleware, and handlers
│   └── report_generator.py            # Academic PDF report compiler (fpdf2)
│
├── data/
│   ├── sample_dataset.csv             # 600-record synthetic academic benchmark dataset
│   └── analytics.db                   # SQLite runtime telemetry database (git-ignored)
│
└── frontend/
    ├── index.html                     # HTML5 mount template
    ├── package.json                   # NPM dependencies and scripts
    ├── postcss.config.js              # PostCSS plugins
    ├── tailwind.config.js             # Tailwind theme colors and styles
    ├── tsconfig.json                  # TypeScript compiler configuration
    ├── vite.config.ts                 # Vite bundler and /api reverse proxy configuration
    └── src/
        ├── App.tsx                    # Root state, health polling, notifications
        ├── main.tsx                   # React DOM entry point
        ├── index.css                  # Global styles and Tailwind directives
        ├── vite-env.d.ts              # Vite client type references
        ├── components/
        │   ├── EmptyState.tsx         # Zero-data fallback component
        │   ├── Header.tsx             # Top navigation with live backend status badge
        │   ├── LoadingSpinner.tsx     # Loading animation component
        │   ├── MetricCard.tsx         # Dashboard KPI card with trend indicators
        │   ├── Sidebar.tsx            # Responsive navigation drawer
        │   └── StatusBadge.tsx        # HTTP status and severity badges
        ├── layouts/
        │   └── MainLayout.tsx         # Main viewport layout with floating toast notifications
        ├── pages/
        │   ├── OverviewDashboard.tsx  # High-level KPIs, gauges, and activity table
        │   ├── Module1Collection.tsx  # API tester, load tester, server monitor, preprocessing
        │   ├── Module2Analysis.tsx    # 15 stats, correlations, bottleneck detection
        │   ├── PerformanceVisualization.tsx # 9 interactive Recharts analytical views
        │   └── ReportsDownloads.tsx   # PDF download, CSV exports, database reset
        ├── services/
        │   └── api.ts                 # Axios HTTP service with proxy retry interceptors
        └── types/
            └── api.ts                 # Strict TypeScript API contract interfaces
```

---

## 12. Installation Requirements
- **Operating System:** Windows 10/11, macOS, or Linux.
- **Python:** Python 3.10 or higher.
- **Node.js:** Node.js 18.x or higher with `npm`.
- **Git:** Git 2.30 or higher.

---

## 13. Step-by-Step Setup Instructions

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/Rishitha0851/api-performance-analytics.git
   cd api-performance-analytics
   ```

2. **Set Up Python Virtual Environment:**
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```

3. **Install Python Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Install Frontend Dependencies:**
   ```bash
   cd frontend
   npm install
   cd ..
   ```

5. **Configure Environment Variables:**
   ```bash
   copy .env.example .env
   ```

---

## 14. How to Run the Backend
From the root directory with the virtual environment activated:
```bash
cd backend
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
The FastAPI backend will start on **`http://127.0.0.1:8000`**.

---

## 15. How to Run the Frontend
In a separate terminal:
```bash
cd frontend
npm run dev
```
The Vite development server will start on **`http://localhost:3000`**.

> **Pro Tip (Windows Turnkey Startup):**  
> Simply double-click `run.bat` in the repository root to launch both the backend and frontend simultaneously with a single click.

---

## 16. How to Use the Application (Walkthrough)

1. **Open Dashboard:** Navigate to [http://localhost:3000](http://localhost:3000). Verify that the header pill displays **`Backend Connected`** with a green pulse dot.
2. **Seed Benchmark Data:** Click the **"Seed Sample Data"** button in the header. A notification will confirm the loading of 600 benchmark records.
3. **Execute Live API Tests (Module 1):**
   - Click **Module 1** in the sidebar.
   - On the **API Collection** tab, select `/api/test/ping` or enter a custom URL, and click **"Execute Request"**. Observe latency ($ms$) and hardware metrics recorded.
   - Switch to the **Load Testing** tab. Configure 10 concurrent requests and 50 total requests, then click **"Start Load Test"** to observe real-time throughput.
   - Switch to the **Data Preprocessing** tab. Click **"Run Preprocessing Pipeline"** to inspect Tukey's IQR Outlier Boundary Table.
4. **Evaluate Statistical Metrics (Module 2):**
   - Click **Module 2** in the sidebar.
   - Switch between **Parametric** and **Non-Parametric** tabs to review Mean, Std Dev, Median, IQR, and Percentiles.
   - Inspect the **Correlation Matrix** to observe Pearson $r$ and Spearman $\rho$ values with significance ratings.
   - Switch to the **Bottleneck Detection** tab, adjust the Latency SLA slider, and view categorized bottleneck findings.
5. **Explore Visualizations:** Click **Visualizations** to view all 9 interactive Recharts analytical views.
6. **Download Reports:** Click **Reports** to download the 2-page academic PDF report, raw telemetry CSV, or statistical summary CSV.

---

## 17. API Documentation (Interactive Swagger)
FastAPI provides automatic interactive OpenAPI documentation:
- **Swagger UI:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc:** [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

## 18. Testing and Verification Results
The platform includes an automated system verification suite ([verify_final_system.py](verify_final_system.py)). All 15 automated integration tests execute with a **100% pass rate**:

```
================================================================================
  API PERFORMANCE ANALYTICS - FINAL VERIFICATION SUITE
================================================================================
[✔ PASS] Health Endpoint (GET /api/health)
[✔ PASS] Host System Metrics (GET /api/server-metrics)
[✔ PASS] Built-in Mock Endpoints (/ping, /compute, /delay, /echo)
[✔ PASS] Sample Dataset Seeding (POST /api/sample-data/seed?n=600)
[✔ PASS] SQLite Database Record Count & Schema Verification
[✔ PASS] Single API Measurement (POST /api/measure)
[✔ PASS] Asynchronous Concurrency Load Testing (POST /api/load-test)
[✔ PASS] Data Preprocessing Pipeline (POST /api/preprocess)
[✔ PASS] Descriptive Statistics Calculation (15 Metrics)
[✔ PASS] Bivariate Correlation Analysis (POST /api/analysis/correlation)
[✔ PASS] Bottleneck Detection (All 5 Anomaly Types)
[✔ PASS] PDF Report Generation (POST /api/report/generate-pdf)
[✔ PASS] Telemetry CSV Data Export (GET /api/data/export-csv)
[✔ PASS] Statistical Summary CSV Export (GET /api/data/export-stats-csv)
[✔ PASS] CORS Preflight & Private Network Access (OPTIONS /api/health)
================================================================================
TOTAL TESTS RUN: 15 | PASSED: 15 | FAILED: 0 | PASS RATE: 100.0%
================================================================================
```

- **Frontend Production Build:** Verified via `npm run build` (`tsc && vite build`) — transforms 2,075 modules with 0 TypeScript errors.

---

## 19. Limitations
1. **Host-Side Hardware Telemetry:** When benchmarking external remote APIs (e.g. public endpoints), `psutil` captures the CPU and memory of the *host machine running the backend*, not the remote web server. For built-in local endpoints (`/api/test/...`), host and server metrics are identical.
2. **Client-Side Concurrency Boundaries:** To protect development machines from resource starvation, maximum concurrency is capped at 50 async workers and total requests at 200 per load test.
3. **No Headless E2E Browser Automation:** Visual verification was performed through production compilation, component AST analysis, and live manual walkthroughs; an automated headless browser runner (such as Cypress or Playwright) is not currently bundled.

---

## 20. Future Enhancements
- **Distributed Load Testing Workers:** Support distributed load generator nodes using Celery and Redis to simulate high-scale multi-region traffic.
- **Extended Non-Parametric Tests:** Integrate Mann-Whitney U tests and Kruskal-Wallis H tests for comparing latency distributions across disparate microservice versions.
- **Automated Root-Cause Tracing:** Incorporate OpenTelemetry distributed tracing spans to isolate database query latency from network transmission latency.
- **Dynamic Frontend Code-Splitting:** Implement `React.lazy()` chunking to divide the single production bundle into smaller modular chunks.

---

## 📄 License
This project is developed for academic evaluation and research purposes.
