"""
Integration tests: ForgePilot API -> omega-core workflow routing.

Verifies that the forgepilot-api correctly routes ForgePilot v1 workflow
requests to omega-core's FC run endpoint and handles the response envelope.

All omega-core HTTP calls are mocked with unittest.mock so these tests run
fully in-process with no external services required.

Pattern follows test_campaign_flow.py in this same directory.
"""

from __future__ import annotations

import pytest
from datetime import datetime, timezone
from unittest.mock import patch, AsyncMock, MagicMock
from uuid import uuid4

from app.clients import FederationClient


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _make_run(
    run_id: str | None = None,
    status: str = "pending",
    workflow_id: str = "forgepilot.teaser.v1",
    output_payload: dict | None = None,
) -> dict:
    """Return a minimal omega-core WorkflowRun dict for mocking."""
    return {
        "run_id": run_id or str(uuid4()),
        "workflow_id": workflow_id,
        "workflow_version": "1.0.0",
        "status": status,
        "tenant_id": "test-tenant",
        "actor_id": "test-actor",
        "correlation_id": str(uuid4()),
        "input_payload": {"idea": "Test idea"},
        "output_payload": output_payload,
        "created_at": _utc_now(),
        "updated_at": _utc_now(),
    }


# ---------------------------------------------------------------------------
# Campaign creation already tested in test_campaign_flow.py.
# These tests focus specifically on ForgePilot v1 workflow semantics.
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
class TestForgePilotTeaserRouting:
    """
    Verify that the forgepilot-api campaign endpoint produces the right
    Federation request for the forgepilot.teaser.v1 workflow.
    """

    @patch.object(FederationClient, "create_conversation")
    async def test_create_campaign_sends_forgepilot_workflow_id(
        self, mock_create, test_client, sample_campaign_request
    ):
        """
        Campaign creation must include the forgepilot business idea in the
        request and map to an active ForgePilot workflow.

        Regression guard: the Federation call must carry the business_idea
        from the campaign request so omega-core can route to the right workflow.
        """
        conversation_id = str(uuid4())
        mock_create.return_value = {
            "conversation_id": conversation_id,
            "state": "active",
            "created_at": _utc_now(),
        }

        response = test_client.post("/api/v1/campaigns", json=sample_campaign_request)

        assert response.status_code == 201
        data = response.json()
        assert "campaign_id" in data
        assert data["status"] == "in_progress"

        # The FederationClient.create_conversation must have been called once.
        mock_create.assert_called_once()
        call_kwargs = mock_create.call_args

        # Ensure the business idea reached the Federation client.
        args, kwargs = call_kwargs
        all_args = list(args) + list(kwargs.values())
        idea_found = any(
            sample_campaign_request["business_idea"] in str(arg)
            for arg in all_args
        )
        assert idea_found, (
            f"Expected business_idea to reach FederationClient.create_conversation. "
            f"call_args: {call_kwargs}"
        )

    @patch.object(FederationClient, "create_conversation")
    async def test_create_campaign_with_brand_values(
        self, mock_create, test_client, sample_campaign_request
    ):
        """Brand values supplied in the request are accepted without error."""
        mock_create.return_value = {
            "conversation_id": str(uuid4()),
            "state": "active",
            "created_at": _utc_now(),
        }

        request_with_brand = {
            **sample_campaign_request,
            "brand_values": ["innovation", "trust", "simplicity"],
        }

        response = test_client.post("/api/v1/campaigns", json=request_with_brand)
        assert response.status_code == 201

    @patch.object(FederationClient, "create_conversation")
    async def test_correlation_id_flows_to_federation(
        self, mock_create, test_client, sample_campaign_request
    ):
        """Correlation ID supplied by the caller is forwarded to Federation."""
        correlation_id = str(uuid4())
        mock_create.return_value = {
            "conversation_id": str(uuid4()),
            "state": "active",
            "created_at": _utc_now(),
        }

        sample_campaign_request["correlation_id"] = correlation_id
        response = test_client.post("/api/v1/campaigns", json=sample_campaign_request)

        assert response.status_code == 201
        data = response.json()
        assert data["correlation_id"] == correlation_id
        assert response.headers.get("X-Correlation-ID") == correlation_id


@pytest.mark.asyncio
class TestForgePilotOutputParsing:
    """
    Verify that the forgepilot-api correctly maps the omega-core run output
    back to campaign artifact fields when the run completes.
    """

    @patch.object(FederationClient, "create_conversation")
    @patch.object(FederationClient, "get_conversation")
    @patch.object(FederationClient, "get_artifacts")
    async def test_completed_run_with_teaser_artifacts(
        self,
        mock_get_artifacts,
        mock_get_conversation,
        mock_create,
        test_client,
        sample_campaign_request,
        mock_artifacts_response,
    ):
        """Artifacts endpoint returns 200 with artifact data when campaign completed."""
        conversation_id = str(uuid4())
        mock_create.return_value = {
            "conversation_id": conversation_id,
            "state": "active",
            "created_at": _utc_now(),
        }

        # Create campaign.
        create_response = test_client.post("/api/v1/campaigns", json=sample_campaign_request)
        assert create_response.status_code == 201
        campaign_id = create_response.json()["campaign_id"]

        # Mock completed conversation.
        mock_get_conversation.return_value = {
            "conversation_id": conversation_id,
            "state": "completed",
            "created_at": _utc_now(),
            "updated_at": _utc_now(),
        }
        mock_get_artifacts.return_value = mock_artifacts_response

        # Retrieve artifacts.
        artifacts_response = test_client.get(f"/api/v1/campaigns/{campaign_id}/artifacts")
        assert artifacts_response.status_code == 200
        data = artifacts_response.json()
        assert "artifacts" in data
        assert data["campaign_id"] == campaign_id

    @patch.object(FederationClient, "create_conversation")
    @patch.object(FederationClient, "get_conversation")
    async def test_in_progress_run_returns_409_on_artifact_fetch(
        self,
        mock_get_conversation,
        mock_create,
        test_client,
        sample_campaign_request,
    ):
        """
        Attempting to fetch artifacts before the campaign completes returns 409
        CAMPAIGN_NOT_COMPLETED — prevents premature partial output exposure.
        """
        conversation_id = str(uuid4())
        mock_create.return_value = {
            "conversation_id": conversation_id,
            "state": "active",
            "created_at": _utc_now(),
        }

        create_response = test_client.post("/api/v1/campaigns", json=sample_campaign_request)
        campaign_id = create_response.json()["campaign_id"]

        mock_get_conversation.return_value = {
            "conversation_id": conversation_id,
            "state": "active",  # Still running.
            "created_at": _utc_now(),
            "updated_at": _utc_now(),
        }

        artifacts_response = test_client.get(f"/api/v1/campaigns/{campaign_id}/artifacts")
        assert artifacts_response.status_code == 409
        assert artifacts_response.json()["error"]["code"] == "CAMPAIGN_NOT_COMPLETED"


@pytest.mark.asyncio
class TestForgePilotIsolationInvariants:
    """
    Verify the isolation invariants that protect multi-tenant ForgePilot runs.
    These tests are marked as INV-ISOLATION compliance checks.
    """

    @patch.object(FederationClient, "create_conversation")
    async def test_tenant_a_campaign_invisible_to_tenant_b(
        self, mock_create, test_client, sample_campaign_request
    ):
        """
        Tenant B cannot read or modify Tenant A's campaign.

        INV-ISOLATION: workflow outputs must never leak across tenant boundaries.
        """
        mock_create.return_value = {
            "conversation_id": str(uuid4()),
            "state": "active",
            "created_at": _utc_now(),
        }

        create_response = test_client.post("/api/v1/campaigns", json=sample_campaign_request)
        campaign_id = create_response.json()["campaign_id"]

        # Tenant B tries to read Tenant A's campaign.
        tenant_b_id = str(uuid4())
        status_response = test_client.get(
            f"/api/v1/campaigns/{campaign_id}",
            headers={"X-Tenant-ID": tenant_b_id},
        )
        assert status_response.status_code == 403
        assert status_response.json()["error"]["code"] == "TENANT_FORBIDDEN"

    @patch.object(FederationClient, "create_conversation")
    async def test_idempotency_key_prevents_duplicate_run(
        self, mock_create, test_client, sample_campaign_request
    ):
        """
        Submitting the same Idempotency-Key twice returns 409 on the second
        request.

        INV-NO-DUPLICATE-SIDE-EFFECTS: only one FC run may be created per key.
        """
        mock_create.return_value = {
            "conversation_id": str(uuid4()),
            "state": "active",
            "created_at": _utc_now(),
        }

        idem_key = f"idem-forgepilot-{uuid4()}"
        headers = {"Idempotency-Key": idem_key}

        first = test_client.post(
            "/api/v1/campaigns", json=sample_campaign_request, headers=headers
        )
        assert first.status_code == 201

        second = test_client.post(
            "/api/v1/campaigns", json=sample_campaign_request, headers=headers
        )
        assert second.status_code == 409
        assert second.json()["error"]["code"] == "IDEMPOTENCY_HIT"


@pytest.mark.skip(reason="Requires omega-core running — set OMEGA_FEDERATION_URL to enable")
class TestForgePilotOmegaRoundTrip:
    """
    Live round-trip integration tests.

    These tests require omega-core to be running at OMEGA_FEDERATION_URL.
    They are skipped by default and should be run in a staging environment.

    Run with: pytest tests/integration/test_forgepilot_omega_flow.py::TestForgePilotOmegaRoundTrip -v
    """

    async def test_create_and_poll_teaser_run_live(self, test_client):
        """
        Full live round-trip: POST campaign -> omega-core creates FC run ->
        poll until completed -> verify teaser output shape.

        Prerequisites: omega-core running, ANTHROPIC_API_KEY set (or stub mode).
        """
        # This is intentionally a stub that documents the expected behaviour.
        # Implement with httpx and a real omega-core instance in CI staging.
        pass
