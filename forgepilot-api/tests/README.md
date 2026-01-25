# ForgePilot API Test Suite

Comprehensive test coverage for federation_core backend integration, including real workflow execution, Genesis Protocol activation, and multi-Titan collaboration.

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Run all tests
pytest

# Run specific test categories
pytest -m integration    # Integration tests
pytest -m genesis        # Genesis Protocol tests
pytest -m e2e            # End-to-end workflows
pytest -m contracts      # API contract tests
```

## Test Categories

### Integration Tests
**Location**: `tests/integration/test_federation_integration.py`

Real integration tests against live federation_core container:
- Health checks
- Conversation creation and management
- Workflow progression monitoring
- Artifact retrieval
- Error handling
- Timeout handling

### Genesis Protocol Tests
**Location**: `tests/integration/test_genesis_protocol.py`

Tests for dynamic tool/agent creation (Success Metric #4):
- Simple tool creation
- Agent spawning
- Workflow integration
- Security boundaries
- Resource limits
- **Success Metric #4 validation**

### End-to-End Workflow Tests
**Location**: `tests/integration/test_end_to_end_workflows.py`

Complete user journey testing:
- Full brand campaign workflow
- Multi-Titan collaboration (Success Metric #2)
- Error recovery
- Performance testing
- Concurrent workflow handling

### Contract Tests
**Location**: `tests/contracts/test_federation_contracts.py`

API contract validation:
- Request/response schema validation
- Status code contracts
- Error response formats
- CORS headers
- API versioning

## Test Helpers

**Location**: `tests/helpers/federation_helpers.py`

Reusable utilities designed for SDK development:

### ConversationPoller
Poll conversation status with backoff:
```python
poller = ConversationPoller(client, conversation_id)
result = await poller.poll_until_complete(timeout=120)
```

### PhaseTracker
Track phase progression:
```python
tracker = PhaseTracker()
result = await tracker.track(poller, expected_phases=["phase1", "phase2"])
summary = tracker.get_summary()
```

### ArtifactValidator
Validate workflow artifacts:
```python
validator = ArtifactValidator()
validator.add_rule("brand_name", lambda x: len(x) > 0)
is_valid, errors = await validator.validate(artifacts)
```

### TitanParticipationTracker
Track multi-Titan collaboration:
```python
tracker = TitanParticipationTracker()
result = await tracker.track(poller)
assert tracker.all_titans_participated()
```

### GenesisTestHelper
Test Genesis Protocol:
```python
helper = GenesisTestHelper(base_url)
tool_id = await helper.create_tool(spec)
result = await helper.invoke_tool(tool_id, inputs)
```

## Success Metrics

### Success Metric #2: Multi-Titan Collaboration
**Test**: `tests/integration/test_end_to_end_workflows.py::TestMultiTitanCollaboration::test_multi_titan_collaboration`

Validates:
- All 4 Titans (Claude, GPT, Gemini, Grok) participate
- At least 2 rounds of dialogue occur
- Cross-Titan dependency handling

Run: `pytest -k test_multi_titan_collaboration -v`

### Success Metric #4: Genesis Protocol
**Test**: `tests/integration/test_genesis_protocol.py::TestGenesisProtocolSuccessMetric::test_success_metric_4_genesis_protocol_demo`

Validates:
- Tool definition for valid use case
- Dynamic deployment via Genesis
- Tool verification and registration
- Tool execution and result validation

Run: `pytest -k test_success_metric_4 -v`

## Environment Setup

### Required Environment Variables

```bash
# Federation Core URL
export FEDERATION_URL="http://localhost:3000"

# Optional configuration
export FEDERATION_TIMEOUT="30"
export LOG_LEVEL="DEBUG"
```

### Docker Compose Setup

Ensure federation_core is running:

```bash
# From project root
docker-compose up -d federation_core

# Verify it's healthy
curl http://localhost:3000/health
```

## Running Tests

### All Tests
```bash
pytest
```

### Specific Categories
```bash
# Integration tests only
pytest -m integration

# Genesis Protocol tests
pytest -m genesis

# End-to-end workflows
pytest -m e2e

# Contract tests
pytest -m contracts
```

### Specific Test Files
```bash
pytest tests/integration/test_federation_integration.py
pytest tests/integration/test_genesis_protocol.py
pytest tests/integration/test_end_to_end_workflows.py
pytest tests/contracts/test_federation_contracts.py
```

### Verbose Output
```bash
# Show detailed output
pytest -v

# Show print statements
pytest -s

# Both
pytest -vs
```

### With Coverage
```bash
# Generate coverage report
pytest --cov=app --cov-report=html

# View coverage
open htmlcov/index.html
```

### Parallel Execution
```bash
# Install pytest-xdist
pip install pytest-xdist

# Run tests in parallel
pytest -n auto
```

## Test Patterns

See [`TEST_PATTERNS.md`](./TEST_PATTERNS.md) for detailed documentation on:
- Reusable testing patterns
- SDK development guidelines
- Best practices
- Example implementations

## Debugging Failed Tests

### Check Federation Core Health
```bash
curl http://localhost:3000/health | jq
```

### View Federation Core Logs
```bash
docker-compose logs federation_core --tail=100 -f
```

### Run Single Test with Debug Output
```bash
pytest tests/integration/test_genesis_protocol.py::TestGenesisProtocolActivation::test_genesis_simple_tool_creation -vs
```

### Skip Long-Running Tests
```bash
# Skip tests that take > 30 seconds
pytest -m "not slow"
```

## Test Data

### Sample Campaign Data
Located in test fixtures:
```python
{
    "business_idea": "AI-powered meal planning app",
    "target_audience": "Working professionals aged 28-42",
    "brand_values": ["health", "efficiency", "sustainability"],
}
```

### Test Missions
Use helper functions:
```python
from tests.helpers import create_test_mission, create_simple_phase

mission = create_test_mission(
    workflow_type="test_workflow",
    phases=[
        create_simple_phase("phase1", titan="ClaudeTitan"),
        create_simple_phase("phase2", titan="GPTTitan", depends_on=["phase1"])
    ]
)
```

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      federation_core:
        image: forgepilot/federation_core:latest
        ports:
          - 3000:3000

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: pip install -r requirements.txt

      - name: Wait for federation_core
        run: |
          timeout 30 sh -c 'until curl -f http://localhost:3000/health; do sleep 1; done'

      - name: Run tests
        env:
          FEDERATION_URL: http://localhost:3000
        run: pytest -v --cov=app
```

## Writing New Tests

### 1. Choose Test Category
- **Integration**: Testing API endpoints
- **Genesis**: Testing dynamic tool/agent creation
- **E2E**: Testing complete workflows
- **Contract**: Testing API contracts

### 2. Use Existing Helpers
```python
from tests.helpers import (
    ConversationPoller,
    PhaseTracker,
    ArtifactValidator,
)

@pytest.mark.integration
@pytest.mark.asyncio
async def test_my_feature(live_federation_client, ensure_federation_running):
    # Your test here
    pass
```

### 3. Follow Naming Conventions
```python
# Test files: test_*.py
# Test classes: Test*
# Test functions: test_*
# Async tests: mark with @pytest.mark.asyncio
```

### 4. Add Markers
```python
@pytest.mark.integration  # Integration test
@pytest.mark.genesis      # Genesis Protocol test
@pytest.mark.e2e          # End-to-end test
@pytest.mark.contracts    # Contract test
@pytest.mark.slow         # Long-running test
```

## Performance Benchmarks

### Expected Test Times
- Unit tests: < 1s each
- Integration tests: 2-10s each
- E2E workflows: 30-120s each
- Genesis Protocol: 20-60s each

### Optimization Tips
1. Use `pytest -n auto` for parallel execution
2. Skip slow tests during development: `pytest -m "not slow"`
3. Use fixtures to share setup between tests
4. Mock external services in unit tests

## Troubleshooting

### "Federation Core not accessible"
```bash
# Check if federation_core is running
docker ps | grep federation_core

# Check health
curl http://localhost:3000/health

# Restart
docker-compose restart federation_core
```

### "Workflow did not complete in time"
- Increase timeout in test
- Check federation_core logs for errors
- Verify network connectivity

### "Genesis Protocol not enabled"
- Check federation_core feature flags
- Ensure using latest federation_core image
- Verify configuration

## Contributing

When adding new tests:
1. Follow existing patterns in `TEST_PATTERNS.md`
2. Add appropriate pytest markers
3. Include docstrings explaining what's tested
4. Update this README if adding new test categories
5. Ensure tests are idempotent and can run in any order

## Resources

- [Test Patterns Documentation](./TEST_PATTERNS.md)
- [Federation Client Code](../app/clients/federation_client.py)
- [OMEGA Doctrine](../../docs/OMEGA_DOCTRINE.md)
- [Success Metrics](../../docs/SUCCESS_METRICS.md)

---

**This is the fucking way!** 🚀
