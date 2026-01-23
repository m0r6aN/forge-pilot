"""Integration tests for complete campaign flow."""

import pytest
from uuid import uuid4
from unittest.mock import patch, AsyncMock
from datetime import datetime

from app.clients import FederationClient
from app.models import CampaignStatus


@pytest.mark.asyncio
class TestCampaignFlow:
    """Integration tests for campaign lifecycle."""

    @patch.object(FederationClient, "create_conversation")
    async def test_create_campaign_success(
        self, mock_create, test_client, sample_campaign_request
    ):
        """Test successful campaign creation."""
        # Mock Federation response
        mock_create.return_value = {
            "conversation_id": "conv_123456",
            "state": "active",
            "created_at": datetime.utcnow().isoformat(),
        }

        response = test_client.post("/api/v1/campaigns", json=sample_campaign_request)

        assert response.status_code == 201
        data = response.json()
        assert "campaign_id" in data
        assert data["status"] == "in_progress"
        assert "correlation_id" in data
        assert "X-Correlation-ID" in response.headers

    async def test_create_campaign_validation_error(
        self, test_client, sample_campaign_request
    ):
        """Test campaign creation with validation error."""
        # Invalid request - business_idea too short
        invalid_request = sample_campaign_request.copy()
        invalid_request["business_idea"] = "short"

        response = test_client.post("/api/v1/campaigns", json=invalid_request)

        assert response.status_code == 422
        data = response.json()
        assert "detail" in data

    @patch.object(FederationClient, "create_conversation")
    async def test_create_campaign_federation_unavailable(
        self, mock_create, test_client, sample_campaign_request
    ):
        """Test campaign creation when Federation is unavailable."""
        # Mock connection error
        import httpx

        mock_create.side_effect = httpx.RequestError("Connection refused")

        response = test_client.post("/api/v1/campaigns", json=sample_campaign_request)

        assert response.status_code == 503
        data = response.json()
        assert data["error"]["code"] == "FEDERATION_UNAVAILABLE"
        assert "correlation_id" in data["error"]

    @patch.object(FederationClient, "create_conversation")
    @patch.object(FederationClient, "get_conversation")
    async def test_get_campaign_status(
        self,
        mock_get_conversation,
        mock_create,
        test_client,
        sample_campaign_request,
        mock_federation_response,
    ):
        """Test getting campaign status."""
        # Mock campaign creation
        mock_create.return_value = {
            "conversation_id": "conv_123456",
            "state": "active",
            "created_at": datetime.utcnow().isoformat(),
        }

        # Create campaign
        create_response = test_client.post(
            "/api/v1/campaigns", json=sample_campaign_request
        )
        campaign_id = create_response.json()["campaign_id"]

        # Mock status retrieval
        mock_get_conversation.return_value = mock_federation_response

        # Get status
        status_response = test_client.get(f"/api/v1/campaigns/{campaign_id}")

        assert status_response.status_code == 200
        data = status_response.json()
        assert data["campaign_id"] == campaign_id
        assert data["status"] == "in_progress"
        assert "progress" in data
        assert data["progress"]["current_phase"] == "brand_strategy"

    async def test_get_nonexistent_campaign(self, test_client):
        """Test getting status of non-existent campaign."""
        fake_id = str(uuid4())
        response = test_client.get(f"/api/v1/campaigns/{fake_id}")

        assert response.status_code == 404
        data = response.json()
        assert data["error"]["code"] == "CAMPAIGN_NOT_FOUND"

    @patch.object(FederationClient, "create_conversation")
    @patch.object(FederationClient, "get_conversation")
    @patch.object(FederationClient, "get_artifacts")
    async def test_get_artifacts_success(
        self,
        mock_get_artifacts,
        mock_get_conversation,
        mock_create,
        test_client,
        sample_campaign_request,
        mock_artifacts_response,
    ):
        """Test getting campaign artifacts."""
        # Mock campaign creation
        mock_create.return_value = {
            "conversation_id": "conv_123456",
            "state": "active",
            "created_at": datetime.utcnow().isoformat(),
        }

        # Create campaign
        create_response = test_client.post(
            "/api/v1/campaigns", json=sample_campaign_request
        )
        campaign_id = create_response.json()["campaign_id"]

        # Mock completed conversation
        mock_get_conversation.return_value = {
            "conversation_id": "conv_123456",
            "state": "completed",
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }

        # Mock artifacts
        mock_get_artifacts.return_value = mock_artifacts_response

        # Get artifacts
        artifacts_response = test_client.get(
            f"/api/v1/campaigns/{campaign_id}/artifacts"
        )

        assert artifacts_response.status_code == 200
        data = artifacts_response.json()
        assert data["campaign_id"] == campaign_id
        assert "artifacts" in data
        assert data["artifacts"]["brand_name"] == "NutriFlow"
        assert len(data["artifacts"]["domain_suggestions"]) == 2

    @patch.object(FederationClient, "create_conversation")
    @patch.object(FederationClient, "get_conversation")
    async def test_get_artifacts_not_completed(
        self,
        mock_get_conversation,
        mock_create,
        test_client,
        sample_campaign_request,
    ):
        """Test getting artifacts for incomplete campaign."""
        # Mock campaign creation
        mock_create.return_value = {
            "conversation_id": "conv_123456",
            "state": "active",
            "created_at": datetime.utcnow().isoformat(),
        }

        # Create campaign
        create_response = test_client.post(
            "/api/v1/campaigns", json=sample_campaign_request
        )
        campaign_id = create_response.json()["campaign_id"]

        # Mock in-progress conversation
        mock_get_conversation.return_value = {
            "conversation_id": "conv_123456",
            "state": "active",  # Not completed
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }

        # Try to get artifacts
        artifacts_response = test_client.get(
            f"/api/v1/campaigns/{campaign_id}/artifacts"
        )

        assert artifacts_response.status_code == 409
        data = artifacts_response.json()
        assert data["error"]["code"] == "CAMPAIGN_NOT_COMPLETED"


class TestHealthEndpoints:
    """Tests for health check endpoints."""

    def test_health_check(self, test_client):
        """Test liveness probe."""
        response = test_client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"

    @patch.object(FederationClient, "health_check")
    async def test_ready_check_success(self, mock_health, test_client):
        """Test readiness probe when Federation is available."""
        mock_health.return_value = True

        response = test_client.get("/ready")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ready"
        assert data["federation_available"] is True

    @patch.object(FederationClient, "health_check")
    async def test_ready_check_federation_down(self, mock_health, test_client):
        """Test readiness probe when Federation is unavailable."""
        mock_health.return_value = False

        response = test_client.get("/ready")
        assert response.status_code == 503
        data = response.json()
        assert data["status"] == "unavailable"
        assert data["federation_available"] is False


class TestCorrelationID:
    """Tests for correlation ID handling."""

    @patch.object(FederationClient, "create_conversation")
    async def test_correlation_id_generated(
        self, mock_create, test_client, sample_campaign_request
    ):
        """Test correlation ID is generated if not provided."""
        mock_create.return_value = {
            "conversation_id": "conv_123456",
            "state": "active",
            "created_at": datetime.utcnow().isoformat(),
        }

        response = test_client.post("/api/v1/campaigns", json=sample_campaign_request)

        assert response.status_code == 201
        assert "X-Correlation-ID" in response.headers
        data = response.json()
        assert "correlation_id" in data

    @patch.object(FederationClient, "create_conversation")
    async def test_correlation_id_preserved(
        self, mock_create, test_client, sample_campaign_request
    ):
        """Test provided correlation ID is preserved."""
        mock_create.return_value = {
            "conversation_id": "conv_123456",
            "state": "active",
            "created_at": datetime.utcnow().isoformat(),
        }

        custom_correlation_id = str(uuid4())
        sample_campaign_request["correlation_id"] = custom_correlation_id

        response = test_client.post("/api/v1/campaigns", json=sample_campaign_request)

        assert response.status_code == 201
        data = response.json()
        assert data["correlation_id"] == custom_correlation_id
