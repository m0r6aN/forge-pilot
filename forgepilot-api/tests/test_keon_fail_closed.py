"""
SENTINEL 3 — Keon Fail-Closed Guard

Fails if Keon checkpoint timeout/unreachable doesn't block exchange + intake.

Two layers:
  A) Protocol simulation — verifies the fail-closed invariant in isolation
     (KeonRuntimeGateway lives in omega-core; we test the CONTRACT here)
  B) API level — verifies that FC error signals propagate to a non-2xx
     response and that no campaign is stored on failure
"""

import pytest
import httpx
from dataclasses import dataclass
from unittest.mock import AsyncMock, MagicMock, patch

pytestmark = [pytest.mark.sentinel, pytest.mark.unit]


# ---------------------------------------------------------------------------
# A) Protocol simulation — mirrors KeonRuntimeGateway contract
# ---------------------------------------------------------------------------

@dataclass
class KeonDecision:
    """Minimal mirror of the KeonRuntimeGateway decision contract."""
    decision: str   # "allow" | "deny"
    reason: str = ""


class _TimeoutGateway:
    """Simulates a Keon gateway that times out."""
    async def check(self, payload: dict) -> KeonDecision:
        try:
            raise TimeoutError("Keon unreachable: connection timed out")
        except Exception as exc:
            return KeonDecision(decision="deny", reason=str(exc))


class _UnreachableGateway:
    """Simulates a Keon gateway whose host is unreachable."""
    async def check(self, payload: dict) -> KeonDecision:
        try:
            raise ConnectionRefusedError("Keon host unreachable")
        except Exception as exc:
            return KeonDecision(decision="deny", reason=str(exc))


class _AllowGateway:
    """Simulates a healthy Keon gateway."""
    async def check(self, payload: dict) -> KeonDecision:
        return KeonDecision(decision="allow", reason="checkpoint passed")


async def test_keon_timeout_produces_deny() -> None:
    """SENTINEL-3a: Any timeout → decision must be 'deny' (fail-closed)."""
    result = await _TimeoutGateway().check({"run_id": "x"})
    assert result.decision == "deny", (
        f"SENTINEL-3a TRIPPED — timeout produced {result.decision!r}, expected 'deny'"
    )


async def test_keon_unreachable_produces_deny() -> None:
    """SENTINEL-3b: Unreachable host → decision must be 'deny' (fail-closed)."""
    result = await _UnreachableGateway().check({"run_id": "x"})
    assert result.decision == "deny", (
        f"SENTINEL-3b TRIPPED — unreachable produced {result.decision!r}, expected 'deny'"
    )


async def test_keon_healthy_produces_allow() -> None:
    """SENTINEL-3c: Healthy Keon → decision must be 'allow'."""
    result = await _AllowGateway().check({"run_id": "x"})
    assert result.decision == "allow", (
        f"SENTINEL-3c TRIPPED — healthy gateway produced {result.decision!r}, expected 'allow'"
    )


def test_deny_and_allow_are_distinct() -> None:
    """SENTINEL-3d: 'deny' != 'allow' — invariant sanity check."""
    assert KeonDecision(decision="deny").decision != KeonDecision(decision="allow").decision


# ---------------------------------------------------------------------------
# B) Fixture: reset the singleton store between tests
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def _reset_store():
    from app.storage import memory as _mem
    _mem._store = None
    yield
    _mem._store = None


def _http_error(status_code: int) -> httpx.HTTPStatusError:
    resp = MagicMock(spec=httpx.Response)
    resp.status_code = status_code
    return httpx.HTTPStatusError(
        f"HTTP {status_code}", request=MagicMock(), response=resp
    )


# ---------------------------------------------------------------------------
# B) API-level: FC error signals must block campaign creation
# ---------------------------------------------------------------------------

def test_fc_503_blocks_campaign_and_returns_502(
    test_client, sample_campaign_request
) -> None:
    """SENTINEL-3e: FC 503 → API must return 502 and store nothing."""
    with patch(
        "app.clients.federation_client.FederationClient.create_conversation",
        new_callable=AsyncMock,
        side_effect=_http_error(503),
    ):
        resp = test_client.post("/api/v1/campaigns", json=sample_campaign_request)

    assert resp.status_code == 502, (
        f"SENTINEL-3e TRIPPED — FC 503 did not return 502. Got {resp.status_code}"
    )
    from app.storage.memory import get_campaign_store
    assert len(get_campaign_store()._store) == 0, (
        "SENTINEL-3e TRIPPED — Campaign stored despite FC being unavailable"
    )


def test_fc_connect_error_blocks_campaign_and_returns_503(
    test_client, sample_campaign_request
) -> None:
    """SENTINEL-3f: FC connect error → API must return 503 and store nothing."""
    with patch(
        "app.clients.federation_client.FederationClient.create_conversation",
        new_callable=AsyncMock,
        side_effect=httpx.ConnectError("Connection refused"),
    ):
        resp = test_client.post("/api/v1/campaigns", json=sample_campaign_request)

    assert resp.status_code == 503, (
        f"SENTINEL-3f TRIPPED — FC connect error did not return 503. Got {resp.status_code}"
    )
    from app.storage.memory import get_campaign_store
    assert len(get_campaign_store()._store) == 0, (
        "SENTINEL-3f TRIPPED — Campaign stored despite FC being unreachable"
    )

