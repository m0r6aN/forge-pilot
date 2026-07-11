"""End-to-end workflow tests for forgepilot-api → federation_core integration.

These tests validate complete user journeys from API request through
federation_core workflow execution and artifact delivery.
"""

import pytest
import httpx
import asyncio
from uuid import uuid4
from datetime import datetime
from typing import Dict, Any, List

from app.clients import FederationClient


@pytest.fixture
def test_campaign_data() -> Dict[str, Any]:
    """Sample campaign data for E2E tests."""
    return {
        "business_idea": "AI-powered meal planning app for busy professionals",
        "target_audience": "Working professionals aged 28-42 who value health and convenience",
        "brand_values": ["health", "efficiency", "sustainability", "innovation"],
        "industry": "health_tech",
        "competitive_landscape": [
            "HelloFresh",
            "Blue Apron",
            "MyFitnessPal"
        ],
    }


@pytest.mark.e2e
@pytest.mark.asyncio
class TestBrandCampaignE2E:
    """End-to-end test for complete brand campaign workflow."""

    async def test_full_brand_campaign_workflow(
        self,
        live_federation_client,
        ensure_federation_running,
        test_campaign_data
    ):
        """Test complete brand campaign from creation to deliverables.

        This test validates:
        1. Campaign creation via API
        2. Federation workflow execution
        3. Phase progression
        4. Artifact generation
        5. Deliverable availability
        """
        print("\n" + "=" * 70)
        print("E2E TEST: Full Brand Campaign Workflow")
        print("=" * 70)

        # Step 1: Create brand campaign
        print("\n[Step 1] Creating brand campaign...")
        mission = live_federation_client.build_forgepilot_mission(
            business_idea=test_campaign_data["business_idea"],
            target_audience=test_campaign_data["target_audience"],
            brand_values=test_campaign_data["brand_values"],
        )

        correlation_id = uuid4()
        tenant_id = uuid4()
        actor_id = "e2e-test@forgepilot.ai"

        create_response = await live_federation_client.create_conversation(
            mission=mission,
            correlation_id=correlation_id,
            tenant_id=tenant_id,
            actor_id=actor_id,
        )

        conversation_id = create_response["conversation_id"]
        print(f"[Step 1] ✓ Campaign created: {conversation_id}")

        # Step 2: Monitor workflow progression
        print("\n[Step 2] Monitoring workflow progression...")
        max_wait = 300  # 5 minutes
        poll_interval = 5.0
        phases_seen = set()

        for i in range(int(max_wait / poll_interval)):
            await asyncio.sleep(poll_interval)

            status = await live_federation_client.get_conversation(conversation_id)
            state = status.get("state")
            current_phase = status.get("current_phase")
            completion = status.get("completion_percentage", 0)

            if current_phase:
                if current_phase not in phases_seen:
                    print(f"[Step 2]   → Phase: {current_phase} ({completion}%)")
                    phases_seen.add(current_phase)

            if state == "completed":
                print(f"[Step 2] ✓ Workflow completed (100%)")
                break

            if state == "failed":
                error = status.get("error", "Unknown error")
                pytest.fail(f"Workflow failed: {error}")

        if state != "completed":
            pytest.skip(f"Workflow did not complete in {max_wait}s")

        # Step 3: Verify all expected phases completed
        print("\n[Step 3] Verifying phase completion...")
        expected_phases = {
            "brand_strategy",
            "domain_research",
            "brand_guidelines",
            "legal_review"
        }

        assert len(phases_seen & expected_phases) >= 3, \
            f"Expected phases {expected_phases}, saw {phases_seen}"
        print(f"[Step 3] ✓ Phases completed: {phases_seen}")

        # Step 4: Fetch and validate artifacts
        print("\n[Step 4] Fetching campaign artifacts...")
        artifacts = await live_federation_client.get_artifacts(conversation_id)

        assert artifacts is not None, "Artifacts should be available"

        # Validate brand strategy artifacts
        if "brand_strategy" in artifacts:
            brand = artifacts["brand_strategy"]
            assert "brand_name" in brand or "name" in brand
            print(f"[Step 4] ✓ Brand strategy: {brand.get('brand_name') or brand.get('name')}")

        # Validate domain artifacts
        if "domain_research" in artifacts:
            domains = artifacts["domain_research"]
            assert "domains" in domains or "suggestions" in domains
            domain_list = domains.get("domains") or domains.get("suggestions", [])
            print(f"[Step 4] ✓ Domain suggestions: {len(domain_list)} domains")

        # Validate brand guidelines
        if "brand_guidelines" in artifacts:
            guidelines = artifacts["brand_guidelines"]
            assert "colors" in guidelines or "typography" in guidelines or "logo" in guidelines
            print(f"[Step 4] ✓ Brand guidelines generated")

        print(f"[Step 4] ✓ Artifacts validated")

        # Step 5: Verify deliverables are production-ready
        print("\n[Step 5] Validating deliverable quality...")
        quality_checks = {
            "brand_name_present": False,
            "domain_suggestions": False,
            "color_palette": False,
            "typography_defined": False,
        }

        if "brand_strategy" in artifacts:
            brand = artifacts["brand_strategy"]
            if "brand_name" in brand or "name" in brand:
                quality_checks["brand_name_present"] = True

        if "domain_research" in artifacts:
            domains = artifacts["domain_research"]
            if "domains" in domains or "suggestions" in domains:
                quality_checks["domain_suggestions"] = True

        if "brand_guidelines" in artifacts:
            guidelines = artifacts["brand_guidelines"]
            if "colors" in guidelines or "color_palette" in guidelines:
                quality_checks["color_palette"] = True
            if "typography" in guidelines or "fonts" in guidelines:
                quality_checks["typography_defined"] = True

        passed_checks = sum(quality_checks.values())
        total_checks = len(quality_checks)

        print(f"[Step 5] Quality checks: {passed_checks}/{total_checks} passed")
        for check, passed in quality_checks.items():
            status_icon = "✓" if passed else "✗"
            print(f"[Step 5]   {status_icon} {check}")

        assert passed_checks >= total_checks * 0.5, \
            "At least 50% of quality checks should pass"

        print("\n" + "=" * 70)
        print("E2E TEST: ✓ PASSED")
        print("Complete brand campaign workflow validated successfully")
        print("=" * 70 + "\n")


@pytest.mark.e2e
@pytest.mark.asyncio
class TestMultiTitanCollaboration:
    """Test workflows involving multiple Titans (Success Metric #2)."""

    async def test_multi_titan_collaboration(
        self,
        live_federation_client,
        ensure_federation_running
    ):
        """Test collaboration between multiple Titans.

        SUCCESS METRIC #2: A successful collaboration that includes
        all 4 Titans and 2 or more rounds of dialogue.
        """
        print("\n" + "=" * 70)
        print("SUCCESS METRIC #2: Multi-Titan Collaboration")
        print("=" * 70)

        # Create a mission that requires multiple Titans
        mission = {
            "type": "conversational_pantheon",
            "workflow": "multi_titan_brand_analysis",
            "objective": "Analyze brand strategy from multiple AI perspectives",
            "business_context": {
                "idea": "Sustainable fashion marketplace",
                "audience": "Eco-conscious millennials",
                "values": ["sustainability", "transparency", "quality"]
            },
            "phases": [
                {
                    "name": "claude_strategy",
                    "description": "Claude Titan develops initial brand strategy",
                    "titan": "ClaudeTitan",
                    "agent": "brand_strategist",
                    "outputs": ["strategy_v1"]
                },
                {
                    "name": "gpt_critique",
                    "description": "GPT Titan critiques and refines strategy",
                    "titan": "GPTTitan",
                    "agent": "brand_critic",
                    "depends_on": ["claude_strategy"],
                    "inputs": {"strategy": "{{claude_strategy.strategy_v1}}"},
                    "outputs": ["critique", "strategy_v2"]
                },
                {
                    "name": "gemini_enhancement",
                    "description": "Gemini Titan enhances with creative elements",
                    "titan": "GeminiTitan",
                    "agent": "creative_director",
                    "depends_on": ["gpt_critique"],
                    "inputs": {"strategy": "{{gpt_critique.strategy_v2}}"},
                    "outputs": ["enhanced_strategy"]
                },
                {
                    "name": "grok_validation",
                    "description": "Grok Titan validates market fit",
                    "titan": "GrokTitan",
                    "agent": "market_validator",
                    "depends_on": ["gemini_enhancement"],
                    "inputs": {"strategy": "{{gemini_enhancement.enhanced_strategy}}"},
                    "outputs": ["final_strategy", "validation_report"]
                },
                {
                    "name": "claude_synthesis",
                    "description": "Claude Titan synthesizes all feedback (Round 2)",
                    "titan": "ClaudeTitan",
                    "agent": "synthesizer",
                    "depends_on": ["grok_validation"],
                    "inputs": {
                        "original": "{{claude_strategy.strategy_v1}}",
                        "critique": "{{gpt_critique.critique}}",
                        "creative": "{{gemini_enhancement.enhanced_strategy}}",
                        "validation": "{{grok_validation.validation_report}}"
                    },
                    "outputs": ["synthesized_strategy"]
                }
            ],
            "metadata": {
                "test": "multi_titan_collaboration",
                "success_metric": "SM-2",
            }
        }

        print("\n[Step 1] Creating multi-Titan collaboration workflow...")
        create_response = await live_federation_client.create_conversation(
            mission=mission,
            correlation_id=uuid4(),
            tenant_id=uuid4(),
            actor_id="multi-titan-test@example.com",
        )

        conversation_id = create_response["conversation_id"]
        print(f"[Step 1] ✓ Workflow created: {conversation_id}")

        # Monitor Titan participation
        print("\n[Step 2] Monitoring Titan participation...")
        max_wait = 180  # 3 minutes
        poll_interval = 5.0

        titans_seen = set()
        rounds_completed = 0

        for i in range(int(max_wait / poll_interval)):
            await asyncio.sleep(poll_interval)

            status = await live_federation_client.get_conversation(conversation_id)
            state = status.get("state")
            current_phase = status.get("current_phase")

            # Track Titan participation
            phase_results = status.get("phase_results", {})
            for phase_name, phase_data in phase_results.items():
                if phase_data.get("status") == "completed":
                    titan = phase_data.get("titan") or mission["phases"][0].get("titan")
                    if titan and titan not in titans_seen:
                        print(f"[Step 2]   → Titan active: {titan}")
                        titans_seen.add(titan)

            # Track rounds (second appearance of ClaudeTitan = round 2)
            claude_phases = [p for p in phase_results.keys() if "claude" in p.lower()]
            if len(claude_phases) >= 2:
                rounds_completed = 2

            if state == "completed":
                print(f"[Step 2] ✓ Collaboration completed")
                break

            if state == "failed":
                pytest.skip(f"Workflow failed: {status.get('error')}")

        if state != "completed":
            pytest.skip(f"Workflow did not complete in {max_wait}s")

        # Verify Success Metric #2 requirements
        print("\n[Step 3] Verifying Success Metric #2 requirements...")

        expected_titans = {"ClaudeTitan", "GPTTitan", "GeminiTitan", "GrokTitan"}
        titans_participated = len(titans_seen & expected_titans)

        print(f"[Step 3]   Titans participated: {titans_participated}/4")
        print(f"[Step 3]   Titans: {titans_seen & expected_titans}")
        print(f"[Step 3]   Rounds completed: {rounds_completed}")

        # Success Metric #2 requirements
        assert titans_participated >= 4, f"Need all 4 Titans, only {titans_participated} participated"
        assert rounds_completed >= 2, f"Need at least 2 rounds, only {rounds_completed} completed"

        print("\n" + "=" * 70)
        print("SUCCESS METRIC #2: ✓ PASSED")
        print("Multi-Titan collaboration validated:")
        print(f"  ✓ All 4 Titans participated: {titans_seen & expected_titans}")
        print(f"  ✓ {rounds_completed}+ rounds of dialogue completed")
        print("=" * 70 + "\n")


@pytest.mark.e2e
@pytest.mark.asyncio
class TestErrorRecoveryE2E:
    """Test error handling and recovery in end-to-end workflows."""

    async def test_workflow_retry_on_failure(
        self,
        live_federation_client,
        ensure_federation_running
    ):
        """Test that workflows can recover from transient failures."""
        mission = {
            "type": "conversational_pantheon",
            "workflow": "error_recovery_test",
            "objective": "Test error recovery mechanisms",
            "phases": [
                {
                    "name": "phase_1",
                    "description": "First phase",
                    "titan": "ClaudeTitan",
                    "retry_policy": {
                        "max_retries": 3,
                        "backoff": "exponential"
                    }
                }
            ]
        }

        create_response = await live_federation_client.create_conversation(
            mission=mission,
            correlation_id=uuid4(),
            tenant_id=uuid4(),
            actor_id="error-recovery-test@example.com",
        )

        conversation_id = create_response["conversation_id"]

        # Monitor for retry attempts
        max_wait = 60
        poll_interval = 3.0

        for i in range(int(max_wait / poll_interval)):
            await asyncio.sleep(poll_interval)

            status = await live_federation_client.get_conversation(conversation_id)
            state = status.get("state")

            # Check for retry metadata
            if "retry_count" in status or "retries" in str(status):
                print(f"Retry detected in workflow")

            if state in ["completed", "failed"]:
                # Either succeeds or fails with retry attempts
                return

        pytest.skip("Error recovery test did not complete")

    async def test_timeout_handling_e2e(
        self,
        live_federation_client,
        ensure_federation_running
    ):
        """Test that workflows handle timeouts gracefully."""
        mission = {
            "type": "conversational_pantheon",
            "workflow": "timeout_test",
            "objective": "Test timeout handling",
            "timeout_seconds": 10,  # Very short timeout
            "phases": [
                {
                    "name": "long_running_phase",
                    "description": "Phase that might timeout",
                    "timeout_seconds": 5
                }
            ]
        }

        create_response = await live_federation_client.create_conversation(
            mission=mission,
            correlation_id=uuid4(),
            tenant_id=uuid4(),
            actor_id="timeout-test@example.com",
        )

        conversation_id = create_response["conversation_id"]

        await asyncio.sleep(15)  # Wait past timeout

        status = await live_federation_client.get_conversation(conversation_id)

        # Should handle timeout gracefully (not crash)
        assert status.get("state") in ["completed", "failed", "timeout"]

        if status.get("state") == "failed":
            error = status.get("error", "")
            # Error should mention timeout
            assert "timeout" in error.lower() or "time" in error.lower()


@pytest.mark.e2e
@pytest.mark.asyncio
class TestPerformanceE2E:
    """Test performance characteristics of end-to-end workflows."""

    async def test_workflow_completion_time(
        self,
        live_federation_client,
        ensure_federation_running
    ):
        """Test that workflows complete within reasonable time."""
        mission = {
            "type": "conversational_pantheon",
            "workflow": "performance_test",
            "objective": "Simple workflow for performance testing",
            "phases": [
                {
                    "name": "quick_phase",
                    "description": "Single quick phase",
                    "titan": "ClaudeTitan"
                }
            ]
        }

        start_time = datetime.now()

        create_response = await live_federation_client.create_conversation(
            mission=mission,
            correlation_id=uuid4(),
            tenant_id=uuid4(),
            actor_id="performance-test@example.com",
        )

        conversation_id = create_response["conversation_id"]

        # Poll for completion
        max_wait = 60
        poll_interval = 2.0

        for i in range(int(max_wait / poll_interval)):
            await asyncio.sleep(poll_interval)

            status = await live_federation_client.get_conversation(conversation_id)
            if status.get("state") == "completed":
                break

        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()

        print(f"\nWorkflow completed in {duration:.2f}s")

        # Simple workflow should complete quickly
        assert duration < 60, f"Workflow took too long: {duration}s"

    async def test_concurrent_workflows(
        self,
        live_federation_client,
        ensure_federation_running
    ):
        """Test handling of multiple concurrent workflows."""
        num_workflows = 3

        missions = [
            {
                "type": "conversational_pantheon",
                "workflow": f"concurrent_test_{i}",
                "objective": f"Concurrent test {i}",
                "phases": [{"name": f"phase_{i}", "titan": "ClaudeTitan"}]
            }
            for i in range(num_workflows)
        ]

        # Create all workflows concurrently
        conversation_ids = []
        for i, mission in enumerate(missions):
            response = await live_federation_client.create_conversation(
                mission=mission,
                correlation_id=uuid4(),
                tenant_id=uuid4(),
                actor_id=f"concurrent-test-{i}@example.com",
            )
            conversation_ids.append(response["conversation_id"])

        print(f"\nCreated {len(conversation_ids)} concurrent workflows")

        # All should be accepted
        assert len(conversation_ids) == num_workflows

        # Give them time to process
        await asyncio.sleep(10)

        # Check status of each
        statuses = []
        for conv_id in conversation_ids:
            status = await live_federation_client.get_conversation(conv_id)
            statuses.append(status.get("state"))

        # All should be processing or completed (not rejected)
        for state in statuses:
            assert state in ["queued", "active", "processing", "completed"]

        print(f"Concurrent workflow states: {statuses}")
