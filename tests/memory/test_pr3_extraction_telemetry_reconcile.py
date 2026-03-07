"""
PR3 Unit Tests — Extraction Telemetry Reconciliation
=====================================================
Proves: total_started == total_succeeded + total_failed

Four test scenarios:
  A — N success jobs          → started=N, succeeded=N, failed=0, balanced
  B — N failing jobs          → started=N, succeeded=0, failed=N, balanced
  C — N success + M fail      → started=N+M, succeeded=N, failed=M, balanced
  D — forceful cancellation   → documented Phase 1 gap (terminal ≤ started)

Marks: @pytest.mark.asyncio  @pytest.mark.unit
No Redis, no Mongo, no Qdrant, no StreamHub required.
"""
from __future__ import annotations

import asyncio
import sys
from pathlib import Path

import pytest

ROOT_DIR = Path(__file__).resolve().parents[2]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from memory.sidecar_queue import SidecarJobQueue
from memory.telemetry.reconciliation import ExtractionReconciler


# ---------------------------------------------------------------------------
# Test A — all jobs succeed
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
@pytest.mark.unit
async def test_reconcile_all_success():
    """N success jobs: started=N, succeeded=N, failed=0, balanced."""
    N = 6
    recon = ExtractionReconciler()
    queue = SidecarJobQueue(concurrency=3, reconciler=recon)
    await queue.start()

    async def good_job():
        pass

    for _ in range(N):
        await queue.submit(good_job)

    await queue.shutdown()

    snap = recon.snapshot()
    assert snap["total_started"] == N
    assert snap["total_succeeded"] == N
    assert snap["total_failed"] == 0
    recon.assert_balanced()


# ---------------------------------------------------------------------------
# Test B — all jobs fail
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
@pytest.mark.unit
async def test_reconcile_all_failure():
    """N failing jobs: started=N, succeeded=0, failed=N, balanced."""
    N = 4
    recon = ExtractionReconciler()
    queue = SidecarJobQueue(concurrency=2, reconciler=recon)
    await queue.start()

    async def bad_job():
        raise ValueError("extraction parse error")

    for _ in range(N):
        await queue.submit(bad_job)

    await queue.shutdown()

    snap = recon.snapshot()
    assert snap["total_started"] == N
    assert snap["total_succeeded"] == 0
    assert snap["total_failed"] == N
    recon.assert_balanced()


# ---------------------------------------------------------------------------
# Test C — mixed success and failure
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
@pytest.mark.unit
async def test_reconcile_mixed():
    """N success + M fail: started=N+M, succeeded=N, failed=M, balanced."""
    N, M = 5, 3
    recon = ExtractionReconciler()
    queue = SidecarJobQueue(concurrency=4, reconciler=recon)
    await queue.start()

    async def good_job():
        pass

    async def bad_job():
        raise RuntimeError("ollama timeout")

    for _ in range(N):
        await queue.submit(good_job)
    for _ in range(M):
        await queue.submit(bad_job)

    await queue.shutdown()

    snap = recon.snapshot()
    assert snap["total_started"] == N + M
    assert snap["total_succeeded"] == N
    assert snap["total_failed"] == M
    recon.assert_balanced()

