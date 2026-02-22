"""
SENTINEL 4 — Intake Stage Enforcement Guard

Fails if the intake code path can start a run when PromptAirlock returns
`blocked` or `rewrite`, or when FC signals policy/legal rejection.

PromptAirlock lives in omega-core; we test the CONTRACT here by simulating
the HTTP error codes that FC surfaces when the Airlock blocks a prompt.

Canonical dispositions:
  allow   → FC returns 200 + conversation_id  → campaign MUST be created
  rewrite → FC returns 200 but no conversation_id  → campaign MUST NOT be created
  blocked → FC returns 422                         → campaign MUST NOT be created
  Hard policy block: 403 / 451                     → campaign MUST NOT be created
"""

import pytest
import httpx
from unittest.mock import AsyncMock, MagicMock, patch

pytestmark = [pytest.mark.sentinel, pytest.mark.unit]

CANONICAL_DISPOSITIONS: frozenset[str] = frozenset({"allow", "rewrite", "recheck", "blocked"})
BLOCKING_DISPOSITIONS: frozenset[str] = frozenset({"blocked", "rewrite"})


@pytest.fixture(autouse=True)
def _reset_store():
    """Reset singleton store before/after every test to prevent pollution."""
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


def test_blocked_disposition_422_prevents_campaign(
    test_client, sample_campaign_request
) -> None:
    """SENTINEL-4a: PromptAirlock 'blocked' (FC 422) must reject campaign creation."""
    with patch(
        "app.clients.federation_client.FederationClient.create_conversation",
        new_callable=AsyncMock,
        side_effect=_http_error(422),
    ):
        resp = test_client.post("/api/v1/campaigns", json=sample_campaign_request)

    assert resp.status_code not in (200, 201), (
        f"SENTINEL-4a TRIPPED — 'blocked' (422) still returned success {resp.status_code}"
    )
    from app.storage.memory import get_campaign_store
    assert len(get_campaign_store()._store) == 0, (
        "SENTINEL-4a TRIPPED — Campaign stored despite 'blocked' disposition"
    )


def test_hard_policy_block_403_prevents_campaign(
    test_client, sample_campaign_request
) -> None:
    """SENTINEL-4b: Hard policy block (403) must reject campaign creation."""
    with patch(
        "app.clients.federation_client.FederationClient.create_conversation",
        new_callable=AsyncMock,
        side_effect=_http_error(403),
    ):
        resp = test_client.post("/api/v1/campaigns", json=sample_campaign_request)

    assert resp.status_code not in (200, 201), (
        f"SENTINEL-4b TRIPPED — 403 policy block still returned success {resp.status_code}"
    )
    from app.storage.memory import get_campaign_store
    assert len(get_campaign_store()._store) == 0, (
        "SENTINEL-4b TRIPPED — Campaign stored despite 403 policy block"
    )


def test_legal_hold_451_prevents_campaign(
    test_client, sample_campaign_request
) -> None:
    """SENTINEL-4c: Legal hold (451 Unavailable For Legal Reasons) must block."""
    with patch(
        "app.clients.federation_client.FederationClient.create_conversation",
        new_callable=AsyncMock,
        side_effect=_http_error(451),
    ):
        resp = test_client.post("/api/v1/campaigns", json=sample_campaign_request)

    assert resp.status_code not in (200, 201), (
        f"SENTINEL-4c TRIPPED — 451 legal hold still returned success {resp.status_code}"
    )
    from app.storage.memory import get_campaign_store
    assert len(get_campaign_store()._store) == 0, (
        "SENTINEL-4c TRIPPED — Campaign stored despite 451 legal hold"
    )


def test_rewrite_no_conversation_id_prevents_campaign(
    test_client, sample_campaign_request
) -> None:
    """SENTINEL-4d: 'rewrite' (FC returns no conversation_id) must not store campaign."""
    with patch(
        "app.clients.federation_client.FederationClient.create_conversation",
        new_callable=AsyncMock,
        return_value={"state": "rewrite", "message": "Prompt requires rewrite"},
    ):
        resp = test_client.post("/api/v1/campaigns", json=sample_campaign_request)

    assert resp.status_code not in (200, 201), (
        f"SENTINEL-4d TRIPPED — rewrite (no conversation_id) returned success {resp.status_code}"
    )
    from app.storage.memory import get_campaign_store
    assert len(get_campaign_store()._store) == 0, (
        "SENTINEL-4d TRIPPED — Campaign stored despite missing conversation_id (rewrite)"
    )


def test_allow_disposition_creates_campaign(
    test_client, sample_campaign_request
) -> None:
    """SENTINEL-4e: 'allow' (FC returns conversation_id) must create the campaign."""
    with patch(
        "app.clients.federation_client.FederationClient.create_conversation",
        new_callable=AsyncMock,
        return_value={"conversation_id": "conv_sentinel_allow_001", "state": "active"},
    ):
        resp = test_client.post("/api/v1/campaigns", json=sample_campaign_request)

    assert resp.status_code == 201, (
        f"SENTINEL-4e TRIPPED — 'allow' disposition did not create campaign. "
        f"Got {resp.status_code}: {resp.text}"
    )
    from app.storage.memory import get_campaign_store
    assert len(get_campaign_store()._store) == 1, (
        "SENTINEL-4e TRIPPED — Campaign NOT stored despite 'allow' disposition"
    )


def test_fc_unreachable_prevents_campaign(
    test_client, sample_campaign_request
) -> None:
    """SENTINEL-4f: FC completely unreachable → fail closed, no campaign stored."""
    with patch(
        "app.clients.federation_client.FederationClient.create_conversation",
        new_callable=AsyncMock,
        side_effect=httpx.ConnectError("Connection refused to FC"),
    ):
        resp = test_client.post("/api/v1/campaigns", json=sample_campaign_request)

    assert resp.status_code not in (200, 201), (
        f"SENTINEL-4f TRIPPED — FC unreachable still returned success {resp.status_code}"
    )
    from app.storage.memory import get_campaign_store
    assert len(get_campaign_store()._store) == 0, (
        "SENTINEL-4f TRIPPED — Campaign stored despite FC being unreachable"
    )


def test_canonical_disposition_schema() -> None:
    """SENTINEL-4g: Canonical dispositions schema guard."""
    assert {"allow", "blocked", "rewrite", "recheck"} <= CANONICAL_DISPOSITIONS, (
        "SENTINEL-4g TRIPPED — Missing required canonical dispositions"
    )
    assert "blocked" in BLOCKING_DISPOSITIONS
    assert "rewrite" in BLOCKING_DISPOSITIONS
    assert "allow" not in BLOCKING_DISPOSITIONS, (
        "SENTINEL-4g TRIPPED — 'allow' must not be in BLOCKING_DISPOSITIONS"
    )

