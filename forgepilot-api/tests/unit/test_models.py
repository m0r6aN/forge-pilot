"""Unit tests for Pydantic models."""

import pytest
from uuid import uuid4
from datetime import datetime
from pydantic import ValidationError

from app.models import (
    CreateCampaignRequest,
    CampaignResponse,
    CampaignStatusResponse,
    ArtifactsResponse,
    CampaignStatus,
    ErrorResponse,
    ErrorDetail,
)


class TestCreateCampaignRequest:
    """Tests for CreateCampaignRequest model."""

    def test_valid_request(self):
        """Test valid campaign request."""
        data = {
            "business_idea": "AI meal planning app",
            "target_audience": "Busy professionals",
            "tenant_id": str(uuid4()),
            "actor_id": "user@example.com",
        }
        request = CreateCampaignRequest(**data)
        assert request.business_idea == data["business_idea"]
        assert request.target_audience == data["target_audience"]
        assert request.brand_values is None

    def test_with_brand_values(self):
        """Test request with brand values."""
        data = {
            "business_idea": "AI meal planning app",
            "target_audience": "Busy professionals",
            "brand_values": ["health", "convenience"],
            "tenant_id": str(uuid4()),
            "actor_id": "user@example.com",
        }
        request = CreateCampaignRequest(**data)
        assert len(request.brand_values) == 2

    def test_business_idea_too_short(self):
        """Test business_idea minimum length validation."""
        data = {
            "business_idea": "short",  # Less than 10 chars
            "target_audience": "Busy professionals",
            "tenant_id": str(uuid4()),
            "actor_id": "user@example.com",
        }
        with pytest.raises(ValidationError) as exc:
            CreateCampaignRequest(**data)
        assert "at least 10 characters" in str(exc.value)

    def test_business_idea_too_long(self):
        """Test business_idea maximum length validation."""
        data = {
            "business_idea": "x" * 2001,  # More than 2000 chars
            "target_audience": "Busy professionals",
            "tenant_id": str(uuid4()),
            "actor_id": "user@example.com",
        }
        with pytest.raises(ValidationError):
            CreateCampaignRequest(**data)

    def test_target_audience_too_short(self):
        """Test target_audience minimum length validation."""
        data = {
            "business_idea": "AI meal planning app",
            "target_audience": "pro",  # Less than 5 chars
            "tenant_id": str(uuid4()),
            "actor_id": "user@example.com",
        }
        with pytest.raises(ValidationError):
            CreateCampaignRequest(**data)

    def test_missing_required_fields(self):
        """Test missing required fields."""
        data = {
            "business_idea": "AI meal planning app",
            # Missing target_audience, tenant_id, actor_id
        }
        with pytest.raises(ValidationError) as exc:
            CreateCampaignRequest(**data)
        errors = exc.value.errors()
        assert len(errors) >= 3

    def test_invalid_tenant_id_format(self):
        """Test invalid UUID format for tenant_id."""
        data = {
            "business_idea": "AI meal planning app",
            "target_audience": "Busy professionals",
            "tenant_id": "not-a-uuid",
            "actor_id": "user@example.com",
        }
        with pytest.raises(ValidationError):
            CreateCampaignRequest(**data)


class TestCampaignResponse:
    """Tests for CampaignResponse model."""

    def test_valid_response(self):
        """Test valid campaign response."""
        data = {
            "campaign_id": uuid4(),
            "status": CampaignStatus.IN_PROGRESS,
            "created_at": datetime.utcnow(),
            "correlation_id": uuid4(),
        }
        response = CampaignResponse(**data)
        assert response.status == CampaignStatus.IN_PROGRESS
        assert isinstance(response.created_at, datetime)


class TestCampaignStatusResponse:
    """Tests for CampaignStatusResponse model."""

    def test_with_progress(self):
        """Test status response with progress."""
        data = {
            "campaign_id": uuid4(),
            "status": CampaignStatus.IN_PROGRESS,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "progress": {
                "current_phase": "brand_strategy",
                "completion_percentage": 50,
                "last_message": "Generating brand names",
            },
        }
        response = CampaignStatusResponse(**data)
        assert response.progress.current_phase == "brand_strategy"
        assert response.progress.completion_percentage == 50

    def test_with_error(self):
        """Test status response with error."""
        data = {
            "campaign_id": uuid4(),
            "status": CampaignStatus.FAILED,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "error": {
                "code": "FEDERATION_ERROR",
                "message": "Agent communication failed",
            },
        }
        response = CampaignStatusResponse(**data)
        assert response.error.code == "FEDERATION_ERROR"

    def test_completion_percentage_bounds(self):
        """Test completion percentage validation."""
        # Valid: 0-100
        data = {
            "campaign_id": uuid4(),
            "status": CampaignStatus.IN_PROGRESS,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "progress": {"completion_percentage": 100},
        }
        response = CampaignStatusResponse(**data)
        assert response.progress.completion_percentage == 100

        # Invalid: > 100
        data["progress"]["completion_percentage"] = 101
        with pytest.raises(ValidationError):
            CampaignStatusResponse(**data)


class TestArtifactsResponse:
    """Tests for ArtifactsResponse model."""

    def test_complete_artifacts(self):
        """Test response with complete artifacts."""
        data = {
            "campaign_id": uuid4(),
            "artifacts": {
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
                "legal_review": {
                    "trademark_status": "clear",
                    "risks": [],
                },
            },
            "generated_at": datetime.utcnow(),
        }
        response = ArtifactsResponse(**data)
        assert response.artifacts.brand_name == "NutriFlow"
        assert len(response.artifacts.domain_suggestions) == 1
        assert response.artifacts.brand_guidelines.colors[0] == "#4CAF50"


class TestErrorResponse:
    """Tests for ErrorResponse model."""

    def test_error_detail(self):
        """Test error detail structure."""
        data = {
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid request",
                "correlation_id": str(uuid4()),
            }
        }
        response = ErrorResponse(**data)
        assert response.error.code == "VALIDATION_ERROR"
        assert response.error.correlation_id is not None

    def test_error_with_details(self):
        """Test error with additional details."""
        data = {
            "error": {
                "code": "FEDERATION_ERROR",
                "message": "Connection refused",
                "details": {"url": "http://federation:3000", "timeout": 30},
            }
        }
        response = ErrorResponse(**data)
        assert response.error.details["url"] == "http://federation:3000"
