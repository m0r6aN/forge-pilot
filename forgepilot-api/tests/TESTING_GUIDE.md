# ForgePilot Federation Testing Guide

**This is the fucking way!** 🚀

This guide documents our comprehensive testing strategy for federation_core integration. Use these patterns in your own SDK development to accelerate testing and ensure quality.

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Test Organization](#test-organization)
3. [Running Tests](#running-tests)
4. [Test Patterns](#test-patterns)
5. [Success Metrics](#success-metrics)
6. [SDK Reuse Patterns](#sdk-reuse-patterns)

---

## Testing Philosophy

Our testing strategy follows the **Test Pyramid**:

```
        /\
       /E2E\         <- Few, slow, expensive (end-to-end workflows)
      /------\
     /Contract\      <- Medium coverage (API contracts)
    /----------\
   /Integration \    <- Many, fast (federation_core integration)
  /--------------\
 /     Unit      \   <- Most tests here (business logic)
/________________\
```

### Key Principles

1. **Test against live services** - Integration tests hit actual federation_core container
2. **Contract testing first** - Define and verify API contracts before implementation
3. **Success metric focused** - Tests explicitly validate OMEGA success metrics
4. **Reusable patterns** - Test utilities are designed for SDK reuse
5. **Fast feedback** - Tests are parallelizable and skip when services unavailable

---

## Test Organization

```
tests/
├── contracts/              # API contract tests
│   └── test_federation_contracts.py
├── integration/            # Live integration tests
│   ├── test_federation_integration.py
│   ├── test_genesis_protocol.py
│   └── test_e2e_workflows.py
├── unit/                   # Fast unit tests
├── utils/                  # Reusable test helpers
│   ├── __init__.py
│   └── federation_test_helpers.py
├── conftest.py            # Shared fixtures
└── TESTING_GUIDE.md       # This file
```

### Test Categories

- **`@pytest.mark.unit`** - Fast, isolated unit tests
- **`@pytest.mark.integration`** - Tests requiring federation_core
- **`@pytest.mark.contracts`** - API contract validation
- **`@pytest.mark.e2e`** - End-to-end workflow tests
- **`@pytest.mark.genesis`** - Genesis Protocol specific tests
- **`@pytest.mark.slow`** - Long-running tests (>30s)

---

## Running Tests

### Prerequisites

1. **Federation Core must be running:**
   ```bash
   docker-compose up federation_core
   ```

2. **Set environment variables:**
   ```bash
   export FEDERATION_URL=http://localhost:3000
   ```

### Run All Tests

```bash
# Run everything
pytest

# Run specific category
pytest -m integration
pytest -m contracts
pytest -m genesis
pytest -m e2e

# Run specific file
pytest tests/integration/test_federation_integration.py

# Run specific test
pytest tests/integration/test_genesis_protocol.py::TestGenesisProtocolSuccessMetric::test_success_metric_4_genesis_protocol_demo
```

### Run Tests in Parallel

```bash
# Install pytest-xdist
pip install pytest-xdist

# Run tests in parallel (4 workers)
pytest -n 4
```

### Skip Slow Tests

```bash
# Skip tests marked as slow
pytest -m "not slow"
```

### Verbose Output

```bash
# Show detailed output
pytest -v

# Show print statements
pytest -s

# Show local variables on failure
pytest -l
```

---

## Test Patterns

### Pattern 1: Live Integration Testing

**Use for:** Testing actual HTTP communication with federation_core

```python
@pytest.mark.integration
@pytest.mark.asyncio
class TestLiveFederationIntegration:
    async def test_create_conversation_real(
        self, live_federation_client, ensure_federation_running
    ):
        """Test creating a real conversation in federation_core."""
        mission = live_federation_client.build_forgepilot_mission(
            business_idea="AI fitness app",
            target_audience="Millennials",
        )

        response = await live_federation_client.create_conversation(
            mission=mission,
            correlation_id=uuid4(),
            tenant_id=uuid4(),
            actor_id="test@example.com",
        )

        assert "conversation_id" in response
        assert response["state"] in ["queued", "active", "processing"]
```

**Key Points:**
- Use `live_federation_client` fixture for real HTTP calls
- Use `ensure_federation_running` to skip if service unavailable
- Always assert on response structure

### Pattern 2: Contract Testing

**Use for:** Validating API schemas and contracts

```python
@pytest.mark.contracts
@pytest.mark.asyncio
class TestFederationAPIContracts:
    async def test_create_conversation_contract(self, federation_base_url):
        """Verify POST /conversations endpoint contract."""
        request_payload = {
            "mission": {...},
            "metadata": {...}
        }

        # Validate request schema
        validate(instance=request_payload, schema=REQUEST_SCHEMA)

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{federation_base_url}/conversations",
                json=request_payload
            )

            # Validate response schema
            validate(instance=response.json(), schema=RESPONSE_SCHEMA)
```

**Key Points:**
- Define schemas as constants
- Use `jsonschema.validate()` for schema validation
- Test both request and response contracts
- Verify HTTP status codes

### Pattern 3: Genesis Protocol Testing

**Use for:** Testing dynamic tool/agent creation

```python
@pytest.mark.genesis
@pytest.mark.asyncio
class TestGenesisProtocolActivation:
    async def test_genesis_simple_tool_creation(
        self, live_federation_client, ensure_federation_running
    ):
        """Test creating a simple tool via Genesis Protocol."""
        tool_spec = {
            "name": "brand_color_validator",
            "description": "Validates brand colors",
            "input_schema": {...},
            "implementation": {
                "type": "python_function",
                "code": "..."
            }
        }

        genesis_request = {
            "protocol": "genesis",
            "action": "create_tool",
            "spec": tool_spec,
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{base_url}/genesis/tools",
                json=genesis_request
            )

            assert response.status_code in [200, 201]
            tool_id = response.json()["tool_id"]

            # Verify tool is ready
            verify_response = await client.get(
                f"{base_url}/genesis/tools/{tool_id}"
            )
            assert verify_response.json()["status"] == "ready"
```

**Key Points:**
- Test tool creation, verification, and invocation
- Test agent spawning
- Verify Genesis integration with workflows
- Test security boundaries

### Pattern 4: End-to-End Workflow Testing

**Use for:** Testing complete multi-phase workflows

```python
@pytest.mark.e2e
@pytest.mark.slow
@pytest.mark.asyncio
class TestCompleteCampaignWorkflows:
    async def test_full_brand_campaign_workflow(
        self, live_federation_client, ensure_federation_running
    ):
        """Test complete brand campaign from start to finish."""
        mission = live_federation_client.build_forgepilot_mission(...)

        # Create conversation
        create_response = await live_federation_client.create_conversation(...)
        conversation_id = create_response["conversation_id"]

        # Poll until complete
        final_status = await poll_until_complete(
            live_federation_client,
            conversation_id,
            max_wait=180
        )

        # Verify artifacts
        artifacts = await live_federation_client.get_artifacts(conversation_id)
        assert "brand_name" in artifacts
        assert "color_palette" in artifacts
```

**Key Points:**
- Use polling helpers for async workflows
- Set realistic timeouts
- Verify complete artifact generation
- Test error recovery

### Pattern 5: Using Test Helpers

**Use for:** Reducing boilerplate and reusing patterns

```python
from tests.utils import (
    FederationTestHelpers,
    MissionBuilder,
    TestDataFactory,
)

async def test_with_helpers():
    # Use builder pattern
    mission = MissionBuilder() \
        .with_workflow("test_workflow") \
        .add_phase("phase_1", "ClaudeTitan", "agent_1") \
        .add_phase("phase_2", "GPTTitan", "agent_2", depends_on=["phase_1"]) \
        .build()

    # Use factory for common test data
    simple_mission = TestDataFactory.create_simple_mission()

    # Use polling helper
    status = await FederationTestHelpers.poll_until_complete(
        get_status_func=lambda: client.get_conversation(conv_id),
        max_wait=60
    )

    # Use assertion helpers
    FederationTestHelpers.assert_valid_mission(mission)
    FederationTestHelpers.assert_artifacts_present(
        artifacts,
        required_artifacts=["brand_name", "color_palette"]
    )
```

**Key Points:**
- Import helpers from `tests.utils`
- Use `MissionBuilder` for fluent mission creation
- Use `TestDataFactory` for common test missions
- Use assertion helpers for validation

---

## Success Metrics

Our tests explicitly validate OMEGA success metrics:

### Success Metric #2: Multi-Titan Collaboration

**Test:** `tests/integration/test_e2e_workflows.py::test_multi_titan_collaboration_workflow`

Validates:
- All 4 Titans (Claude, GPT, Gemini, Grok) participate
- At least 2 rounds of dialogue occur
- Artifacts are generated from collaboration

```python
@pytest.mark.e2e
async def test_multi_titan_collaboration_workflow(...):
    """SUCCESS METRIC #2: Multi-Titan Collaboration"""
    # Create mission with all 4 Titans
    mission = {...}  # ClaudeTitan -> GPTTitan -> GeminiTitan -> GrokTitan -> ClaudeTitan

    # Track Titan participation
    titans_active = set()
    rounds_by_titan = {}

    # Monitor execution...

    # Verify all 4 Titans participated
    assert titans_active == {"ClaudeTitan", "GPTTitan", "GeminiTitan", "GrokTitan"}

    # Verify multiple rounds
    assert sum(rounds_by_titan.values()) >= 2
```

### Success Metric #4: Genesis Protocol Demonstration

**Test:** `tests/integration/test_genesis_protocol.py::test_success_metric_4_genesis_protocol_demo`

Validates:
- Tool can be defined for a valid use case
- Tool deploys successfully via Genesis
- Tool is registered and operational
- Tool can be used in workflows
- Tool produces expected results

```python
@pytest.mark.genesis
async def test_success_metric_4_genesis_protocol_demo(...):
    """SUCCESS METRIC #4: Genesis Protocol Demonstration"""
    # Step 1: Define tool for use case
    tool_spec = {...}

    # Step 2: Deploy via Genesis
    tool_id = await deploy_genesis_tool(tool_spec)

    # Step 3: Verify registration
    tool_info = await verify_tool(tool_id)
    assert tool_info["status"] == "ready"

    # Step 4: Use the tool
    results = await invoke_tool(tool_id, test_data)

    # Step 5: Verify results
    assert results["output"] is not None
```

---

## SDK Reuse Patterns

These patterns are designed for reuse in your own SDK development:

### Pattern: Async Polling with Progress

```python
from tests.utils import FederationTestHelpers

async def wait_for_job_completion(job_id: str):
    """Poll until job completes."""
    status = await FederationTestHelpers.poll_until_complete(
        get_status_func=lambda: get_job_status(job_id),
        max_wait=120,
        poll_interval=3.0,
        on_progress=lambda s: print(f"Progress: {s['progress']}%")
    )
    return status
```

### Pattern: Fluent Test Data Builders

```python
from tests.utils import MissionBuilder

# Easy to read, easy to maintain
mission = MissionBuilder() \
    .with_workflow("my_workflow") \
    .with_objective("My objective") \
    .add_phase("step_1", "ClaudeTitan", "agent_1", outputs=["result"]) \
    .add_phase(
        "step_2",
        "GPTTitan",
        "agent_2",
        depends_on=["step_1"],
        inputs={"data": "{{step_1.result}}"}
    ) \
    .with_metadata("test_id", "abc-123") \
    .build()
```

### Pattern: Reusable Assertion Helpers

```python
from tests.utils import FederationTestHelpers

# Validates mission structure
FederationTestHelpers.assert_valid_mission(mission)

# Validates API responses
FederationTestHelpers.assert_valid_conversation_response(response)

# Validates artifacts
FederationTestHelpers.assert_artifacts_present(
    artifacts,
    required_artifacts=["output_1", "output_2"]
)
```

### Pattern: Genesis Test Helpers

```python
from tests.utils import GenesisTestHelpers

async def test_custom_tool():
    # Easy tool creation
    tool_spec = GenesisTestHelpers.create_simple_tool_spec(
        "my_validator",
        "Validates things"
    )

    # One-line tool creation and verification
    tool_id = await GenesisTestHelpers.create_and_verify_tool(
        http_client,
        base_url,
        "my_tool"
    )
```

### Pattern: Test Data Factories

```python
from tests.utils import TestDataFactory

# Common test scenarios
simple_mission = TestDataFactory.create_simple_mission()
multi_phase = TestDataFactory.create_multi_phase_mission()
parallel_exec = TestDataFactory.create_parallel_execution_mission()
all_titans = TestDataFactory.create_all_titans_mission()
```

---

## Best Practices

### 1. Test Independence

Each test should be completely independent:

```python
# ✅ Good - Independent
async def test_feature():
    # Create fresh test data
    mission = create_test_mission()
    response = await client.create_conversation(mission, ...)
    # Test and cleanup

# ❌ Bad - Depends on global state
conversation_id = None

async def test_create():
    global conversation_id
    conversation_id = create_conversation()

async def test_get():
    status = get_conversation(conversation_id)  # Fragile!
```

### 2. Meaningful Test Names

```python
# ✅ Good - Clear what's being tested
async def test_conversation_creation_with_valid_mission_returns_conversation_id()

# ❌ Bad - Unclear
async def test_1()
async def test_create()
```

### 3. Arrange-Act-Assert Pattern

```python
async def test_workflow_completion():
    # Arrange - Set up test data
    mission = create_test_mission()
    client = create_test_client()

    # Act - Perform the action
    response = await client.create_conversation(mission, ...)
    conversation_id = response["conversation_id"]

    # Assert - Verify the results
    status = await client.get_conversation(conversation_id)
    assert status["state"] == "completed"
```

### 4. Use Fixtures for Common Setup

```python
@pytest.fixture
async def test_conversation(live_federation_client):
    """Create a test conversation."""
    mission = create_simple_mission()
    response = await live_federation_client.create_conversation(mission, ...)
    return response["conversation_id"]

async def test_get_status(live_federation_client, test_conversation):
    status = await live_federation_client.get_conversation(test_conversation)
    assert "state" in status
```

### 5. Skip When Services Unavailable

```python
@pytest.fixture
async def ensure_federation_running(federation_base_url):
    """Skip test if federation_core is not running."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{federation_base_url}/health")
            if response.status_code != 200:
                pytest.skip("Federation Core not healthy")
    except Exception as e:
        pytest.skip(f"Federation Core not accessible: {e}")
```

---

## Troubleshooting

### Tests Skipping

**Problem:** Tests are being skipped with "Federation Core not accessible"

**Solution:**
1. Ensure federation_core container is running: `docker-compose ps`
2. Check federation_core health: `curl http://localhost:3000/health`
3. Verify `FEDERATION_URL` environment variable
4. Check container logs: `docker-compose logs federation_core`

### Tests Timing Out

**Problem:** Tests timeout waiting for workflows to complete

**Solution:**
1. Increase timeout: `max_wait=300` (5 minutes)
2. Check federation_core logs for errors
3. Verify Titans are configured correctly
4. Run test in isolation to see detailed output: `pytest -s test_file.py::test_name`

### Contract Test Failures

**Problem:** Schema validation failures

**Solution:**
1. Update schema definitions in `test_federation_contracts.py`
2. Check actual API response: `pytest -s -vv`
3. Verify federation_core API version
4. Update contracts to match federation_core changes

### Genesis Tests Failing

**Problem:** Genesis tool creation fails

**Solution:**
1. Check tool specification is valid
2. Verify Genesis Protocol is enabled: `/health` should show `genesis_protocol: true`
3. Check for security violations in tool code
4. Verify Python runtime is available in federation_core

---

## Contributing

When adding new tests:

1. **Choose the right category**: Unit, integration, contract, or e2e
2. **Use appropriate markers**: `@pytest.mark.integration`, `@pytest.mark.slow`, etc.
3. **Follow naming conventions**: `test_<feature>_<scenario>_<expected_result>`
4. **Add docstrings**: Explain what the test validates
5. **Use helpers**: Leverage `tests.utils` for common patterns
6. **Update this guide**: Document new patterns or best practices

---

## Resources

- [pytest documentation](https://docs.pytest.org/)
- [httpx async client](https://www.python-httpx.org/async/)
- [JSON Schema validation](https://python-jsonschema.readthedocs.io/)
- [OMEGA Doctrine](../../docs/OMEGA_DOCTRINE.md)
- [Federation Core API](http://localhost:3000/docs)

---

**This testing infrastructure accelerates SDK development by providing:**
- ✅ Proven patterns for async HTTP testing
- ✅ Reusable helpers and utilities
- ✅ Contract validation framework
- ✅ Success metric validation
- ✅ Genesis Protocol testing patterns
- ✅ Multi-Titan collaboration testing

**Use these patterns in your own projects to build faster and ship with confidence!**

🚀 **This is the fucking way!**
