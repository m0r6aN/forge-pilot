"""Shared test fixtures."""

import pytest
from uuid import uuid4
from datetime import datetime
from fastapi.testclient import TestClient

from app.main import app
from app.storage import InMemoryCampaignStore, CampaignMetadata


@pytest.fixture
def test_client():
    """FastAPI test client."""
    return TestClient(app)


@pytest.fixture
def sample_campaign_request():
    """Sample campaign request payload."""
    return {
        "business_idea": "AI-powered meal planning app for busy professionals",
        "target_audience": "Urban professionals aged 25-40",
        "brand_values": ["health", "convenience", "sustainability"],
        "tenant_id": str(uuid4()),
        "actor_id": "user@example.com",
    }


@pytest.fixture
def sample_campaign_metadata():
    """Sample campaign metadata."""
    return CampaignMetadata(
        campaign_id=uuid4(),
        conversation_id="conv_123456",
        tenant_id=uuid4(),
        actor_id="user@example.com",
        correlation_id=uuid4(),
        created_at=datetime.utcnow(),
    )


@pytest.fixture
def campaign_store():
    """Fresh campaign store instance."""
    return InMemoryCampaignStore()


@pytest.fixture
def mock_federation_response():
    """Mock Federation Core conversation response."""
    return {
        "conversation_id": "conv_123456",
        "state": "active",
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
        "messages": [
            {
                "role": "assistant",
                "content": "Starting brand strategy phase",
                "timestamp": datetime.utcnow().isoformat(),
            }
        ],
        "current_phase": "brand_strategy",
        "completion_percentage": 25,
    }


@pytest.fixture
def mock_artifacts_response():
    """Mock Federation Core artifacts response."""
    return {
        "brand_name": "NutriFlow",
        "tagline": "Fuel Your Day, Naturally",
        "domain_suggestions": [
            {"domain": "nutriflow.com", "available": True, "price": 2499.0},
            {"domain": "nutriflow.io", "available": True, "price": 1299.0},
        ],
        "brand_guidelines": {
            "colors": ["#4CAF50", "#8BC34A", "#CDDC39"],
            "typography": "Montserrat for headings, Open Sans for body",
            "voice": "Friendly, motivating, health-conscious",
        },
        "legal_review": {
            "trademark_status": "clear",
            "risks": [],
        },
        "generated_at": datetime.utcnow().isoformat(),
    }
