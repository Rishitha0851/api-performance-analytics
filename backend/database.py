"""
Database access module using SQLite.
Stores API measurement logs, load test sessions, and system snapshots.
"""

import sqlite3
import os
from typing import List, Dict, Any, Optional

DB_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))
DB_PATH = os.path.join(DB_DIR, "analytics.db")

def get_db_connection() -> sqlite3.Connection:
    os.makedirs(DB_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db() -> None:
    """Initialize database tables."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # Table: api_metrics
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS api_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        endpoint TEXT NOT NULL,
        method TEXT NOT NULL DEFAULT 'GET',
        status_code INTEGER NOT NULL,
        response_time_ms REAL NOT NULL,
        response_size_bytes INTEGER DEFAULT 0,
        request_frequency REAL DEFAULT 0.0,
        cpu_usage REAL DEFAULT 0.0,
        memory_usage REAL DEFAULT 0.0,
        workload TEXT DEFAULT 'Normal',
        is_simulated INTEGER DEFAULT 0
    )
    """)

    # Table: load_test_runs
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS load_test_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        target_url TEXT NOT NULL,
        method TEXT NOT NULL,
        concurrency INTEGER NOT NULL,
        total_requests INTEGER NOT NULL,
        successful_requests INTEGER NOT NULL,
        failed_requests INTEGER NOT NULL,
        duration_sec REAL NOT NULL,
        throughput_rps REAL NOT NULL,
        error_rate_pct REAL NOT NULL,
        avg_response_time_ms REAL NOT NULL,
        p95_response_time_ms REAL NOT NULL,
        min_response_time_ms REAL NOT NULL,
        max_response_time_ms REAL NOT NULL
    )
    """)

    # Table: system_snapshots
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS system_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        cpu_usage REAL NOT NULL,
        memory_usage REAL NOT NULL,
        available_memory_mb REAL NOT NULL,
        total_memory_mb REAL NOT NULL
    )
    """)

    conn.commit()
    conn.close()

def insert_metric(record: Dict[str, Any]) -> int:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO api_metrics (
            timestamp, endpoint, method, status_code, response_time_ms,
            response_size_bytes, request_frequency, cpu_usage, memory_usage,
            workload, is_simulated
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        record.get("timestamp"),
        record.get("endpoint"),
        record.get("method", "GET"),
        record.get("status_code", 200),
        record.get("response_time_ms", 0.0),
        record.get("response_size_bytes", 0),
        record.get("request_frequency", 0.0),
        record.get("cpu_usage", 0.0),
        record.get("memory_usage", 0.0),
        record.get("workload", "Normal"),
        record.get("is_simulated", 0)
    ))
    row_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return row_id

def insert_metrics_bulk(records: List[Dict[str, Any]]) -> int:
    conn = get_db_connection()
    cursor = conn.cursor()
    rows = []
    for r in records:
        rows.append((
            r.get("timestamp"),
            r.get("endpoint"),
            r.get("method", "GET"),
            r.get("status_code", 200),
            r.get("response_time_ms", 0.0),
            r.get("response_size_bytes", 0),
            r.get("request_frequency", 0.0),
            r.get("cpu_usage", 0.0),
            r.get("memory_usage", 0.0),
            r.get("workload", "Normal"),
            r.get("is_simulated", 0)
        ))
    cursor.executemany("""
        INSERT INTO api_metrics (
            timestamp, endpoint, method, status_code, response_time_ms,
            response_size_bytes, request_frequency, cpu_usage, memory_usage,
            workload, is_simulated
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, rows)
    count = cursor.rowcount
    conn.commit()
    conn.close()
    return count

def insert_load_test_run(record: Dict[str, Any]) -> int:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO load_test_runs (
            timestamp, target_url, method, concurrency, total_requests,
            successful_requests, failed_requests, duration_sec,
            throughput_rps, error_rate_pct, avg_response_time_ms,
            p95_response_time_ms, min_response_time_ms, max_response_time_ms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        record.get("timestamp"),
        record.get("target_url"),
        record.get("method", "GET"),
        record.get("concurrency", 1),
        record.get("total_requests", 0),
        record.get("successful_requests", 0),
        record.get("failed_requests", 0),
        record.get("duration_sec", 0.0),
        record.get("throughput_rps", 0.0),
        record.get("error_rate_pct", 0.0),
        record.get("avg_response_time_ms", 0.0),
        record.get("p95_response_time_ms", 0.0),
        record.get("min_response_time_ms", 0.0),
        record.get("max_response_time_ms", 0.0)
    ))
    row_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return row_id

def insert_system_snapshot(record: Dict[str, Any]) -> int:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO system_snapshots (
            timestamp, cpu_usage, memory_usage, available_memory_mb, total_memory_mb
        ) VALUES (?, ?, ?, ?, ?)
    """, (
        record.get("timestamp"),
        record.get("cpu_usage", 0.0),
        record.get("memory_usage", 0.0),
        record.get("available_memory_mb", 0.0),
        record.get("total_memory_mb", 0.0)
    ))
    row_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return row_id

def fetch_all_metrics(limit: Optional[int] = None, workload: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    query = "SELECT * FROM api_metrics"
    params = []
    if workload:
        query += " WHERE workload = ?"
        params.append(workload)
    query += " ORDER BY id DESC"
    if limit:
        query += f" LIMIT {int(limit)}"
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def count_simulated_metrics() -> int:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM api_metrics WHERE is_simulated = 1")
    count = cursor.fetchone()[0]
    conn.close()
    return count

def delete_simulated_metrics() -> int:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM api_metrics WHERE is_simulated = 1")
    count = cursor.rowcount
    conn.commit()
    conn.close()
    return count

def fetch_load_test_runs(limit: int = 20) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM load_test_runs ORDER BY id DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def clear_all_metrics() -> None:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM api_metrics")
    cursor.execute("DELETE FROM load_test_runs")
    cursor.execute("DELETE FROM system_snapshots")
    conn.commit()
    conn.close()
