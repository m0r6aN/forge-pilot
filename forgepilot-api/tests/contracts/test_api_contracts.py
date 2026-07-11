"""Contract tests for API schemas."""

import pytest
import json
from pathlib import Path
from uuid import uuid4
from datetime import datetime
from unittest.mock import patch

from app.models import (
    CreateCampaignRequest,
    CampaignResponse,
    CampaignStatusResponse,
    ArtifactsResponse,
    ErrorResponse,
    CampaignStatus,
)
from app.clients import FederationClient


class TestContractCompliance:
    """Tests to ensure models comply with API contracts."""

    @pytest.fixture
    def api_contracts(self):
        """Load API contracts from JSON file."""
        contracts_path = (
            Path(__file__).parent.parent.parent.parent
            / "docs"
            / "internal"
            / "backend"
            / "API_CONTRACTS.json"
        )
        with open(contracts_path, "r") as f:
            return json.load(f)

    def test_create_campaign_request_schema(self, api_contracts):
        """Test CreateCampaignRequest matches contract."""
        schema = api_contracts["components"]["schemas"]["CreateCampaignRequest"]

        # Verify required fields
        required = schema["required"]
        assert "business_idea" in required
        assert "target_audience" in required
        assert "tenant_id" in required
        assert "actor_id" in required

        # Test model with required fields
        request = CreateCampaignRequest(
            business_idea="AI meal planning app for busy professionals",
            target_audience="Urban professionals aged 25-40",
            tenant_id=uuid4(),
            actor_id="user@example.com",
        )
        assert request is not None

    def test_campaign_response_schema(self, api_contracts):
        """Test CampaignResponse matches contract."""
        schema = api_contracts["components"]["schemas"]["CampaignResponse"]

        # Verify required fields
        required = schema["required"]
        assert "campaign_id" in required
        assert "status" in required
        assert "created_at" in required
        assert "correlation_id" in required

        # Test model
        response = CampaignResponse(
            campaign_id=uuid4(),
            status=CampaignStatus.IN_PROGRESS,
            created_at=datetime.utcnow(),
            correlation_id=uuid4(),
        )
        assert response is not None

    def test_campaign_status_response_schema(self, api_contracts):
        """Test CampaignStatusResponse matches contract."""
        schema = api_contracts["components"]["schemas"]["CampaignStatusResponse"]

        # Verify required fields
        required = schema["required"]
        assert "campaign_id" in required
        assert "status" in required
        assert "created_at" in required
        assert "updated_at" in required

        # Test model with progress
        response = CampaignStatusResponse(
            campaign_id=uuid4(),
            status=CampaignStatus.IN_PROGRESS,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            progress={
                "current_phase": "brand_strategy",
                "completion_percentage": 50,
                "last_message": "Generating brand names",
            },
        )
        assert response.progress.current_phase == "brand_strategy"

    def test_artifacts_response_schema(self, api_contracts):
        """Test ArtifactsResponse matches contract."""
        schema = api_contracts["components"]["schemas"]["ArtifactsResponse"]

        # Verify required fields
        required = schema["required"]
        assert "campaign_id" in required
        assert "artifacts" in required

        # Test model
        response = ArtifactsResponse(
            campaign_id=uuid4(),
            artifacts={
                "brand_name": "NutriFlow",
                "tagline": "Fuel Your Day",
                "domain_suggestions": [
                    {"domain": "nutriflow.com", "available": True, "price": 2499.0}
                ],
                "brand_guidelines": {
                    "colors": ["#4CAF50"],
                    "typography": "Montserrat",
                    "voice": "Friendly",
                },
                "legal_review": {"trademark_status": "clear", "risks": []},
            },
            generated_at=datetime.utcnow(),
        )
        assert response.artifacts.brand_name == "NutriFlow"

    def test_error_response_schema(self, api_contracts):
        """Test ErrorResponse matches contract."""
        schema = api_contracts["components"]["schemas"]["ErrorResponse"]

        # Verify required fields
        required = schema["required"]
        assert "error" in required

        # Verify error detail structure
        error_detail = schema["properties"]["error"]
        assert "code" in error_detail["properties"]
        assert "message" in error_detail["properties"]

        # Test model
        response = ErrorResponse(
            error={
                "code": "VALIDATION_ERROR",
                "message": "Invalid request",
                "correlation_id": str(uuid4()),
            }
        )
        assert response.error.code == "VALIDATION_ERROR"

    def test_status_enum_values(self, api_contracts):
        """Test campaign status enum matches contract."""
        schema = api_contracts["components"]["schemas"]["CampaignStatusResponse"]
        status_enum = schema["properties"]["status"]["enum"]

        # Verify enum values
        assert "queued" in status_enum
        assert "in_progress" in status_enum
        assert "completed" in status_enum
        assert "failed" in status_enum

        # Test all enum values are valid
        assert CampaignStatus.QUEUED.value == "queued"
        assert CampaignStatus.IN_PROGRESS.value == "in_progress"
        assert CampaignStatus.COMPLETED.value == "completed"
        assert CampaignStatus.FAILED.value == "failed"

    def test_business_idea_constraints(self, api_contracts):
        """Test business_idea field constraints."""
        schema = api_contracts["components"]["schemas"]["CreateCampaignRequest"]
        business_idea = schema["properties"]["business_idea"]

        assert business_idea["minLength"] == 10
        assert business_idea["maxLength"] == 2000

        # Test minimum length
        with pytest.raises(Exception):
            CreateCampaignRequest(
                business_idea="short",
                target_audience="Professionals",
                tenant_id=uuid4(),
                actor_id="user@example.com",
            )

    def test_target_audience_constraints(self, api_contracts):
        """Test target_audience field constraints."""
        schema = api_contracts["components"]["schemas"]["CreateCampaignRequest"]
        target_audience = schema["properties"]["target_audience"]

        assert target_audience["minLength"] == 5
        assert target_audience["maxLength"] == 500

        # Test minimum length
        with pytest.raises(Exception):
            CreateCampaignRequest(
                business_idea="AI meal planning app for professionals",
                target_audience="Pro",
                tenant_id=uuid4(),
                actor_id="user@example.com",
            )

    def test_completion_percentage_bounds(self, api_contracts):
        """Test completion percentage constraints."""
        schema = api_contracts["components"]["schemas"]["CampaignStatusResponse"]
        progress_schema = schema["properties"]["progress"]["properties"]
        completion = progress_schema["completion_percentage"]

        assert completion["minimum"] == 0
        assert completion["maximum"] == 100

        # Test valid value
        response = CampaignStatusResponse(
            campaign_id=uuid4(),
            status=CampaignStatus.IN_PROGRESS,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            progress={"completion_percentage": 75},
        )
        assert response.progress.completion_percentage == 75

        # Test invalid value
        with pytest.raises(Exception):
            CampaignStatusResponse(
                campaign_id=uuid4(),
                status=CampaignStatus.IN_PROGRESS,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                progress={"completion_percentage": 101},
            )


class TestErrorTaxonomyContract:
    """Contract tests for stable error taxonomy and status codes."""

    @patch.object(FederationClient, "create_conversation")
    async def test_idempotency_conflict_contract(
        self, mock_create, test_client, sample_campaign_request
    ):
        mock_create.return_value = {
            "conversation_id": "conv_123456",
            "state": "active",
            "created_at": datetime.utcnow().isoformat(),
        }
        headers = {"Idempotency-Key": "taxonomy-1"}
        created = test_client.post("/api/v1/campaigns", json=sample_campaign_request, headers=headers)
        assert created.status_code == 201

        duplicate = test_client.post("/api/v1/campaigns", json=sample_campaign_request, headers=headers)
        assert duplicate.status_code == 409
        assert duplicate.json()["error"]["code"] == "IDEMPOTENCY_HIT"

    @patch.object(FederationClient, "create_conversation")
    async def test_tenant_mismatch_forbidden_contract(
        self, mock_create, test_client, sample_campaign_request
    ):
        mock_create.return_value = {
            "conversation_id": "conv_123456",
            "state": "active",
            "created_at": datetime.utcnow().isoformat(),
        }
        forbidden = test_client.post(
            "/api/v1/campaigns",
            json=sample_campaign_request,
            headers={"X-Tenant-ID": str(uuid4())},
        )
        assert forbidden.status_code == 403
        assert forbidden.json()["error"]["code"] == "TENANT_FORBIDDEN"

    def test_validation_error_contract(self, test_client, sample_campaign_request):
        bad_payload = sample_campaign_request.copy()
        bad_payload["target_audience"] = "bad"
        response = test_client.post("/api/v1/campaigns", json=bad_payload)
        assert response.status_code == 422
