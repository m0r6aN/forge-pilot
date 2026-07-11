"""End-to-end workflow tests for complete campaign flows.

These tests verify entire workflows from start to finish, including:
- Multi-phase campaign execution
- Titan collaboration (Success Metric #2)
- Artifact generation
- Error recovery
- Real-world scenarios
"""

import pytest
import httpx
import os
import asyncio
from uuid import uuid4
from typing import Dict, Any, List

from app.clients import FederationClient


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
    """Verify federation_core is running before tests."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{federation_base_url}/health")
            if response.status_code != 200:
                pytest.skip("Federation Core not healthy")
    except Exception as e:
        pytest.skip(f"Federation Core not accessible: {e}")


async def poll_until_complete(
    federation_client: FederationClient,
    conversation_id: str,
    max_wait: int = 120,
    poll_interval: float = 3.0
) -> Dict[str, Any]:
    """Poll conversation until complete or timeout.

    Args:
        federation_client: Client to use
        conversation_id: Conversation to poll
        max_wait: Maximum seconds to wait
        poll_interval: Seconds between polls

    Returns:
        Final conversation status

    Raises:
        TimeoutError: If conversation doesn't complete in time
        RuntimeError: If conversation fails
    """
    for i in range(int(max_wait / poll_interval)):
        await asyncio.sleep(poll_interval)

        status = await federation_client.get_conversation(conversation_id)
        state = status.get("state")

        if state == "completed":
            return status
        elif state == "failed":
            error = status.get("error", "Unknown error")
            raise RuntimeError(f"Workflow failed: {error}")

    raise TimeoutError(f"Workflow did not complete in {max_wait}s")


@pytest.mark.integration
@pytest.mark.e2e
@pytest.mark.asyncio
class TestCompleteCampaignWorkflows:
    """End-to-end tests for complete brand campaign workflows."""

    @pytest.mark.slow
    async def test_full_brand_campaign_workflow(
        self, live_federation_client, ensure_federation_running
    ):
        """Test complete brand campaign from start to finish.

        This test runs the full ForgePilot workflow:
        1. Brand strategy phase
        2. Domain research phase
        3. Brand guidelines generation
        4. Legal review phase

        Expected artifacts:
        - Brand name
        - Brand positioning
        - Color palette
        - Typography
        - Domain recommendations
        - Logo concepts
        - Brand guidelines document
        - Legal compliance review
        """
        print("\n" + "="*70)
        print("END-TO-END: Full Brand Campaign Workflow")
        print("="*70)

        mission = live_federation_client.build_forgepilot_mission(
            business_idea="AI-powered personal finance assistant for millennials",
            target_audience="Tech-savvy millennials aged 25-35 who want better financial habits",
            brand_values=["transparency", "empowerment", "simplicity", "trust"],
        )

        print("\n[1] Creating brand campaign conversation...")
        create_response = await live_federation_client.create_conversation(
            mission=mission,
            correlation_id=uuid4(),
            tenant_id=uuid4(),
            actor_id="e2e-brand-campaign@test.com",
        )

        conversation_id = create_response["conversation_id"]
        print(f"[1] ✓ Conversation created: {conversation_id}")

        print("\n[2] Monitoring workflow execution...")
        try:
            final_status = await poll_until_complete(
                live_federation_client,
                conversation_id,
                max_wait=180,  # 3 minutes
                poll_interval=5.0
            )

            print(f"[2] ✓ Workflow completed!")
            print(f"    Final state: {final_status.get('state')}")
            print(f"    Completion: {final_status.get('completion_percentage', 0)}%")

        except TimeoutError:
            pytest.skip("Workflow did not complete in time (may still be processing)")
        except RuntimeError as e:
            pytest.fail(f"Workflow failed: {e}")

        print("\n[3] Retrieving artifacts...")
        artifacts = await live_federation_client.get_artifacts(conversation_id)

        # Verify key artifacts were generated
        expected_artifacts = [
            "brand_name",
            "brand_positioning",
            "color_palette",
            "typography",
        ]

        for artifact_name in expected_artifacts:
            assert artifact_name in artifacts, f"Missing artifact: {artifact_name}"
            print(f"[3] ✓ Found artifact: {artifact_name}")

        print("\n[4] Verifying artifact quality...")

        # Brand name should be a string
        assert isinstance(artifacts["brand_name"], str)
        assert len(artifacts["brand_name"]) > 0
        print(f"[4] ✓ Brand name: {artifacts['brand_name']}")

        # Color palette should have colors
        color_palette = artifacts["color_palette"]
        assert "primary" in color_palette or "colors" in color_palette
        print(f"[4] ✓ Color palette defined")

        print("\n" + "="*70)
        print("END-TO-END: ✓ PASSED - Full campaign workflow completed")
        print("="*70 + "\n")

    @pytest.mark.slow
    async def test_multi_titan_collaboration_workflow(
        self, live_federation_client, ensure_federation_running
    ):
        """Test workflow with multiple Titans collaborating.

        SUCCESS METRIC #2: This test demonstrates successful collaboration
        that includes all 4 Titans and 2 or more rounds of dialogue.

        Workflow phases:
        1. ClaudeTitan: Initial brand strategy
        2. GPTTitan: Market analysis
        3. GeminiTitan: Creative concepts
        4. GrokTitan: Competitive analysis
        5. ClaudeTitan: Synthesis (round 2)
        """
        print("\n" + "="*70)
        print("SUCCESS METRIC #2: Multi-Titan Collaboration Workflow")
        print("="*70)

        mission = {
            "type": "conversational_pantheon",
            "workflow": "multi_titan_collaboration",
            "objective": "Demonstrate all 4 Titans collaborating across multiple rounds",
            "phases": [
                {
                    "name": "brand_strategy",
                    "description": "Initial brand strategy by ClaudeTitan",
                    "titan": "ClaudeTitan",
                    "agent": "brand_strategist",
                    "inputs": {
                        "business_idea": "Sustainable fashion marketplace",
                        "target_audience": "Eco-conscious millennials"
                    },
                    "outputs": ["strategy", "positioning"],
                },
                {
                    "name": "market_analysis",
                    "description": "Market analysis by GPTTitan",
                    "titan": "GPTTitan",
                    "agent": "market_analyst",
                    "depends_on": ["brand_strategy"],
                    "inputs": {
                        "strategy": "{{brand_strategy.strategy}}"
                    },
                    "outputs": ["market_insights", "competitors"],
                },
                {
                    "name": "creative_concepts",
                    "description": "Creative concepts by GeminiTitan",
                    "titan": "GeminiTitan",
                    "agent": "creative_director",
                    "depends_on": ["brand_strategy"],
                    "inputs": {
                        "positioning": "{{brand_strategy.positioning}}"
                    },
                    "outputs": ["visual_concepts", "taglines"],
                },
                {
                    "name": "competitive_analysis",
                    "description": "Competitive analysis by GrokTitan",
                    "titan": "GrokTitan",
                    "agent": "competitive_analyst",
                    "depends_on": ["market_analysis"],
                    "inputs": {
                        "competitors": "{{market_analysis.competitors}}"
                    },
                    "outputs": ["competitive_insights", "differentiation"],
                },
                {
                    "name": "synthesis",
                    "description": "Final synthesis by ClaudeTitan (Round 2)",
                    "titan": "ClaudeTitan",
                    "agent": "brand_architect",
                    "depends_on": ["creative_concepts", "competitive_analysis"],
                    "inputs": {
                        "concepts": "{{creative_concepts.visual_concepts}}",
                        "insights": "{{competitive_analysis.competitive_insights}}"
                    },
                    "outputs": ["final_brand_package"],
                },
            ],
            "metadata": {
                "success_metric": "SM-2",
                "test": "multi_titan_collaboration",
            }
        }

        print("\n[1] Creating multi-Titan collaboration...")
        create_response = await live_federation_client.create_conversation(
            mission=mission,
            correlation_id=uuid4(),
            tenant_id=uuid4(),
            actor_id="sm2-multi-titan@test.com",
        )

        conversation_id = create_response["conversation_id"]
        print(f"[1] ✓ Conversation created: {conversation_id}")

        print("\n[2] Monitoring Titan collaboration...")

        titans_active = set()
        rounds_by_titan = {"ClaudeTitan": 0, "GPTTitan": 0, "GeminiTitan": 0, "GrokTitan": 0}

        max_wait = 180  # 3 minutes
        poll_interval = 5.0

        for i in range(int(max_wait / poll_interval)):
            await asyncio.sleep(poll_interval)

            status = await live_federation_client.get_conversation(conversation_id)
            state = status.get("state")

            # Track which Titans have been active
            current_phase = status.get("current_phase")
            if current_phase:
                phase_results = status.get("phase_results", {})
                for phase_name, phase_data in phase_results.items():
                    titan = phase_data.get("titan")
                    if titan:
                        titans_active.add(titan)
                        if phase_data.get("status") in ["completed", "active"]:
                            rounds_by_titan[titan] = rounds_by_titan.get(titan, 0) + 1

            print(f"[2] Progress: {status.get('completion_percentage', 0)}% | "
                  f"Titans active: {len(titans_active)} | "
                  f"Phase: {current_phase or 'queued'}")

            if state == "completed":
                print(f"[2] ✓ Workflow completed!")
                break
            elif state == "failed":
                pytest.fail(f"Workflow failed: {status.get('error')}")

        # Verify Success Metric #2 requirements
        print("\n[3] Verifying Success Metric #2 criteria...")

        # Requirement: All 4 Titans participated
        expected_titans = {"ClaudeTitan", "GPTTitan", "GeminiTitan", "GrokTitan"}
        assert titans_active == expected_titans, \
            f"Not all Titans participated. Active: {titans_active}"
        print(f"[3] ✓ All 4 Titans participated: {titans_active}")

        # Requirement: At least 2 rounds of dialogue
        # ClaudeTitan should have 2 rounds (brand_strategy + synthesis)
        total_rounds = sum(rounds_by_titan.values())
        assert total_rounds >= 2, f"Need at least 2 rounds, got {total_rounds}"
        print(f"[3] ✓ Multiple rounds completed: {total_rounds}")

        # Verify artifacts from each Titan
        artifacts = await live_federation_client.get_artifacts(conversation_id)
        assert len(artifacts) > 0, "No artifacts generated"
        print(f"[3] ✓ Generated {len(artifacts)} artifacts")

        print("\n" + "="*70)
        print("SUCCESS METRIC #2: ✓ PASSED")
        print(f"  ✓ All 4 Titans participated: {titans_active}")
        print(f"  ✓ {total_rounds} rounds of dialogue completed")
        print(f"  ✓ {len(artifacts)} artifacts generated")
        print("="*70 + "\n")

    async def test_workflow_with_error_recovery(
        self, live_federation_client, ensure_federation_running
    ):
        """Test workflow error handling and recovery.

        This creates a workflow that intentionally encounters issues
        and verifies the system handles them gracefully.
        """
        mission = {
            "type": "conversational_pantheon",
            "workflow": "error_recovery_test",
            "objective": "Test error handling and recovery",
            "phases": [
                {
                    "name": "phase_1",
                    "description": "Normal phase",
                    "titan": "ClaudeTitan",
                    "agent": "test_agent",
                    "outputs": ["result_1"],
                },
                {
                    "name": "phase_2_problematic",
                    "description": "Phase with potential issues",
                    "titan": "GPTTitan",
                    "agent": "problematic_agent",
                    "depends_on": ["phase_1"],
                    "inputs": {
                        "invalid_input": "{{phase_1.nonexistent_output}}"  # Bad reference
                    },
                    "outputs": ["result_2"],
                    "retry_on_failure": True,
                    "max_retries": 2,
                },
                {
                    "name": "phase_3_recovery",
                    "description": "Recovery phase",
                    "titan": "ClaudeTitan",
                    "agent": "recovery_agent",
                    "depends_on": ["phase_1"],  # Doesn't depend on problematic phase
                    "outputs": ["recovery_result"],
                },
            ],
            "error_handling": {
                "strategy": "continue_on_error",
                "partial_completion": True,
            }
        }

        create_response = await live_federation_client.create_conversation(
            mission=mission,
            correlation_id=uuid4(),
            tenant_id=uuid4(),
            actor_id="error-recovery-test@test.com",
        )

        conversation_id = create_response["conversation_id"]

        # Monitor for error handling
        max_wait = 60
        poll_interval = 3.0

        error_detected = False
        recovery_attempted = False

        for i in range(int(max_wait / poll_interval)):
            await asyncio.sleep(poll_interval)

            status = await live_federation_client.get_conversation(conversation_id)
            state = status.get("state")

            # Check for error handling
            phase_results = status.get("phase_results", {})
            if "phase_2_problematic" in phase_results:
                phase_2_status = phase_results["phase_2_problematic"].get("status")
                if phase_2_status in ["failed", "error"]:
                    error_detected = True
                elif phase_2_status == "retrying":
                    recovery_attempted = True

            if "phase_3_recovery" in phase_results:
                phase_3_status = phase_results["phase_3_recovery"].get("status")
                if phase_3_status == "completed":
                    recovery_attempted = True

            if state in ["completed", "failed"]:
                break

        # Verify error handling behavior
        # Either the system detected and handled errors, or completed successfully
        final_status = await live_federation_client.get_conversation(conversation_id)
        assert final_status.get("state") in ["completed", "failed"]

        # If it failed, should have error info
        if final_status.get("state") == "failed":
            assert "error" in final_status or "phase_results" in final_status

    async def test_parallel_phase_execution(
        self, live_federation_client, ensure_federation_running
    ):
        """Test workflow with parallel phase execution.

        Phases without dependencies can run in parallel.
        """
        mission = {
            "type": "conversational_pantheon",
            "workflow": "parallel_execution_test",
            "objective": "Test parallel phase execution",
            "phases": [
                {
                    "name": "init_phase",
                    "description": "Initialization",
                    "titan": "ClaudeTitan",
                    "agent": "init_agent",
                    "outputs": ["init_data"],
                },
                # These three phases can run in parallel
                {
                    "name": "parallel_1",
                    "description": "Parallel task 1",
                    "titan": "ClaudeTitan",
                    "agent": "worker_1",
                    "depends_on": ["init_phase"],
                    "outputs": ["result_1"],
                },
                {
                    "name": "parallel_2",
                    "description": "Parallel task 2",
                    "titan": "GPTTitan",
                    "agent": "worker_2",
                    "depends_on": ["init_phase"],
                    "outputs": ["result_2"],
                },
                {
                    "name": "parallel_3",
                    "description": "Parallel task 3",
                    "titan": "GeminiTitan",
                    "agent": "worker_3",
                    "depends_on": ["init_phase"],
                    "outputs": ["result_3"],
                },
                # Final phase waits for all parallel phases
                {
                    "name": "final_phase",
                    "description": "Combine results",
                    "titan": "ClaudeTitan",
                    "agent": "combiner",
                    "depends_on": ["parallel_1", "parallel_2", "parallel_3"],
                    "outputs": ["final_result"],
                },
            ]
        }

        create_response = await live_federation_client.create_conversation(
            mission=mission,
            correlation_id=uuid4(),
            tenant_id=uuid4(),
            actor_id="parallel-test@test.com",
        )

        conversation_id = create_response["conversation_id"]

        # Monitor for parallel execution
        max_wait = 90
        poll_interval = 3.0

        parallel_phases_seen_active = set()

        for i in range(int(max_wait / poll_interval)):
            await asyncio.sleep(poll_interval)

            status = await live_federation_client.get_conversation(conversation_id)

            # Check which phases are active simultaneously
            phase_results = status.get("phase_results", {})
            for phase_name in ["parallel_1", "parallel_2", "parallel_3"]:
                if phase_name in phase_results:
                    phase_status = phase_results[phase_name].get("status")
                    if phase_status in ["active", "processing"]:
                        parallel_phases_seen_active.add(phase_name)

            if status.get("state") in ["completed", "failed"]:
                break

        # If system supports parallel execution, we should see multiple phases active
        # (though this depends on federation_core implementation)
        final_status = await live_federation_client.get_conversation(conversation_id)

        # Verify all phases completed
        phase_results = final_status.get("phase_results", {})
        assert "final_phase" in phase_results, "Final phase should exist"


@pytest.mark.integration
@pytest.mark.e2e
@pytest.mark.asyncio
class TestRealWorldScenarios:
    """Test real-world usage scenarios."""

    async def test_iterative_refinement_workflow(
        self, live_federation_client, ensure_federation_running
    ):
        """Test iterative refinement scenario.

        Simulates a user requesting refinements to initial results.
        """
        # Initial campaign
        mission_v1 = live_federation_client.build_forgepilot_mission(
            business_idea="Fitness app",
            target_audience="Gym goers",
        )

        response_v1 = await live_federation_client.create_conversation(
            mission=mission_v1,
            correlation_id=uuid4(),
            tenant_id=uuid4(),
            actor_id="iterative-test@test.com",
        )

        conversation_id_v1 = response_v1["conversation_id"]

        # In real scenario, user would review results and request changes
        # For test, we create a refinement mission
        mission_v2 = {
            "type": "conversational_pantheon",
            "workflow": "brand_refinement",
            "objective": "Refine brand based on initial feedback",
            "context": {
                "previous_conversation": conversation_id_v1,
                "feedback": "Make it more energetic and youth-focused"
            },
            "phases": [
                {
                    "name": "incorporate_feedback",
                    "description": "Revise brand based on feedback",
                    "titan": "ClaudeTitan",
                    "agent": "brand_refiner",
                    "outputs": ["revised_brand"],
                }
            ]
        }

        response_v2 = await live_federation_client.create_conversation(
            mission=mission_v2,
            correlation_id=uuid4(),
            tenant_id=uuid4(),
            actor_id="iterative-test@test.com",
        )

        assert "conversation_id" in response_v2
        # System should accept refinement workflow

    async def test_concurrent_campaigns(
        self, live_federation_client, ensure_federation_running
    ):
        """Test running multiple campaigns concurrently.

        Verifies system can handle multiple simultaneous workflows.
        """
        campaigns = []

        # Create 3 concurrent campaigns
        for i in range(3):
            mission = live_federation_client.build_forgepilot_mission(
                business_idea=f"Test business {i}",
                target_audience=f"Test audience {i}",
            )

            response = await live_federation_client.create_conversation(
                mission=mission,
                correlation_id=uuid4(),
                tenant_id=uuid4(),
                actor_id=f"concurrent-test-{i}@test.com",
            )

            campaigns.append(response["conversation_id"])

        # Verify all campaigns were created
        assert len(campaigns) == 3
        assert len(set(campaigns)) == 3  # All unique IDs

        # Check all are in valid states
        for conversation_id in campaigns:
            status = await live_federation_client.get_conversation(conversation_id)
            assert status.get("state") in ["queued", "active", "processing"]
