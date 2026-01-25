"""Shared test helpers and utilities for federation testing.

These utilities can be reused across different test files and also serve as
patterns for SDK development.
"""

import asyncio
import httpx
from typing import Dict, Any, Optional, List, Callable, Awaitable
from uuid import UUID, uuid4
from datetime import datetime
from enum import Enum


class WorkflowState(str, Enum):
    """Workflow states."""
    QUEUED = "queued"
    ACTIVE = "active"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    TIMEOUT = "timeout"


class ConversationPoller:
    """Poll conversation status with backoff and timeout handling.

    Example:
        poller = ConversationPoller(client, conversation_id)
        result = await poller.poll_until_complete(timeout=60)
    """

    def __init__(
        self,
        client: Any,
        conversation_id: str,
        poll_interval: float = 2.0,
        max_backoff: float = 10.0
    ):
        self.client = client
        self.conversation_id = conversation_id
        self.poll_interval = poll_interval
        self.max_backoff = max_backoff
        self.current_backoff = poll_interval

    async def poll_until_complete(
        self,
        timeout: float = 120.0,
        on_progress: Optional[Callable[[Dict[str, Any]], Awaitable[None]]] = None
    ) -> Dict[str, Any]:
        """Poll until workflow completes or times out.

        Args:
            timeout: Maximum time to wait in seconds
            on_progress: Optional async callback for progress updates

        Returns:
            Final conversation status

        Raises:
            TimeoutError: If workflow doesn't complete in time
            RuntimeError: If workflow fails
        """
        start_time = datetime.now()
        iterations = 0

        while True:
            elapsed = (datetime.now() - start_time).total_seconds()
            if elapsed > timeout:
                raise TimeoutError(
                    f"Conversation {self.conversation_id} did not complete in {timeout}s"
                )

            # Get current status
            status = await self.client.get_conversation(self.conversation_id)
            state = status.get("state")

            # Call progress callback if provided
            if on_progress:
                await on_progress(status)

            # Check terminal states
            if state == WorkflowState.COMPLETED:
                return status

            if state == WorkflowState.FAILED:
                error = status.get("error", "Unknown error")
                raise RuntimeError(f"Workflow failed: {error}")

            if state == WorkflowState.TIMEOUT:
                raise TimeoutError(f"Workflow timed out: {status.get('error')}")

            # Adaptive backoff
            if iterations > 5:
                self.current_backoff = min(
                    self.current_backoff * 1.5,
                    self.max_backoff
                )

            await asyncio.sleep(self.current_backoff)
            iterations += 1

    async def poll_until_phase(
        self,
        phase_name: str,
        timeout: float = 60.0
    ) -> Dict[str, Any]:
        """Poll until a specific phase is reached.

        Args:
            phase_name: Name of phase to wait for
            timeout: Maximum time to wait

        Returns:
            Status when phase is reached
        """
        start_time = datetime.now()

        while (datetime.now() - start_time).total_seconds() < timeout:
            status = await self.client.get_conversation(self.conversation_id)

            current_phase = status.get("current_phase")
            if current_phase == phase_name:
                return status

            phase_results = status.get("phase_results", {})
            if phase_name in phase_results:
                return status

            await asyncio.sleep(self.poll_interval)

        raise TimeoutError(f"Phase {phase_name} not reached in {timeout}s")


class PhaseTracker:
    """Track phase progression through workflow execution.

    Example:
        tracker = PhaseTracker()
        await tracker.track(poller, expected_phases=["phase1", "phase2"])
    """

    def __init__(self):
        self.phases_seen: List[str] = []
        self.phase_timings: Dict[str, float] = {}
        self.start_time: Optional[datetime] = None

    async def track(
        self,
        poller: ConversationPoller,
        expected_phases: Optional[List[str]] = None,
        timeout: float = 120.0
    ) -> Dict[str, Any]:
        """Track phases as workflow executes.

        Args:
            poller: ConversationPoller instance
            expected_phases: List of expected phase names
            timeout: Maximum time to wait

        Returns:
            Final status with phase tracking data
        """
        self.start_time = datetime.now()

        async def on_progress(status: Dict[str, Any]):
            current_phase = status.get("current_phase")

            if current_phase and current_phase not in self.phases_seen:
                self.phases_seen.append(current_phase)
                elapsed = (datetime.now() - self.start_time).total_seconds()
                self.phase_timings[current_phase] = elapsed
                print(f"  Phase: {current_phase} @ {elapsed:.1f}s")

        result = await poller.poll_until_complete(
            timeout=timeout,
            on_progress=on_progress
        )

        # Verify expected phases if provided
        if expected_phases:
            missing = set(expected_phases) - set(self.phases_seen)
            if missing:
                print(f"Warning: Expected phases not seen: {missing}")

        return result

    def get_summary(self) -> Dict[str, Any]:
        """Get summary of phase execution."""
        return {
            "phases_seen": self.phases_seen,
            "phase_count": len(self.phases_seen),
            "phase_timings": self.phase_timings,
            "total_duration": max(self.phase_timings.values()) if self.phase_timings else 0
        }


class ArtifactValidator:
    """Validate workflow artifacts against expected schemas.

    Example:
        validator = ArtifactValidator()
        validator.add_rule("brand_name", lambda x: len(x) > 0)
        is_valid, errors = await validator.validate(artifacts)
    """

    def __init__(self):
        self.rules: Dict[str, List[Callable[[Any], bool]]] = {}
        self.descriptions: Dict[str, str] = {}

    def add_rule(
        self,
        artifact_key: str,
        validator_fn: Callable[[Any], bool],
        description: str = ""
    ):
        """Add validation rule for artifact field."""
        if artifact_key not in self.rules:
            self.rules[artifact_key] = []
        self.rules[artifact_key].append(validator_fn)
        if description:
            self.descriptions[artifact_key] = description

    async def validate(
        self,
        artifacts: Dict[str, Any]
    ) -> tuple[bool, List[str]]:
        """Validate artifacts against all rules.

        Returns:
            (is_valid, list_of_errors)
        """
        errors = []

        for key, validators in self.rules.items():
            if key not in artifacts:
                errors.append(f"Missing required artifact: {key}")
                continue

            value = artifacts[key]
            for validator in validators:
                try:
                    if not validator(value):
                        desc = self.descriptions.get(key, key)
                        errors.append(f"Validation failed for {desc}")
                except Exception as e:
                    errors.append(f"Validation error for {key}: {str(e)}")

        return len(errors) == 0, errors


class TitanParticipationTracker:
    """Track which Titans participate in a workflow.

    Example:
        tracker = TitanParticipationTracker()
        result = await tracker.track(poller)
        assert tracker.all_titans_participated()
    """

    ALL_TITANS = {"ClaudeTitan", "GPTTitan", "GeminiTitan", "GrokTitan"}

    def __init__(self):
        self.titans_seen: set[str] = set()
        self.titan_phases: Dict[str, List[str]] = {}
        self.round_count: int = 0

    async def track(
        self,
        poller: ConversationPoller,
        timeout: float = 180.0
    ) -> Dict[str, Any]:
        """Track Titan participation during workflow.

        Args:
            poller: ConversationPoller instance
            timeout: Maximum time to wait

        Returns:
            Final status with Titan tracking data
        """
        seen_phases = set()

        async def on_progress(status: Dict[str, Any]):
            phase_results = status.get("phase_results", {})

            for phase_name, phase_data in phase_results.items():
                if phase_name in seen_phases:
                    continue

                seen_phases.add(phase_name)

                # Extract Titan name
                titan = phase_data.get("titan")
                if titan:
                    if titan not in self.titans_seen:
                        print(f"  Titan joined: {titan}")
                        self.titans_seen.add(titan)

                    if titan not in self.titan_phases:
                        self.titan_phases[titan] = []
                    self.titan_phases[titan].append(phase_name)

                    # Track rounds (multiple phases from same Titan)
                    if len(self.titan_phases[titan]) > self.round_count:
                        self.round_count = len(self.titan_phases[titan])

        result = await poller.poll_until_complete(
            timeout=timeout,
            on_progress=on_progress
        )

        return result

    def all_titans_participated(self) -> bool:
        """Check if all 4 Titans participated."""
        return len(self.titans_seen & self.ALL_TITANS) == 4

    def rounds_completed(self) -> int:
        """Get number of rounds (multiple phases by same Titan)."""
        return self.round_count

    def get_summary(self) -> Dict[str, Any]:
        """Get summary of Titan participation."""
        return {
            "titans_participated": list(self.titans_seen),
            "titan_count": len(self.titans_seen & self.ALL_TITANS),
            "all_titans": self.all_titans_participated(),
            "titan_phases": self.titan_phases,
            "rounds": self.round_count,
        }


class GenesisTestHelper:
    """Helper for Genesis Protocol testing.

    Example:
        helper = GenesisTestHelper(federation_base_url)
        tool_id = await helper.create_tool(spec)
        result = await helper.invoke_tool(tool_id, inputs)
    """

    def __init__(self, base_url: str):
        self.base_url = base_url

    async def create_tool(
        self,
        tool_spec: Dict[str, Any],
        timeout: float = 30.0
    ) -> str:
        """Create a tool via Genesis Protocol.

        Returns:
            tool_id
        """
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                f"{self.base_url}/genesis/tools",
                json={
                    "protocol": "genesis",
                    "action": "create_tool",
                    "spec": tool_spec,
                    "metadata": {
                        "test": True,
                        "correlation_id": str(uuid4())
                    }
                }
            )

            response.raise_for_status()
            result = response.json()
            return result["tool_id"]

    async def invoke_tool(
        self,
        tool_id: str,
        inputs: Dict[str, Any],
        timeout: float = 10.0
    ) -> Dict[str, Any]:
        """Invoke a Genesis-created tool.

        Returns:
            Tool execution result
        """
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                f"{self.base_url}/genesis/tools/{tool_id}/invoke",
                json=inputs
            )

            response.raise_for_status()
            return response.json()

    async def get_tool_status(
        self,
        tool_id: str,
        timeout: float = 5.0
    ) -> Dict[str, Any]:
        """Get tool registration status."""
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(
                f"{self.base_url}/genesis/tools/{tool_id}"
            )

            response.raise_for_status()
            return response.json()

    async def spawn_agent(
        self,
        agent_spec: Dict[str, Any],
        timeout: float = 30.0
    ) -> str:
        """Spawn an agent via Genesis Protocol.

        Returns:
            agent_id
        """
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                f"{self.base_url}/genesis/agents",
                json={
                    "protocol": "genesis",
                    "action": "spawn_agent",
                    "spec": agent_spec,
                    "metadata": {
                        "test": True,
                        "correlation_id": str(uuid4())
                    }
                }
            )

            response.raise_for_status()
            result = response.json()
            return result["agent_id"]


def create_test_mission(
    workflow_type: str = "test_workflow",
    phases: Optional[List[Dict[str, Any]]] = None,
    **kwargs
) -> Dict[str, Any]:
    """Create a test mission with sensible defaults.

    Args:
        workflow_type: Type of workflow
        phases: List of phase definitions
        **kwargs: Additional mission fields

    Returns:
        Complete mission dictionary
    """
    mission = {
        "type": "conversational_pantheon",
        "workflow": workflow_type,
        "objective": f"Test objective for {workflow_type}",
        "metadata": {
            "test": True,
            "correlation_id": str(uuid4()),
        }
    }

    if phases:
        mission["phases"] = phases

    mission.update(kwargs)
    return mission


def create_simple_phase(
    name: str,
    titan: str = "ClaudeTitan",
    depends_on: Optional[List[str]] = None,
    **kwargs
) -> Dict[str, Any]:
    """Create a simple phase definition.

    Args:
        name: Phase name
        titan: Titan to use
        depends_on: List of phase dependencies
        **kwargs: Additional phase fields

    Returns:
        Phase dictionary
    """
    phase = {
        "name": name,
        "description": f"Phase {name}",
        "titan": titan,
    }

    if depends_on:
        phase["depends_on"] = depends_on

    phase.update(kwargs)
    return phase


async def wait_for_federation_ready(
    base_url: str,
    timeout: float = 30.0,
    interval: float = 1.0
) -> bool:
    """Wait for federation_core to be ready.

    Args:
        base_url: Federation Core base URL
        timeout: Maximum wait time
        interval: Poll interval

    Returns:
        True if ready, False if timeout
    """
    start_time = datetime.now()

    while (datetime.now() - start_time).total_seconds() < timeout:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{base_url}/health")
                if response.status_code == 200:
                    data = response.json()
                    if data.get("status") == "healthy":
                        return True
        except Exception:
            pass

        await asyncio.sleep(interval)

    return False


def assert_valid_uuid(value: str, field_name: str = "value"):
    """Assert that value is a valid UUID string."""
    try:
        UUID(value)
    except (ValueError, TypeError):
        raise AssertionError(f"{field_name} is not a valid UUID: {value}")


def assert_timestamp_format(value: str, field_name: str = "timestamp"):
    """Assert that value is a valid ISO timestamp."""
    try:
        datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (ValueError, TypeError):
        raise AssertionError(f"{field_name} is not a valid timestamp: {value}")
