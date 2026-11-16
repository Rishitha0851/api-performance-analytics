"""
Asynchronous Load Testing Engine using httpx.
Performs controlled, concurrent HTTP benchmarking with safety limits.
"""

import asyncio
import time
import httpx
import numpy as np
from typing import Dict, Any, List, Optional
from datetime import datetime

# Safety boundaries
MAX_CONCURRENCY = 50
MAX_TOTAL_REQUESTS = 200
DEFAULT_TIMEOUT_SEC = 5.0

async def single_request_worker(
    client: httpx.AsyncClient,
    semaphore: asyncio.Semaphore,
    url: str,
    method: str,
    headers: Optional[Dict[str, str]] = None,
    payload: Optional[Dict[str, Any]] = None,
    timeout: float = DEFAULT_TIMEOUT_SEC
) -> Dict[str, Any]:
    """Executes a single HTTP request and measures latency in milliseconds."""
    async with semaphore:
        t_start = time.perf_counter()
        status_code = 0
        error_msg = None
        size_bytes = 0
        success = False

        try:
            if method.upper() == "POST":
                resp = await client.post(url, json=payload, headers=headers, timeout=timeout)
            else:
                resp = await client.get(url, headers=headers, timeout=timeout)
            
            t_end = time.perf_counter()
            status_code = resp.status_code
            size_bytes = len(resp.content)
            success = 200 <= status_code < 400
        except httpx.TimeoutException:
            t_end = time.perf_counter()
            status_code = 408
            error_msg = "Request timed out"
        except Exception as e:
            t_end = time.perf_counter()
            status_code = 500
            error_msg = str(e)

        latency_ms = (t_end - t_start) * 1000.0
        return {
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "status_code": status_code,
            "response_time_ms": round(latency_ms, 2),
            "response_size_bytes": size_bytes,
            "success": success,
            "error": error_msg
        }

async def execute_load_test(
    target_url: str,
    method: str = "GET",
    concurrency: int = 10,
    total_requests: int = 50,
    headers: Optional[Dict[str, str]] = None,
    payload: Optional[Dict[str, Any]] = None,
    timeout_sec: float = DEFAULT_TIMEOUT_SEC
) -> Dict[str, Any]:
    """
    Executes a controlled concurrent load test.
    Returns aggregate benchmark statistics and individual trace samples.
    """
    # Enforce safe boundaries
    safe_concurrency = max(1, min(concurrency, MAX_CONCURRENCY))
    safe_total = max(1, min(total_requests, MAX_TOTAL_REQUESTS))
    safe_timeout = max(0.5, min(timeout_sec, 15.0))

    semaphore = asyncio.Semaphore(safe_concurrency)
    
    t_test_start = time.perf_counter()
    async with httpx.AsyncClient(verify=False, follow_redirects=True) as client:
        tasks = [
            single_request_worker(
                client=client,
                semaphore=semaphore,
                url=target_url,
                method=method,
                headers=headers,
                payload=payload,
                timeout=safe_timeout
            )
            for _ in range(safe_total)
        ]
        results = await asyncio.gather(*tasks)
        for idx, r in enumerate(results, start=1):
            r["request_id"] = idx

    t_test_end = time.perf_counter()
    total_duration_sec = max(0.001, t_test_end - t_test_start)

    latencies = [r["response_time_ms"] for r in results]
    successes = sum(1 for r in results if r["success"])
    failures = safe_total - successes
    error_rate = (failures / safe_total) * 100.0
    throughput = safe_total / total_duration_sec

    avg_latency = float(np.mean(latencies))
    min_latency = float(np.min(latencies))
    max_latency = float(np.max(latencies))
    p95_latency = float(np.percentile(latencies, 95))

    return {
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "target_url": target_url,
        "method": method.upper(),
        "concurrency": safe_concurrency,
        "total_requests": safe_total,
        "successful_requests": successes,
        "failed_requests": failures,
        "duration_sec": round(total_duration_sec, 3),
        "throughput_rps": round(throughput, 2),
        "error_rate_pct": round(error_rate, 2),
        "avg_response_time_ms": round(avg_latency, 2),
        "avg_latency_ms": round(avg_latency, 2),
        "p95_response_time_ms": round(p95_latency, 2),
        "p95_latency_ms": round(p95_latency, 2),
        "min_response_time_ms": round(min_latency, 2),
        "max_response_time_ms": round(max_latency, 2),
        "individual_results": results
    }
