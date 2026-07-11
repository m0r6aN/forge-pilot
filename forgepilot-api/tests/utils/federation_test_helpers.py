"""Shared test utilities for Federation Core testing.

These utilities provide reusable patterns for testing federation_core
integration across different test suites. They encapsulate common operations
like polling, assertion helpers, and test data generation.

Use these patterns in your own SDK tests to speed up development.
"""

import asyncio
from typing import Dict, Any, List, Optional, Callable
from uuid import uuid4
import httpx


class FederationTestHelpers:
    """Reusable test helpers for federation_core integration tests."""

    @staticmethod
    async def poll_until_state(
        get_status_func: Callable,
        target_states: List[str],
        max_wait: int = 120,
        poll_interval: float = 3.0,
        on_progress: Optional[Callable[[Dict[str, Any]], None]] = None
    ) -> Dict[str, Any]:
        """Poll until conversation reaches one of the target states.

        Args:
            get_status_func: Async function that returns current status
            target_states: List of acceptable target states
            max_wait: Maximum seconds to wait
            poll_interval: Seconds between polls
            on_progress: Optional callback for progress updates

        Returns:
            Final status dict

        Raises:
            TimeoutError: If target state not reached in time
            RuntimeError: If conversation enters failed state (unless failed is a target)
        """
        for i in range(int(max_wait / poll_interval)):
            await asyncio.sleep(poll_interval)

            status = await get_status_func()
            current_state = status.get("state")

            # Call progress callback if provided
            if on_progress:
                on_progress(status)

            # Check if we reached target state
            if current_state in target_states:
                return status

            # Check for failure (unless it's an expected target state)
            if current_state == "failed" and "failed" not in target_states:
                error = status.get("error", "Unknown error")
                raise RuntimeError(f"Workflow failed: {error}")

        raise TimeoutError(
            f"Did not reach target states {target_states} in {max_wait}s"
        )

    @staticmethod
    async def poll_until_complete(
        get_status_func: Callable,
        max_wait: int = 120,
        poll_interval: float = 3.0,
        on_progress: Optional[Callable[[Dict[str, Any]], None]] = None
    ) -> Dict[str, Any]:
        """Poll until conversation completes.

        Convenience wrapper around poll_until_state for completion.
        """
        return await FederationTestHelpers.poll_until_state(
            get_status_func=get_status_func,
            target_states=["completed"],
            max_wait=max_wait,
            poll_interval=poll_interval,
            on_progress=on_progress
        )

    @staticmethod
    async def wait_for_phase(
        get_status_func: Callable,
        phase_name: str,
        phase_status: str = "completed",
        max_wait: int = 60,
        poll_interval: float = 2.0
    ) -> Dict[str, Any]:
        """Wait for a specific phase to reach a status.

        Args:
            get_status_func: Async function that returns current status
            phase_name: Name of the phase to wait for
            phase_status: Target status for the phase
            max_wait: Maximum seconds to wait
            poll_interval: Seconds between polls

        Returns:
            Phase result dict

        Raises:
            TimeoutError: If phase doesn't reach status in time
        """
        for i in range(int(max_wait / poll_interval)):
            await asyncio.sleep(poll_interval)

            status = await get_status_func()
            phase_results = status.get("phase_results", {})

            if phase_name in phase_results:
                phase_data = phase_results[phase_name]
                if phase_data.get("status") == phase_status:
                    return phase_data

        raise TimeoutError(
            f"Phase '{phase_name}' did not reach status '{phase_status}' in {max_wait}s"
        )

    @staticmethod
    def assert_valid_mission(mission: Dict[str, Any]) -> None:
        """Assert that a mission has valid structure.

        Raises:
            AssertionError: If mission is invalid
        """
        # Required top-level fields
        assert "type" in mission, "Mission missing 'type'"
        assert "workflow" in mission, "Mission missing 'workflow'"
        assert "objective" in mission, "Mission missing 'objective'"
        assert "phases" in mission, "Mission missing 'phases'"

        # Phases validation
        assert isinstance(mission["phases"], list), "Phases must be a list"
        assert len(mission["phases"]) > 0, "Mission must have at least one phase"

        # Validate each phase
        phase_names = []
        for i, phase in enumerate(mission["phases"]):
            assert "name" in phase, f"Phase {i} missing 'name'"
            assert "description" in phase, f"Phase {i} missing 'description'"
            assert "titan" in phase, f"Phase {i} missing 'titan'"
            assert "agent" in phase, f"Phase {i} missing 'agent'"
            assert "outputs" in phase, f"Phase {i} missing 'outputs'"

            phase_names.append(phase["name"])

            # Validate dependencies reference existing phases
            if "depends_on" in phase:
                for dep in phase["depends_on"]:
                    assert dep in phase_names, \
                        f"Phase '{phase['name']}' depends on undefined phase '{dep}'"

    @staticmethod
    def assert_valid_conversation_response(response: Dict[str, Any]) -> None:
        """Assert that a conversation creation response is valid.

        Raises:
            AssertionError: If response is invalid
        """
        assert "conversation_id" in response, "Missing conversation_id"
        assert "state" in response, "Missing state"
        assert "created_at" in response, "Missing created_at"

        # Validate state
        valid_states = ["queued", "active", "processing", "completed", "failed"]
        assert response["state"] in valid_states, \
            f"Invalid state: {response['state']}"

        # Validate conversation_id format
        assert isinstance(response["conversation_id"], str)
        assert len(response["conversation_id"]) > 0

    @staticmethod
    def assert_valid_status_response(status: Dict[str, Any]) -> None:
        """Assert that a conversation status response is valid.

        Raises:
            AssertionError: If status is invalid
        """
        assert "conversation_id" in status, "Missing conversation_id"
        assert "state" in status, "Missing state"
        assert "created_at" in status, "Missing created_at"

        # State should be valid
        valid_states = ["queued", "active", "processing", "completed", "failed"]
        assert status["state"] in valid_states

        # If completed, should have 100% completion
        if status.get("state") == "completed":
            completion = status.get("completion_percentage", 0)
            assert completion == 100, f"Completed workflow should be 100%, got {completion}%"

    @staticmethod
    def assert_artifacts_present(
        artifacts: Dict[str, Any],
        required_artifacts: List[str]
    ) -> None:
        """Assert that required artifacts are present.

        Args:
            artifacts: Artifacts dict from get_artifacts()
            required_artifacts: List of required artifact names

        Raises:
            AssertionError: If any required artifacts are missing
        """
        assert isinstance(artifacts, dict), "Artifacts should be a dict"

        missing_artifacts = []
        for artifact_name in required_artifacts:
            if artifact_name not in artifacts:
                missing_artifacts.append(artifact_name)

        assert len(missing_artifacts) == 0, \
            f"Missing required artifacts: {missing_artifacts}"


class MissionBuilder:
    """Fluent builder for creating test missions."""

    def __init__(self):
        """Initialize mission builder."""
        self.mission = {
            "type": "conversational_pantheon",
            "workflow": "test_workflow",
            "objective": "Test objective",
            "phases": [],
            "metadata": {}
        }

    def with_workflow(self, workflow: str) -> 'MissionBuilder':
        """Set workflow name."""
        self.mission["workflow"] = workflow
        return self

    def with_objective(self, objective: str) -> 'MissionBuilder':
        """Set objective."""
        self.mission["objective"] = objective
        return self

    def add_phase(
        self,
        name: str,
        titan: str,
        agent: str,
        description: str = "",
        outputs: Optional[List[str]] = None,
        depends_on: Optional[List[str]] = None,
        inputs: Optional[Dict[str, str]] = None
    ) -> 'MissionBuilder':
        """Add a phase to the mission.

        Args:
            name: Phase name
            titan: Titan to use (ClaudeTitan, GPTTitan, etc.)
            agent: Agent to use
            description: Phase description
            outputs: List of output names
            depends_on: List of phase names this depends on
            inputs: Input mappings from other phases

        Returns:
            Self for chaining
        """
        phase = {
            "name": name,
            "description": description or f"Phase: {name}",
            "titan": titan,
            "agent": agent,
            "outputs": outputs or [f"{name}_output"]
        }

        if depends_on:
            phase["depends_on"] = depends_on

        if inputs:
            phase["inputs"] = inputs

        self.mission["phases"].append(phase)
        return self

    def with_metadata(self, key: str, value: Any) -> 'MissionBuilder':
        """Add metadata field."""
        self.mission["metadata"][key] = value
        return self

    def build(self) -> Dict[str, Any]:
        """Build and return the mission."""
        # Validate before returning
        FederationTestHelpers.assert_valid_mission(self.mission)
        return self.mission


class TestDataFactory:
    """Factory for generating test data."""

    @staticmethod
    def create_simple_mission() -> Dict[str, Any]:
        """Create a simple single-phase mission for testing."""
        return MissionBuilder() \
            .with_workflow("simple_test") \
            .with_objective("Simple test mission") \
            .add_phase("test_phase", "ClaudeTitan", "test_agent") \
            .build()

    @staticmethod
    def create_multi_phase_mission() -> Dict[str, Any]:
        """Create a multi-phase mission for testing."""
        return MissionBuilder() \
            .with_workflow("multi_phase_test") \
            .with_objective("Multi-phase test mission") \
            .add_phase("phase_1", "ClaudeTitan", "agent_1", outputs=["result_1"]) \
            .add_phase(
                "phase_2",
                "GPTTitan",
                "agent_2",
                depends_on=["phase_1"],
                inputs={"from_phase_1": "{{phase_1.result_1}}"},
                outputs=["result_2"]
            ) \
            .add_phase(
                "phase_3",
                "ClaudeTitan",
                "agent_3",
                depends_on=["phase_2"],
                inputs={"from_phase_2": "{{phase_2.result_2}}"},
                outputs=["final_result"]
            ) \
            .build()

    @staticmethod
    def create_parallel_execution_mission() -> Dict[str, Any]:
        """Create a mission with parallel phase execution."""
        return MissionBuilder() \
            .with_workflow("parallel_test") \
            .with_objective("Parallel execution test") \
            .add_phase("init", "ClaudeTitan", "init_agent", outputs=["init_data"]) \
            .add_phase(
                "parallel_1",
                "ClaudeTitan",
                "worker_1",
                depends_on=["init"],
                outputs=["result_1"]
            ) \
            .add_phase(
                "parallel_2",
                "GPTTitan",
                "worker_2",
                depends_on=["init"],
                outputs=["result_2"]
            ) \
            .add_phase(
                "parallel_3",
                "GeminiTitan",
                "worker_3",
                depends_on=["init"],
                outputs=["result_3"]
            ) \
            .add_phase(
                "combine",
                "ClaudeTitan",
                "combiner",
                depends_on=["parallel_1", "parallel_2", "parallel_3"],
                outputs=["combined_result"]
            ) \
            .build()

    @staticmethod
    def create_all_titans_mission() -> Dict[str, Any]:
        """Create a mission that uses all 4 Titans.

        Useful for testing Success Metric #2.
        """
        return MissionBuilder() \
            .with_workflow("all_titans_collaboration") \
            .with_objective("Demonstrate all 4 Titans collaborating") \
            .add_phase("claude_phase", "ClaudeTitan", "claude_agent", outputs=["claude_result"]) \
            .add_phase(
                "gpt_phase",
                "GPTTitan",
                "gpt_agent",
                depends_on=["claude_phase"],
                outputs=["gpt_result"]
            ) \
            .add_phase(
                "gemini_phase",
                "GeminiTitan",
                "gemini_agent",
                depends_on=["gpt_phase"],
                outputs=["gemini_result"]
            ) \
            .add_phase(
                "grok_phase",
                "GrokTitan",
                "grok_agent",
                depends_on=["gemini_phase"],
                outputs=["grok_result"]
            ) \
            .add_phase(
                "claude_synthesis",
                "ClaudeTitan",
                "synthesis_agent",
                depends_on=["grok_phase"],
                outputs=["final_result"]
            ) \
            .with_metadata("success_metric", "SM-2") \
            .build()


class GenesisTestHelpers:
    """Helper functions for Genesis Protocol testing."""

    @staticmethod
    def create_simple_tool_spec(name: str, description: str = "") -> Dict[str, Any]:
        """Create a simple tool specification for Genesis testing.

        Args:
            name: Tool name
            description: Tool description

        Returns:
            Tool specification dict
        """
        return {
            "name": name,
            "description": description or f"Test tool: {name}",
            "input_schema": {
                "type": "object",
                "properties": {
                    "value": {"type": "string", "description": "Input value"}
                },
                "required": ["value"]
            },
            "implementation": {
                "type": "python_function",
                "runtime": "python3.11",
                "code": f"""
def process(value: str) -> dict:
    \"\"\"Process the input value.\"\"\"
    return {{
        "tool": "{name}",
        "input": value,
        "output": value.upper()
    }}
"""
            }
        }

    @staticmethod
    def create_genesis_tool_request(
        tool_spec: Dict[str, Any],
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Create a Genesis Protocol tool creation request.

        Args:
            tool_spec: Tool specification
            metadata: Optional metadata

        Returns:
            Genesis request payload
        """
        request = {
            "protocol": "genesis",
            "action": "create_tool",
            "spec": tool_spec,
        }

        if metadata:
            request["metadata"] = metadata

        return request

    @staticmethod
    async def create_and_verify_tool(
        http_client: httpx.AsyncClient,
        federation_base_url: str,
        tool_name: str,
        tool_description: str = ""
    ) -> str:
        """Create a tool via Genesis and verify it's ready.

        Args:
            http_client: HTTP client to use
            federation_base_url: Federation Core base URL
            tool_name: Name for the tool
            tool_description: Description for the tool

        Returns:
            tool_id of the created tool

        Raises:
            AssertionError: If creation or verification fails
        """
        # Create tool spec
        tool_spec = GenesisTestHelpers.create_simple_tool_spec(
            tool_name,
            tool_description
        )

        # Create Genesis request
        genesis_request = GenesisTestHelpers.create_genesis_tool_request(
            tool_spec,
            metadata={"test": "genesis_helper"}
        )

        # Send request
        response = await http_client.post(
            f"{federation_base_url}/genesis/tools",
            json=genesis_request
        )

        assert response.status_code in [200, 201], \
            f"Tool creation failed: {response.text}"

        result = response.json()
        assert "tool_id" in result, "Missing tool_id in response"

        tool_id = result["tool_id"]

        # Verify tool is ready
        verify_response = await http_client.get(
            f"{federation_base_url}/genesis/tools/{tool_id}"
        )

        assert verify_response.status_code == 200, \
            f"Tool verification failed: {verify_response.text}"

        tool_info = verify_response.json()
        assert tool_info.get("status") in ["ready", "deployed"], \
            f"Tool not ready: {tool_info.get('status')}"

        return tool_id


# Convenience exports
__all__ = [
    "FederationTestHelpers",
    "MissionBuilder",
    "TestDataFactory",
    "GenesisTestHelpers",
]
