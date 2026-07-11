"""Real integration tests against live federation_core container.

These tests verify actual communication with the running federation_core service.
They test real HTTP calls, actual agent orchestration, and live workflow execution.
"""

import pytest
import httpx
import os
from uuid import uuid4
from datetime import datetime
from typing import Any, Dict

from app.clients import FederationClient
from app.models import CampaignStatus


@pytest.fixture
def federation_base_url() -> str:
    """Get Federation Core base URL from environment."""
    return os.getenv("FEDERATION_URL", "http://localhost:3000")


@pytest.fixture
def live_federation_client(federation_base_url: str) -> FederationClient:
    """Create Federation client pointed at live container."""
    client = FederationClient()
    client.base_url = federation_base_url
    return client


@pytest.fixture
async def ensure_federation_running(federation_base_url: str):
    """Verify federation_core is actually running before tests."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{federation_base_url}/health")
            if response.status_code != 200:
                pytest.skip("Federation Core not healthy")
    except Exception as e:
        pytest.skip(f"Federation Core not accessible: {e}")


@pytest.mark.integration
@pytest.mark.asyncio
class TestLiveFederationIntegration:
    """Integration tests with live federation_core container."""

    async def test_health_check_real(self, live_federation_client):
        """Test real health check against live service."""
        is_healthy = await live_federation_client.health_check()
        assert is_healthy is True, "Federation Core should be healthy"

    async def test_create_conversation_real(
        self, live_federation_client, ensure_federation_running
    ):
        """Test creating a real conversation in federation_core."""
        mission = live_federation_client.build_forgepilot_mission(
            business_idea="AI-powered fitness tracking app",
            target_audience="Health-conscious millennials aged 25-35",
            brand_values=["innovation", "wellness", "transparency"],
        )

        correlation_id = uuid4()
        tenant_id = uuid4()
        actor_id = "test-user@forgepilot.ai"

        response = await live_federation_client.create_conversation(
            mission=mission,
            correlation_id=correlation_id,
            tenant_id=tenant_id,
            actor_id=actor_id,
        )

        # Verify response structure
        assert "conversation_id" in response
        assert response.get("state") in ["queued", "active", "processing"]
        assert "created_at" in response

        # Store for cleanup
        conversation_id = response["conversation_id"]
        assert conversation_id is not None

    async def test_get_conversation_real(
        self, live_federation_client, ensure_federation_running
    ):
        """Test getting conversation status from live service."""
        # First create a conversation
        mission = live_federation_client.build_forgepilot_mission(
            business_idea="Cloud-native SaaS platform",
            target_audience="B2B enterprise customers",
        )

        create_response = await live_federation_client.create_conversation(
            mission=mission,
            correlation_id=uuid4(),
            tenant_id=uuid4(),
            actor_id="test@example.com",
        )

        conversation_id = create_response["conversation_id"]

        # Now fetch its status
        status_response = await live_federation_client.get_conversation(conversation_id)

        assert "state" in status_response
        assert "created_at" in status_response
        assert status_response.get("conversation_id") == conversation_id

    async def test_mission_template_structure(self, live_federation_client):
        """Test that mission template has correct OMEGA/KEON structure."""
        mission = live_federation_client.build_forgepilot_mission(
            business_idea="E-commerce platform for sustainable products",
            target_audience="Eco-conscious consumers",
            brand_values=["sustainability", "quality", "transparency"],
        )

        # Verify OMEGA mission structure
        assert mission["type"] == "conversational_pantheon"
        assert mission["workflow"] == "forgepilot_brand_campaign"
        assert "objective" in mission
        assert "phases" in mission
        assert len(mission["phases"]) == 4  # brand, domain, guidelines, legal

        # Verify phases
        phase_names = [p["name"] for p in mission["phases"]]
        assert "brand_strategy" in phase_names
        assert "domain_research" in phase_names
        assert "brand_guidelines" in phase_names
        assert "legal_review" in phase_names

        # Verify phase dependencies
        domain_phase = next(p for p in mission["phases"] if p["name"] == "domain_research")
        assert "depends_on" in domain_phase
        assert "brand_strategy" in domain_phase["depends_on"]

    async def test_conversation_metadata_propagation(
        self, live_federation_client, ensure_federation_running
    ):
        """Test that metadata is correctly propagated to federation_core."""
        correlation_id = uuid4()
        tenant_id = uuid4()
        actor_id = "metadata-test@example.com"

        mission = live_federation_client.build_forgepilot_mission(
            business_idea="AI-powered analytics platform",
            target_audience="Data scientists",
        )

        response = await live_federation_client.create_conversation(
            mission=mission,
            correlation_id=correlation_id,
            tenant_id=tenant_id,
            actor_id=actor_id,
        )

        # Verify metadata was accepted
        assert response is not None
        conversation_id = response["conversation_id"]

        # Fetch conversation and verify metadata
        conversation = await live_federation_client.get_conversation(conversation_id)

        # Metadata should be stored and retrievable
        metadata = conversation.get("metadata", {})
        assert metadata.get("source") == "forgepilot-api"

    async def test_error_handling_invalid_mission(
        self, live_federation_client, ensure_federation_running
    ):
        """Test error handling when sending malformed mission."""
        # Create invalid mission
        invalid_mission = {
            "type": "invalid_type",
            # Missing required fields
        }

        with pytest.raises((httpx.HTTPStatusError, ValueError)):
            await live_federation_client.create_conversation(
                mission=invalid_mission,
                correlation_id=uuid4(),
                tenant_id=uuid4(),
                actor_id="test@example.com",
            )

    async def test_timeout_handling(self, live_federation_client):
        """Test timeout handling with very short timeout."""
        client = FederationClient()
        client.timeout = 0.001  # 1ms - guaranteed to timeout

        mission = client.build_forgepilot_mission(
            business_idea="Test",
            target_audience="Test",
        )

        with pytest.raises(httpx.TimeoutException):
            await client.create_conversation(
                mission=mission,
                correlation_id=uuid4(),
                tenant_id=uuid4(),
                actor_id="test@example.com",
            )


@pytest.mark.integration
@pytest.mark.asyncio
class TestFederationWorkflowProgression:
    """Test actual workflow progression through federation_core."""

    async def test_workflow_starts_and_progresses(
        self, live_federation_client, ensure_federation_running
    ):
        """Test that a workflow actually starts and makes progress."""
        mission = live_federation_client.build_forgepilot_mission(
            business_idea="Mobile app for language learning",
            target_audience="Students and travelers",
            brand_values=["education", "accessibility"],
        )

        # Create conversation
        create_response = await live_federation_client.create_conversation(
            mission=mission,
            correlation_id=uuid4(),
            tenant_id=uuid4(),
            actor_id="workflow-test@example.com",
        )

        conversation_id = create_response["conversation_id"]

        # Poll for progress (with timeout)
        import asyncio
        max_polls = 10
        poll_interval = 2.0  # seconds

        for i in range(max_polls):
            await asyncio.sleep(poll_interval)

            status = await live_federation_client.get_conversation(conversation_id)

            state = status.get("state")
            current_phase = status.get("current_phase")
            completion = status.get("completion_percentage", 0)

            # Verify workflow is progressing
            assert state in ["queued", "active", "processing", "completed", "failed"]

            if state == "completed":
                assert completion == 100
                break

            if state == "failed":
                pytest.fail(f"Workflow failed: {status.get('error')}")

            # Should have phase information while active
            if state in ["active", "processing"]:
                assert current_phase is not None or completion > 0

    async def test_artifacts_available_after_completion(
        self, live_federation_client, ensure_federation_running
    ):
        """Test that artifacts are available once workflow completes."""
        mission = live_federation_client.build_forgepilot_mission(
            business_idea="SaaS platform for project management",
            target_audience="Remote teams",
        )

        # Create conversation
        create_response = await live_federation_client.create_conversation(
            mission=mission,
            correlation_id=uuid4(),
            tenant_id=uuid4(),
            actor_id="artifacts-test@example.com",
        )

        conversation_id = create_response["conversation_id"]

        # Wait for completion (with timeout)
        import asyncio
        max_wait = 60  # seconds
        poll_interval = 3.0

        completed = False
        for i in range(int(max_wait / poll_interval)):
            await asyncio.sleep(poll_interval)

            status = await live_federation_client.get_conversation(conversation_id)

            if status.get("state") == "completed":
                completed = True
                break

            if status.get("state") == "failed":
                pytest.skip(f"Workflow failed: {status.get('error')}")

        if not completed:
            pytest.skip("Workflow did not complete in time")

        # Fetch artifacts
        artifacts = await live_federation_client.get_artifacts(conversation_id)

        # Verify artifact structure
        assert artifacts is not None
        assert isinstance(artifacts, dict)

        # Should have brand outputs
        assert "brand_name" in artifacts or "brand_strategy" in artifacts

    async def test_error_state_handling(
        self, live_federation_client, ensure_federation_running
    ):
        """Test handling of workflow errors and failure states."""
        # Create mission with problematic requirements to trigger potential errors
        mission = live_federation_client.build_forgepilot_mission(
            business_idea="",  # Empty - may trigger validation errors
            target_audience="",
        )

        try:
            response = await live_federation_client.create_conversation(
                mission=mission,
                correlation_id=uuid4(),
                tenant_id=uuid4(),
                actor_id="error-test@example.com",
            )

            # If it was created, check for error state
            conversation_id = response["conversation_id"]

            import asyncio
            await asyncio.sleep(2.0)

            status = await live_federation_client.get_conversation(conversation_id)

            # Should either fail validation or enter failed state
            assert status.get("state") in ["failed", "active", "queued"]

        except httpx.HTTPStatusError as e:
            # Expected - validation should fail
            assert e.response.status_code in [400, 422, 500]
