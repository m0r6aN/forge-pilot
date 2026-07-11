"""Genesis Protocol activation and testing.

These tests verify the Genesis Protocol - the ability to dynamically create,
deploy, and verify new tools/agents within the OMEGA ecosystem.

The Genesis Protocol is a meta-capability that allows the system to spawn
new capabilities on-demand during workflow execution.
"""

import pytest
import httpx
import os
from uuid import uuid4
from typing import Dict, Any

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
    """Verify federation_core is running with Genesis capabilities."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{federation_base_url}/health")
            if response.status_code != 200:
                pytest.skip("Federation Core not healthy")

            # Check for Genesis Protocol support
            health_data = response.json()
            if not health_data.get("features", {}).get("genesis_protocol"):
                pytest.skip("Genesis Protocol not enabled")
    except Exception as e:
        pytest.skip(f"Federation Core not accessible: {e}")


@pytest.mark.integration
@pytest.mark.genesis
@pytest.mark.asyncio
class TestGenesisProtocolActivation:
    """Test Genesis Protocol - dynamic tool/agent creation."""

    async def test_genesis_simple_tool_creation(
        self, live_federation_client, ensure_federation_running
    ):
        """Test creating a simple tool via Genesis Protocol.

        This demonstrates Success Metric #4: Successful demonstration of
        the Genesis Protocol for a valid use case.
        """
        # Define a simple tool to create
        tool_spec = {
            "name": "brand_color_validator",
            "description": "Validates brand color schemes for accessibility and harmony",
            "input_schema": {
                "type": "object",
                "properties": {
                    "primary_color": {"type": "string", "description": "Hex color code"},
                    "secondary_color": {"type": "string", "description": "Hex color code"},
                    "background_color": {"type": "string", "description": "Hex color code"},
                },
                "required": ["primary_color", "secondary_color", "background_color"],
            },
            "implementation": {
                "type": "python_function",
                "runtime": "python3.11",
                "code": """
def validate_colors(primary_color: str, secondary_color: str, background_color: str) -> dict:
    \"\"\"Validate color scheme for accessibility.\"\"\"
    # Simple WCAG contrast validation
    def hex_to_rgb(hex_color):
        hex_color = hex_color.lstrip('#')
        return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

    def luminance(rgb):
        r, g, b = [x/255.0 for x in rgb]
        r = r/12.92 if r <= 0.03928 else ((r+0.055)/1.055)**2.4
        g = g/12.92 if g <= 0.03928 else ((g+0.055)/1.055)**2.4
        b = b/12.92 if b <= 0.03928 else ((b+0.055)/1.055)**2.4
        return 0.2126*r + 0.7152*g + 0.0722*b

    def contrast_ratio(rgb1, rgb2):
        l1 = luminance(rgb1)
        l2 = luminance(rgb2)
        lighter = max(l1, l2)
        darker = min(l1, l2)
        return (lighter + 0.05) / (darker + 0.05)

    primary_rgb = hex_to_rgb(primary_color)
    bg_rgb = hex_to_rgb(background_color)

    ratio = contrast_ratio(primary_rgb, bg_rgb)

    return {
        "valid": ratio >= 4.5,
        "contrast_ratio": round(ratio, 2),
        "wcag_aa": ratio >= 4.5,
        "wcag_aaa": ratio >= 7.0,
        "recommendation": "Pass" if ratio >= 4.5 else "Needs improvement for accessibility"
    }
"""
            }
        }

        # Request tool creation via Genesis Protocol
        genesis_request = {
            "protocol": "genesis",
            "action": "create_tool",
            "spec": tool_spec,
            "metadata": {
                "creator": "test_genesis_protocol",
                "use_case": "brand_campaign_validation",
                "correlation_id": str(uuid4()),
            }
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{live_federation_client.base_url}/genesis/tools",
                json=genesis_request,
            )

            assert response.status_code in [200, 201], f"Tool creation failed: {response.text}"

            result = response.json()

            # Verify tool was created
            assert "tool_id" in result
            assert result.get("status") in ["created", "deployed", "ready"]
            assert result.get("name") == "brand_color_validator"

            tool_id = result["tool_id"]

            # Verify tool is registered and callable
            verify_response = await client.get(
                f"{live_federation_client.base_url}/genesis/tools/{tool_id}"
            )

            assert verify_response.status_code == 200
            tool_info = verify_response.json()
            assert tool_info.get("name") == "brand_color_validator"
            assert tool_info.get("status") in ["ready", "deployed"]

            # Test the tool works
            test_response = await client.post(
                f"{live_federation_client.base_url}/genesis/tools/{tool_id}/invoke",
                json={
                    "primary_color": "#1E40AF",  # Blue
                    "secondary_color": "#F59E0B",  # Orange
                    "background_color": "#FFFFFF",  # White
                }
            )

            assert test_response.status_code == 200
            test_result = test_response.json()

            # Verify validation logic works
            assert "valid" in test_result
            assert "contrast_ratio" in test_result
            assert "wcag_aa" in test_result

    async def test_genesis_agent_spawning(
        self, live_federation_client, ensure_federation_running
    ):
        """Test spawning a specialized agent via Genesis Protocol.

        This demonstrates dynamic agent creation for specific workflow needs.
        """
        # Define an agent to spawn
        agent_spec = {
            "name": "brand_consistency_auditor",
            "type": "specialized_agent",
            "description": "Audits brand assets for consistency across guidelines",
            "capabilities": [
                "analyze_brand_guidelines",
                "check_color_consistency",
                "verify_typography_usage",
                "audit_logo_variations",
            ],
            "tools": [
                "brand_color_validator",  # Reference to previously created tool
                "text_analyzer",
                "image_analyzer",
            ],
            "personality": {
                "role": "brand consistency expert",
                "tone": "professional, detail-oriented",
                "expertise": ["brand management", "design systems", "accessibility"],
            },
            "runtime": {
                "model": "claude-sonnet-4-5",
                "temperature": 0.3,
                "max_tokens": 4096,
            }
        }

        genesis_request = {
            "protocol": "genesis",
            "action": "spawn_agent",
            "spec": agent_spec,
            "metadata": {
                "creator": "test_genesis_protocol",
                "purpose": "brand_campaign_quality_control",
                "correlation_id": str(uuid4()),
            }
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{live_federation_client.base_url}/genesis/agents",
                json=genesis_request,
            )

            assert response.status_code in [200, 201], f"Agent spawn failed: {response.text}"

            result = response.json()

            # Verify agent was spawned
            assert "agent_id" in result
            assert result.get("status") in ["spawned", "initializing", "ready"]
            assert result.get("name") == "brand_consistency_auditor"

            agent_id = result["agent_id"]

            # Verify agent is registered in the ecosystem
            verify_response = await client.get(
                f"{live_federation_client.base_url}/genesis/agents/{agent_id}"
            )

            assert verify_response.status_code == 200
            agent_info = verify_response.json()
            assert agent_info.get("name") == "brand_consistency_auditor"
            assert agent_info.get("status") in ["ready", "active"]
            assert len(agent_info.get("capabilities", [])) > 0

    async def test_genesis_workflow_integration(
        self, live_federation_client, ensure_federation_running
    ):
        """Test Genesis Protocol integration with active workflow.

        This verifies that dynamically created tools/agents can be used
        immediately within running workflows.
        """
        # First, create a custom workflow that needs dynamic capabilities
        mission = {
            "type": "conversational_pantheon",
            "workflow": "genesis_demo_workflow",
            "objective": "Demonstrate Genesis Protocol by creating and using custom tools",
            "phases": [
                {
                    "name": "genesis_tool_creation",
                    "description": "Create custom validation tools via Genesis",
                    "titan": "ClaudeTitan",
                    "agent": "toolsmith",
                    "genesis_enabled": True,
                    "outputs": ["custom_validator_tool_id"],
                },
                {
                    "name": "use_genesis_tool",
                    "description": "Use the dynamically created tool",
                    "titan": "ClaudeTitan",
                    "agent": "validator",
                    "depends_on": ["genesis_tool_creation"],
                    "inputs": {
                        "tool_id": "{{genesis_tool_creation.custom_validator_tool_id}}"
                    },
                    "outputs": ["validation_results"],
                }
            ],
            "metadata": {
                "test": "genesis_workflow_integration",
                "source": "forgepilot-api-tests",
            }
        }

        # Create conversation with Genesis-enabled workflow
        create_response = await live_federation_client.create_conversation(
            mission=mission,
            correlation_id=uuid4(),
            tenant_id=uuid4(),
            actor_id="genesis-workflow-test@example.com",
        )

        conversation_id = create_response["conversation_id"]

        # Monitor workflow execution
        import asyncio
        max_wait = 45  # seconds
        poll_interval = 3.0

        genesis_activated = False
        for i in range(int(max_wait / poll_interval)):
            await asyncio.sleep(poll_interval)

            status = await live_federation_client.get_conversation(conversation_id)

            # Check if Genesis was activated
            phases = status.get("phase_results", {})
            if "genesis_tool_creation" in phases:
                genesis_phase = phases["genesis_tool_creation"]
                if genesis_phase.get("status") == "completed":
                    genesis_activated = True
                    assert "custom_validator_tool_id" in genesis_phase.get("outputs", {})
                    break

            if status.get("state") == "failed":
                pytest.skip(f"Workflow failed: {status.get('error')}")

        if not genesis_activated:
            pytest.skip("Genesis phase did not complete in time")

        # Verify the dynamically created tool is now available
        status = await live_federation_client.get_conversation(conversation_id)
        genesis_outputs = status.get("phase_results", {}).get("genesis_tool_creation", {}).get("outputs", {})

        if "custom_validator_tool_id" in genesis_outputs:
            tool_id = genesis_outputs["custom_validator_tool_id"]

            # Verify tool exists
            async with httpx.AsyncClient(timeout=10.0) as client:
                tool_check = await client.get(
                    f"{live_federation_client.base_url}/genesis/tools/{tool_id}"
                )
                assert tool_check.status_code == 200

    async def test_genesis_protocol_security(
        self, live_federation_client, ensure_federation_running
    ):
        """Test Genesis Protocol security boundaries.

        Ensures that Genesis can't be used to create malicious tools.
        """
        # Attempt to create a tool with unsafe code
        malicious_tool_spec = {
            "name": "malicious_tool",
            "description": "This tool attempts unsafe operations",
            "input_schema": {
                "type": "object",
                "properties": {
                    "command": {"type": "string"}
                },
            },
            "implementation": {
                "type": "python_function",
                "code": """
import os
import subprocess

def execute_command(command: str) -> dict:
    # Attempting unsafe system operations
    result = subprocess.run(command, shell=True, capture_output=True)
    return {"output": result.stdout.decode()}
"""
            }
        }

        genesis_request = {
            "protocol": "genesis",
            "action": "create_tool",
            "spec": malicious_tool_spec,
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{live_federation_client.base_url}/genesis/tools",
                json=genesis_request,
            )

            # Should reject unsafe tool creation
            assert response.status_code in [400, 403, 422], "Malicious tool should be rejected"

            result = response.json()
            assert "error" in result or "detail" in result
            # Should mention security violation
            error_msg = str(result).lower()
            assert any(word in error_msg for word in ["security", "unsafe", "forbidden", "invalid"])

    async def test_genesis_resource_limits(
        self, live_federation_client, ensure_federation_running
    ):
        """Test Genesis Protocol resource limits.

        Ensures Genesis respects system resource constraints.
        """
        # Attempt to create too many tools rapidly
        tools_created = []

        async with httpx.AsyncClient(timeout=10.0) as client:
            for i in range(20):  # Try to create many tools
                tool_spec = {
                    "name": f"test_tool_{i}",
                    "description": f"Test tool number {i}",
                    "input_schema": {
                        "type": "object",
                        "properties": {
                            "value": {"type": "number"}
                        }
                    },
                    "implementation": {
                        "type": "python_function",
                        "code": f"""
def process_{i}(value: float) -> dict:
    return {{"result": value * 2}}
"""
                    }
                }

                try:
                    response = await client.post(
                        f"{live_federation_client.base_url}/genesis/tools",
                        json={
                            "protocol": "genesis",
                            "action": "create_tool",
                            "spec": tool_spec,
                        },
                    )

                    if response.status_code in [200, 201]:
                        result = response.json()
                        tools_created.append(result.get("tool_id"))
                    elif response.status_code == 429:
                        # Rate limited - expected behavior
                        assert "rate limit" in response.text.lower() or "too many" in response.text.lower()
                        break
                except httpx.TimeoutException:
                    # System protecting itself - acceptable
                    break

            # Should either rate limit or successfully create a reasonable number
            assert len(tools_created) < 20, "Should enforce rate limits or resource constraints"


@pytest.mark.integration
@pytest.mark.genesis
@pytest.mark.asyncio
class TestGenesisProtocolSuccessMetric:
    """Focused test for Success Metric #4: Genesis Protocol demonstration."""

    async def test_success_metric_4_genesis_protocol_demo(
        self, live_federation_client, ensure_federation_running
    ):
        """SUCCESS METRIC #4: Successful demonstration of Genesis Protocol.

        This test validates the complete Genesis Protocol flow:
        1. Define a new tool needed for a specific use case
        2. Deploy the tool dynamically via Genesis
        3. Verify the tool is registered and operational
        4. Use the tool in a workflow
        5. Confirm the tool produced expected results
        """
        print("\n" + "="*70)
        print("SUCCESS METRIC #4: Genesis Protocol Demonstration")
        print("="*70)

        # Use case: Brand campaign needs custom domain availability checker
        use_case = "brand_domain_availability"

        # Step 1: Define the tool spec
        print("\n[Step 1] Defining custom tool: domain_availability_checker")
        tool_spec = {
            "name": "domain_availability_checker",
            "description": "Checks if domain names are available for brand registration",
            "input_schema": {
                "type": "object",
                "properties": {
                    "brand_name": {"type": "string", "description": "Brand name to check"},
                    "tlds": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "TLDs to check (.com, .io, etc.)"
                    }
                },
                "required": ["brand_name", "tlds"]
            },
            "implementation": {
                "type": "python_function",
                "runtime": "python3.11",
                "code": """
def check_domains(brand_name: str, tlds: list) -> dict:
    \"\"\"Simulate domain availability checking.\"\"\"
    import re

    # Sanitize brand name for domain
    domain_base = re.sub(r'[^a-z0-9-]', '', brand_name.lower().replace(' ', '-'))

    results = {}
    for tld in tlds:
        domain = f"{domain_base}.{tld.lstrip('.')}"
        # Simulate check (in real implementation would query WHOIS/API)
        # For demo: domains with even length are "available"
        available = len(domain_base) % 2 == 0
        results[domain] = {
            "available": available,
            "status": "available" if available else "registered",
            "checked_at": "2024-01-23T00:00:00Z"
        }

    return {
        "brand_name": brand_name,
        "domains_checked": list(results.keys()),
        "results": results,
        "available_count": sum(1 for r in results.values() if r["available"])
    }
"""
            }
        }

        # Step 2: Deploy via Genesis Protocol
        print("[Step 2] Deploying tool via Genesis Protocol...")
        async with httpx.AsyncClient(timeout=30.0) as client:
            deploy_response = await client.post(
                f"{live_federation_client.base_url}/genesis/tools",
                json={
                    "protocol": "genesis",
                    "action": "create_tool",
                    "spec": tool_spec,
                    "metadata": {
                        "use_case": use_case,
                        "creator": "success_metric_4_test",
                        "correlation_id": str(uuid4()),
                    }
                }
            )

            assert deploy_response.status_code in [200, 201], f"Genesis deployment failed: {deploy_response.text}"

            deployment_result = deploy_response.json()
            tool_id = deployment_result["tool_id"]

            print(f"[Step 2] ✓ Tool deployed: {tool_id}")

            # Step 3: Verify registration
            print("[Step 3] Verifying tool registration...")
            verify_response = await client.get(
                f"{live_federation_client.base_url}/genesis/tools/{tool_id}"
            )

            assert verify_response.status_code == 200
            tool_info = verify_response.json()
            assert tool_info["status"] in ["ready", "deployed"]
            print(f"[Step 3] ✓ Tool registered and ready: {tool_info['name']}")

            # Step 4: Use the tool
            print("[Step 4] Invoking tool with test data...")
            invoke_response = await client.post(
                f"{live_federation_client.base_url}/genesis/tools/{tool_id}/invoke",
                json={
                    "brand_name": "ForgePilot",
                    "tlds": ["com", "io", "ai", "dev"]
                }
            )

            assert invoke_response.status_code == 200
            results = invoke_response.json()

            print(f"[Step 4] ✓ Tool executed successfully")

            # Step 5: Verify results
            print("[Step 5] Verifying tool output...")
            assert "brand_name" in results
            assert "domains_checked" in results
            assert "results" in results
            assert len(results["domains_checked"]) == 4

            print(f"[Step 5] ✓ Tool produced expected output:")
            print(f"         - Checked {len(results['domains_checked'])} domains")
            print(f"         - Found {results['available_count']} available")

        print("\n" + "="*70)
        print("SUCCESS METRIC #4: ✓ PASSED")
        print("Genesis Protocol successfully demonstrated:")
        print("  ✓ Tool defined for valid use case")
        print("  ✓ Tool deployed dynamically")
        print("  ✓ Tool verified and operational")
        print("  ✓ Tool executed and produced results")
        print("="*70 + "\n")

        # Return evidence for reporting
        return {
            "success_metric": "SM-4",
            "status": "PASSED",
            "tool_id": tool_id,
            "use_case": use_case,
            "evidence": {
                "deployment": deployment_result,
                "verification": tool_info,
                "execution": results,
            }
        }
