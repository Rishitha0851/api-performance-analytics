@echo off
title API Performance Analytics Launcher
echo =====================================================================
echo  Statistical Analysis of API Response Time, Request Frequency
echo  and Server Load for Identifying Performance Bottlenecks
echo  Academic Research Platform (React + Vite + FastAPI)
echo =====================================================================
echo.
echo [1/2] Starting FastAPI Backend on http://127.0.0.1:8000...
start "API Analytics - FastAPI Backend" cmd /k "cd /d %~dp0backend && python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"

echo Waiting 3 seconds for backend initialization...
timeout /t 3 /nobreak > nul

echo [2/2] Starting React Vite Frontend on http://localhost:3000...
start "API Analytics - React Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo =====================================================================
echo  Services launched successfully!
echo  - React Frontend:    http://localhost:3000
echo  - FastAPI Backend:   http://127.0.0.1:8000
echo  - API Documentation: http://127.0.0.1:8000/docs
echo =====================================================================
