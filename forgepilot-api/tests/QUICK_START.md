# Quick Start Guide - ForgePilot API Tests

## 🚀 Run Your First Test (30 seconds)

```powershell
# 1. Ensure federation_core is running
docker-compose up -d federation_core

# 2. Run quick smoke test
.\run_tests.ps1 quick

# Expected output:
# ✓ federation_core is running
# test_health_check_real PASSED
```

## 📊 Test Categories

```powershell
# Integration Tests (2-10s each)
.\run_tests.ps1 integration

# Genesis Protocol (20-60s each)
.\run_tests.ps1 genesis

# End-to-End Workflows (30-120s each)
.\run_tests.ps1 e2e

# API Contracts (1-5s each)
.\run_tests.ps1 contracts

# All Tests
.\run_tests.ps1 all
```

## 🎯 Success Metrics

### Success Metric #2: Multi-Titan Collaboration
```powershell
pytest -k test_multi_titan_collaboration -vs
```
Validates: All 4 Titans + 2 rounds of dialogue

### Success Metric #4: Genesis Protocol
```powershell
pytest -k test_success_metric_4 -vs
```
Validates: Dynamic tool creation and execution

## 🛠️ Reusable Patterns

### Poll for Completion
```python
from tests.helpers import ConversationPoller

poller = ConversationPoller(client, conversation_id)
result = await poller.poll_until_complete(timeout=120)
```

### Track Phases
```python
from tests.helpers import PhaseTracker

tracker = PhaseTracker()
result = await tracker.track(poller)
print(tracker.get_summary())
```

### Validate Artifacts
```python
from tests.helpers import ArtifactValidator

validator = ArtifactValidator()
validator.add_rule("brand_name", lambda x: len(x) > 0)
is_valid, errors = await validator.validate(artifacts)
```

## 📁 Test Files

```
tests/
├── integration/
│   ├── test_federation_integration.py    # Real API tests
│   ├── test_genesis_protocol.py          # Genesis Protocol
│   └── test_end_to_end_workflows.py     # Complete workflows
├── contracts/
│   └── test_federation_contracts.py      # API contracts
├── helpers/
│   └── federation_helpers.py             # Reusable utilities
└── README.md                             # Full documentation
```

## 🔍 Troubleshooting

**federation_core not running?**
```powershell
docker-compose up -d federation_core
curl http://localhost:3000/health
```

**Tests timing out?**
- Check federation_core logs: `docker-compose logs federation_core -f`
- Increase timeout in test code
- Verify network connectivity

## 📚 More Info

- **Full Documentation**: `README.md`
- **SDK Patterns**: `TEST_PATTERNS.md`
- **Success Metrics**: Root `TEST_SUITE_SUMMARY.md`

## This is the fucking way! 🚀
