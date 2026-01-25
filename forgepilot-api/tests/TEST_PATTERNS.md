# Testing Patterns for Federation Integration

This document describes the testing patterns used in forgepilot-api for federation_core integration. These patterns are designed to be reusable in SDK development and other backend services.

## Table of Contents

- [Test Structure](#test-structure)
- [Testing Layers](#testing-layers)
- [Reusable Patterns](#reusable-patterns)
- [Best Practices](#best-practices)
- [SDK Development Guide](#sdk-development-guide)

---

## Test Structure

### Directory Organization

```
tests/
├── helpers/                     # Shared utilities (SDK-ready)
│   ├── __init__.py
│   └── federation_helpers.py   # Core testing utilities
├── integration/                 # Integration tests
│   ├── test_federation_integration.py
│   ├── test_genesis_protocol.py
│   └── test_end_to_end_workflows.py
├── contracts/                   # Contract tests
│   └── test_federation_contracts.py
├── unit/                        # Unit tests
│   └── ...
└── conftest.py                  # Pytest configuration
```

### Test Categories

- **Integration Tests** (`@pytest.mark.integration`): Test against live federation_core
- **Genesis Tests** (`@pytest.mark.genesis`): Test Genesis Protocol activation
- **E2E Tests** (`@pytest.mark.e2e`): Test complete user workflows
- **Contract Tests** (`@pytest.mark.contracts`): Test API contracts and schemas

---

## Testing Layers

### Layer 1: Contract Testing

**Purpose**: Verify API contracts between services

**Pattern**:
```python
from jsonschema import validate

# Define contract schema
RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "conversation_id": {"type": "string"},
        "state": {"type": "string"},
    },
    "required": ["conversation_id", "state"]
}

# Validate response
async def test_endpoint_contract():
    response = await client.post("/endpoint", json=payload)
    assert response.status_code == 200
    validate(instance=response.json(), schema=RESPONSE_SCHEMA)
```

**When to use**: Always define contracts first before implementation

**SDK Application**: Use for client library validation

---

### Layer 2: Integration Testing

**Purpose**: Test real communication with live services

**Pattern**:
```python
@pytest.mark.integration
@pytest.mark.asyncio
class TestLiveIntegration:
    async def test_real_service_call(self, live_client):
        # Test against actual running service
        response = await live_client.create_conversation(mission)
        assert response["conversation_id"] is not None
```

**When to use**: After contracts are defined, test real implementation

**SDK Application**: Integration tests for SDK against live backend

---

### Layer 3: End-to-End Testing

**Purpose**: Validate complete user workflows

**Pattern**:
```python
@pytest.mark.e2e
async def test_full_workflow():
    # Step 1: Create
    result = await create_campaign(data)

    # Step 2: Monitor progress
    poller = ConversationPoller(client, result["id"])
    final_status = await poller.poll_until_complete(timeout=120)

    # Step 3: Validate artifacts
    artifacts = await client.get_artifacts(result["id"])
    validator = ArtifactValidator()
    validator.add_rule("brand_name", lambda x: len(x) > 0)
    is_valid, errors = await validator.validate(artifacts)
    assert is_valid
```

**When to use**: Test complete features from user perspective

**SDK Application**: Example usage in SDK documentation

---

## Reusable Patterns

### Pattern 1: Polling with Backoff

**Problem**: Need to wait for async operations to complete

**Solution**: Use `ConversationPoller`

```python
from tests.helpers import ConversationPoller

poller = ConversationPoller(client, conversation_id)

# Simple polling
result = await poller.poll_until_complete(timeout=60)

# With progress tracking
async def on_progress(status):
    print(f"Progress: {status.get('completion_percentage')}%")

result = await poller.poll_until_complete(
    timeout=120,
    on_progress=on_progress
)

# Wait for specific phase
result = await poller.poll_until_phase("brand_strategy", timeout=30)
```

**SDK Application**: Include in SDK as `WorkflowPoller` utility

---

### Pattern 2: Phase Tracking

**Problem**: Need to verify workflow phases execute in order

**Solution**: Use `PhaseTracker`

```python
from tests.helpers import PhaseTracker

tracker = PhaseTracker()
result = await tracker.track(
    poller,
    expected_phases=["phase1", "phase2", "phase3"]
)

# Get summary
summary = tracker.get_summary()
print(f"Phases seen: {summary['phases_seen']}")
print(f"Timings: {summary['phase_timings']}")
```

**SDK Application**: Add to SDK for workflow monitoring

---

### Pattern 3: Artifact Validation

**Problem**: Need to validate complex artifact structures

**Solution**: Use `ArtifactValidator`

```python
from tests.helpers import ArtifactValidator

validator = ArtifactValidator()

# Define validation rules
validator.add_rule(
    "brand_name",
    lambda x: len(x) > 0 and len(x) < 50,
    description="Brand name length"
)

validator.add_rule(
    "color_palette",
    lambda x: isinstance(x, dict) and "primary" in x,
    description="Valid color palette"
)

# Validate
is_valid, errors = await validator.validate(artifacts)
if not is_valid:
    print(f"Validation errors: {errors}")
```

**SDK Application**: Include for client-side validation

---

### Pattern 4: Titan Participation Tracking

**Problem**: Need to verify multi-Titan collaboration (Success Metric #2)

**Solution**: Use `TitanParticipationTracker`

```python
from tests.helpers import TitanParticipationTracker

tracker = TitanParticipationTracker()
result = await tracker.track(poller)

# Verify all Titans participated
assert tracker.all_titans_participated()
assert tracker.rounds_completed() >= 2

# Get details
summary = tracker.get_summary()
print(f"Titans: {summary['titans_participated']}")
print(f"Rounds: {summary['rounds']}")
```

**SDK Application**: Use for monitoring collaborative workflows

---

### Pattern 5: Genesis Protocol Testing

**Problem**: Need to test dynamic tool/agent creation

**Solution**: Use `GenesisTestHelper`

```python
from tests.helpers import GenesisTestHelper

helper = GenesisTestHelper(federation_base_url)

# Create a tool
tool_spec = {
    "name": "custom_validator",
    "description": "Custom validation tool",
    "input_schema": {...},
    "implementation": {...}
}

tool_id = await helper.create_tool(tool_spec)

# Use the tool
result = await helper.invoke_tool(tool_id, {"input": "data"})

# Check status
status = await helper.get_tool_status(tool_id)
assert status["status"] == "ready"
```

**SDK Application**: Include for Genesis Protocol SDK features

---

## Best Practices

### 1. Always Use Fixtures

```python
@pytest.fixture
def federation_base_url() -> str:
    return os.getenv("FEDERATION_URL", "http://localhost:3000")

@pytest.fixture
async def ensure_federation_running(federation_base_url):
    is_healthy = await check_health(federation_base_url)
    if not is_healthy:
        pytest.skip("Federation Core not available")
```

### 2. Handle Timeouts Gracefully

```python
# Bad
await asyncio.sleep(30)  # Hardcoded wait

# Good
async def wait_for_condition(check_fn, timeout=30):
    start = datetime.now()
    while (datetime.now() - start).total_seconds() < timeout:
        if await check_fn():
            return True
        await asyncio.sleep(1)
    return False
```

### 3. Make Tests Idempotent

```python
# Each test should be independent
async def test_workflow():
    # Create unique identifiers
    correlation_id = uuid4()
    tenant_id = uuid4()

    # Use unique names
    workflow_name = f"test_workflow_{uuid4().hex[:8]}"
```

### 4. Use Meaningful Assertions

```python
# Bad
assert len(results) > 0

# Good
assert len(results) > 0, \
    f"Expected artifacts but got none. Status: {status}"
```

### 5. Test Error Cases

```python
async def test_error_handling():
    # Test with invalid data
    with pytest.raises(httpx.HTTPStatusError) as exc_info:
        await client.create_conversation(invalid_mission)

    assert exc_info.value.response.status_code == 400
```

### 6. Use Context Managers

```python
async with httpx.AsyncClient(timeout=30.0) as client:
    response = await client.post(url, json=data)
    # Client automatically closed
```

---

## SDK Development Guide

### Translating Test Patterns to SDK

#### 1. **Poller → SDK Utility**

**Test Code**:
```python
poller = ConversationPoller(client, conversation_id)
result = await poller.poll_until_complete()
```

**SDK Code**:
```python
class ForgePilotClient:
    async def wait_for_completion(
        self,
        conversation_id: str,
        timeout: float = 120.0
    ) -> ConversationResult:
        """Wait for conversation to complete."""
        poller = ConversationPoller(self, conversation_id)
        return await poller.poll_until_complete(timeout)
```

#### 2. **Validators → SDK Validation**

**Test Code**:
```python
validator = ArtifactValidator()
validator.add_rule("brand_name", lambda x: len(x) > 0)
```

**SDK Code**:
```python
class CampaignResult:
    def validate(self) -> ValidationResult:
        """Validate campaign artifacts."""
        validator = ArtifactValidator()
        # Built-in validation rules
        validator.add_rule("brand_name", self._validate_brand_name)
        return validator.validate(self.artifacts)
```

#### 3. **Helpers → SDK Client Methods**

**Test Code**:
```python
helper = GenesisTestHelper(base_url)
tool_id = await helper.create_tool(spec)
```

**SDK Code**:
```python
class ForgePilotClient:
    async def create_genesis_tool(
        self,
        spec: ToolSpec
    ) -> GenesisToolResult:
        """Create a tool via Genesis Protocol."""
        helper = GenesisTestHelper(self.base_url)
        tool_id = await helper.create_tool(spec.to_dict())
        return GenesisToolResult(tool_id, self)
```

---

### Example: SDK Client Implementation

```python
from typing import Optional, Callable, Awaitable
from tests.helpers import ConversationPoller, PhaseTracker

class ForgePilotSDK:
    """SDK client for ForgePilot API."""

    def __init__(self, api_key: str, base_url: str = "https://api.forgepilot.ai"):
        self.api_key = api_key
        self.base_url = base_url
        self._client = httpx.AsyncClient()

    async def create_brand_campaign(
        self,
        business_idea: str,
        target_audience: str,
        brand_values: List[str],
        monitor_progress: bool = True,
        on_progress: Optional[Callable] = None
    ) -> CampaignResult:
        """Create and monitor a brand campaign.

        Args:
            business_idea: Description of the business
            target_audience: Target customer description
            brand_values: List of brand values
            monitor_progress: Whether to wait for completion
            on_progress: Optional progress callback

        Returns:
            CampaignResult with all artifacts

        Example:
            >>> sdk = ForgePilotSDK(api_key="...")
            >>> result = await sdk.create_brand_campaign(
            ...     business_idea="AI fitness app",
            ...     target_audience="Health-conscious millennials",
            ...     brand_values=["innovation", "wellness"]
            ... )
            >>> print(result.brand_name)
        """
        # Create mission
        mission = self._build_mission(business_idea, target_audience, brand_values)

        # Submit to API
        response = await self._create_conversation(mission)
        conversation_id = response["conversation_id"]

        if not monitor_progress:
            return CampaignResult(conversation_id, self, status="queued")

        # Monitor using test-proven polling pattern
        poller = ConversationPoller(self, conversation_id)
        final_status = await poller.poll_until_complete(
            timeout=300,
            on_progress=on_progress
        )

        # Fetch artifacts
        artifacts = await self.get_artifacts(conversation_id)

        return CampaignResult(
            conversation_id=conversation_id,
            status="completed",
            artifacts=artifacts,
            client=self
        )

    async def track_phases(
        self,
        conversation_id: str,
        expected_phases: Optional[List[str]] = None
    ) -> PhaseTrackingResult:
        """Track phase progression for a conversation.

        Uses the battle-tested PhaseTracker from our test suite.
        """
        tracker = PhaseTracker()
        poller = ConversationPoller(self, conversation_id)

        result = await tracker.track(poller, expected_phases)

        return PhaseTrackingResult(
            phases=tracker.phases_seen,
            timings=tracker.phase_timings,
            summary=tracker.get_summary()
        )
```

---

### Running Tests

```bash
# Run all tests
pytest

# Run only integration tests
pytest -m integration

# Run only Genesis Protocol tests
pytest -m genesis

# Run E2E tests with verbose output
pytest -m e2e -v

# Run specific test file
pytest tests/integration/test_federation_integration.py

# Run with coverage
pytest --cov=app --cov-report=html

# Run and show print statements
pytest -s

# Run in parallel (requires pytest-xdist)
pytest -n auto
```

---

### Environment Setup

```bash
# Required environment variables
export FEDERATION_URL="http://localhost:3000"
export FORGEPILOT_API_KEY="test-key"

# Optional
export FEDERATION_TIMEOUT="30"
export LOG_LEVEL="DEBUG"
```

---

## Summary

These testing patterns provide:

1. **Reliability**: Battle-tested utilities for async operations
2. **Reusability**: Helpers designed for SDK integration
3. **Maintainability**: Clear separation of concerns
4. **Documentation**: Patterns serve as SDK examples
5. **Speed**: Efficient polling and tracking mechanisms

Use these patterns to:
- Build robust integration tests
- Create production-ready SDKs
- Document best practices
- Accelerate development

**This is the fucking way!** 🚀
