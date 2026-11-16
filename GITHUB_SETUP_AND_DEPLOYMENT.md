# GitHub Setup and Deployment Guide

**Project Title:** API Performance Analytics – Statistical Analysis of API Response Time, Request Frequency and Server Load for Identifying Bottlenecks in Web Applications  
**Repository Name:** `api-performance-analytics`  
**Target GitHub Account:** `https://github.com/Rishitha0851`  
**Repository Remote URL:** `https://github.com/Rishitha0851/api-performance-analytics.git`  
**Primary Branch:** `main`  

---

## 1. Repository Architecture & Security Principles

This repository has been configured according to modern software engineering standards:
- **Zero Secrets / Zero Credentials:** No passwords, personal access tokens (PAT), or API keys are stored in source code or revision history.
- **Environment Isolation:** `.env.example` provides an explicit template for configuration. Local `.env` files are excluded by `.gitignore`.
- **Clean Database Strategy:** The runtime SQLite database (`data/analytics.db`) is git-ignored to prevent machine-specific state from dirtying the repository. The canonical benchmark dataset (`data/sample_dataset.csv`) is version-controlled to ensure complete reproducibility.
- **Production Asset Hygiene:** All `node_modules/`, `dist/`, `__pycache__/`, virtual environments, and temporary logs are strictly ignored.

---

## 2. Step-by-Step Local Deployment & Setup

Follow these steps to deploy and run the project on any fresh development machine:

### Prerequisites
- Python 3.10 or higher
- Node.js 18.x or higher with `npm`
- Git 2.30 or higher

### Step 1: Clone the Repository
```bash
git clone https://github.com/Rishitha0851/api-performance-analytics.git
cd api-performance-analytics
```

### Step 2: Configure Environment Variables
Copy the template configuration file:
```bash
# On Windows:
copy .env.example .env

# On macOS/Linux:
cp .env.example .env
```

### Step 3: Set Up Python Backend
Create and activate an isolated virtual environment, then install dependencies:
```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install requirements
pip install -r requirements.txt
```

### Step 4: Set Up React Frontend
```bash
cd frontend
npm install
cd ..
```

---

## 3. Running the Application

### Option A: Turnkey Single-Click Execution (Windows)
Double-click `run.bat` in the project root, or execute:
```cmd
run.bat
```
This automatically starts:
1. FastAPI Backend at **`http://127.0.0.1:8000`** (Swagger docs at `/docs`)
2. Vite React Frontend at **`http://localhost:3000`**

### Option B: Manual Multi-Terminal Execution

**Terminal 1 (Backend):**
```bash
cd backend
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

---

## 4. Verification & Testing

To execute the complete 15-test automated verification suite against the backend:
```bash
python verify_final_system.py
```

To compile the frontend production bundle:
```bash
cd frontend
npm run build
```

---

## 5. Git Commit & Push Workflow

### Initial Repository Setup (Local to Remote)
```bash
# Initialize git repository
git init

# Rename default branch to main
git branch -M main

# Stage all tracked files
git add .

# Create initial commit
git commit -m "Initial commit: API Performance Analytics platform"

# Link remote origin
git remote add origin https://github.com/Rishitha0851/api-performance-analytics.git

# Push to GitHub
git push -u origin main
```

---

## 6. Academic Submission & Demonstration Notes

- **Initial Seeding:** When opening `http://localhost:3000` for the first time, click **"Seed Sample Data"** in the top navigation bar to populate the 600 benchmark records into SQLite.
- **Interactive Documentation:** Interactive OpenAPI Swagger documentation is available at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).
- **Deliverables:** Academic PDF reports and statistical summary CSV files can be generated on-demand from the **Reports & Downloads** page.
