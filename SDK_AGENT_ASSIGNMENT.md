# SDK Build Agent Assignment

## Team Structure

```
Project Lead: SDK Architect
├── Backend Team (3 agents)
│   ├── Core Client Developer
│   ├── Genesis Protocol Developer
│   └── Utilities Developer
├── Quality Team (2 agents)
│   ├── Test Engineer
│   └── Type Safety Specialist
└── Documentation Team (1 agent)
    └── Technical Writer
```

---

## Agent 1: SDK Architect (LEAD)

**Role**: Project coordinator & architecture decisions

**Tasks**:
1. Create project structure at `D:/Repos/forgepilot/forgepilot-sdk/`
2. Initialize `pyproject.toml`
3. Setup package at `forgepilot/`
4. Create `forgepilot/__init__.py` with public API surface
5. Review all PRs from other agents
6. Ensure patterns match `SDK_BUILD_DIRECTIVE.md`

**Deliverables**:
- [ ] Project structure created
- [ ] `pyproject.toml` configured
- [ ] `forgepilot/__init__.py` with exports
- [ ] `.gitignore` for Python
- [ ] `README.md` skeleton

**Dependencies**: None (starts immediately)

---

## Agent 2: Core Client Developer

**Role**: Build main `ForgePilotClient`

**Source Files to Study**:
- `forgepilot-api/app/clients/federation_client.py`
- `forgepilot-api/tests/integration/test_federation_integration.py`

**Tasks**:
1. Create `forgepilot/client.py`
2. Implement `ForgePilotClient` class
3. Add `create_brand_campaign()` method
4. Add `get_conversation()` method
5. Add `get_artifacts()` method
6. Implement retry logic with exponential backoff
7. Add sync wrapper using `asyncio.run()`

**Key Methods**:
```python
class ForgePilotClient:
    async def create_brand_campaign(...) -> CampaignResult
    async def get_conversation(conversation_id) -> ConversationStatus
    async def get_artifacts(conversation_id) -> CampaignArtifacts
```

**Deliverables**:
- [ ] `forgepilot/client.py` (300-400 lines)
- [ ] Full docstrings with examples
- [ ] Error handling for all HTTP calls
- [ ] Retry logic implemented

**Dependencies**:
- Agent 1 (project structure)
- Agent 4 (models.py)

---

## Agent 3: Utilities Developer

**Role**: Port battle-tested helpers from tests

**Source File**: `forgepilot-api/tests/helpers/federation_helpers.py`

**Tasks**:
1. Create `forgepilot/utilities.py`
2. **COPY** `ConversationPoller` class (don't rewrite!)
3. **COPY** `PhaseTracker` class
4. **COPY** `ArtifactValidator` class
5. **COPY** `TitanParticipationTracker` class
6. Adapt for SDK use (remove test-specific code)
7. Add docstrings for public use

**Critical**: These are proven patterns. Copy, don't reinvent!

**Deliverables**:
- [ ] `forgepilot/utilities.py` (400+ lines)
- [ ] `ConversationPoller` - adaptive polling
- [ ] `PhaseTracker` - phase progression
- [ ] `ArtifactValidator` - output validation
- [ ] `TitanParticipationTracker` - multi-Titan tracking

**Dependencies**: Agent 1 (project structure)

---

## Agent 4: Models Developer

**Role**: Create Pydantic models for type safety

**Source Files to Study**:
- `forgepilot-api/app/models/`
- `forgepilot-api/tests/contracts/test_federation_contracts.py` (schemas)

**Tasks**:
1. Create `forgepilot/models.py`
2. Define all Pydantic models:
   - `WorkflowState` (Enum)
   - `ConversationStatus`
   - `BrandStrategy`
   - `DomainSuggestion`
   - `BrandGuidelines`
   - `CampaignArtifacts`
   - `CampaignResult`
3. Add convenience properties (e.g., `result.brand_name`)
4. Add validators where needed

**Deliverables**:
- [ ] `forgepilot/models.py` (200-300 lines)
- [ ] All models with docstrings
- [ ] Type hints for all fields
- [ ] Convenience properties

**Dependencies**: Agent 1 (project structure)

---

## Agent 5: Genesis Protocol Developer

**Role**: Build Genesis Protocol SDK features

**Source Files**:
- `forgepilot-api/tests/helpers/federation_helpers.py::GenesisTestHelper`
- `forgepilot-api/tests/integration/test_genesis_protocol.py`

**Tasks**:
1. Create `forgepilot/genesis.py`
2. Implement `GenesisClient` class
3. Add `create_tool()` method
4. Add `invoke_tool()` method
5. Add `spawn_agent()` method
6. Add `get_tool_status()` method

**Deliverables**:
- [ ] `forgepilot/genesis.py` (200-300 lines)
- [ ] `GenesisClient` class
- [ ] Tool creation/invocation
- [ ] Agent spawning
- [ ] Full docstrings

**Dependencies**:
- Agent 1 (project structure)
- Agent 4 (models.py)

---

## Agent 6: Configuration & Exceptions Developer

**Role**: Build config and exception handling

**Tasks**:
1. Create `forgepilot/config.py`
   - `ForgePilotConfig` Pydantic settings
   - `get_config()` singleton
   - `set_api_key()` convenience
2. Create `forgepilot/exceptions.py`
   - `ForgePilotError` base
   - `AuthenticationError`
   - `WorkflowTimeoutError`
   - `WorkflowFailedError`
   - `ValidationError`
   - `GenesisProtocolError`

**Deliverables**:
- [ ] `forgepilot/config.py` (50-100 lines)
- [ ] `forgepilot/exceptions.py` (50-100 lines)
- [ ] Environment variable support
- [ ] `.env` file example

**Dependencies**: Agent 1 (project structure)

---

## Agent 7: Test Engineer

**Role**: Write SDK tests using proven patterns

**Source**: `forgepilot-api/tests/`

**Tasks**:
1. Create `tests/conftest.py` (fixtures)
2. Create `tests/test_client.py`
   - Test campaign creation
   - Test conversation management
   - Test artifact retrieval
   - Test error handling
3. Create `tests/test_genesis.py`
   - Test tool creation
   - Test agent spawning
4. Create `tests/test_utilities.py`
   - Test polling
   - Test phase tracking

**Deliverables**:
- [ ] `tests/conftest.py`
- [ ] `tests/test_client.py` (10+ tests)
- [ ] `tests/test_genesis.py` (5+ tests)
- [ ] `tests/test_utilities.py` (5+ tests)
- [ ] >80% code coverage

**Dependencies**: All core developers (2-6)

---

## Agent 8: Type Safety Specialist

**Role**: Ensure complete type safety

**Tasks**:
1. Add type hints to ALL functions
2. Create `py.typed` marker file
3. Configure `mypy.ini`
4. Run mypy on entire codebase
5. Fix all type errors
6. Add type stubs where needed

**Deliverables**:
- [ ] `py.typed` file
- [ ] `mypy.ini` configured
- [ ] Zero mypy errors
- [ ] All functions typed

**Dependencies**: All core developers (2-6)

---

## Agent 9: Example Creator

**Role**: Create usage examples

**Tasks**:
1. Create `examples/basic_campaign.py`
2. Create `examples/genesis_protocol.py`
3. Create `examples/progress_monitoring.py`
4. Create `examples/multi_titan_workflow.py`
5. Test all examples work

**Deliverables**:
- [ ] 4+ working example files
- [ ] Each example is self-contained
- [ ] Clear comments explaining code
- [ ] README in examples/ folder

**Dependencies**: All core developers (2-6)

---

## Agent 10: Technical Writer

**Role**: Complete documentation

**Tasks**:
1. Write `README.md`
   - Installation
   - Quick start
   - Features
   - Examples
   - Links to docs
2. Create `docs/quickstart.md`
3. Create `docs/api-reference.md`
   - Document all public classes
   - Document all methods
   - Include type signatures
4. Create `docs/examples.md`
5. Create `CHANGELOG.md`

**Deliverables**:
- [ ] `README.md` (compelling, clear)
- [ ] `docs/quickstart.md`
- [ ] `docs/api-reference.md`
- [ ] `docs/examples.md`
- [ ] `CHANGELOG.md`

**Dependencies**: All developers (for API understanding)

---

## Build Timeline

### Week 1: Core Implementation
**Days 1-2**: Agents 1, 4, 6 (Structure, Models, Config)
**Days 3-4**: Agents 2, 3 (Client, Utilities)
**Days 5-7**: Agent 5 (Genesis)

### Week 2: Quality & Examples
**Days 8-10**: Agents 7, 8 (Tests, Types)
**Days 11-12**: Agent 9 (Examples)
**Days 13-14**: Agent 10 (Documentation)

### Week 3: Polish & Release
**Days 15-17**: Bug fixes, optimization
**Days 18-19**: Final testing
**Day 20**: Release v1.0.0

---

## Communication Protocol

### Daily Standup (Async)
Each agent posts:
1. What I completed yesterday
2. What I'm working on today
3. Any blockers

### Code Review
- All code reviewed by SDK Architect
- PRs must have:
  - Docstrings
  - Type hints
  - Tests (if applicable)
  - Updated CHANGELOG

### Definition of Done
- [ ] Code written
- [ ] Type hints added
- [ ] Docstrings complete
- [ ] Tests passing
- [ ] Mypy passing
- [ ] Reviewed by SDK Architect
- [ ] Merged to main

---

## Critical Success Factors

✅ **Use Proven Patterns**: Copy from `forgepilot-api/tests/helpers/`
✅ **Type Safety**: Full type hints, zero mypy errors
✅ **Documentation**: Every public API documented
✅ **Examples**: Working examples for common use cases
✅ **Tests**: >80% coverage using integration test patterns

---

## Hand-off Package

Each agent receives:
1. This assignment document
2. `SDK_BUILD_DIRECTIVE.md` (technical spec)
3. Access to source code:
   - `forgepilot-api/app/clients/`
   - `forgepilot-api/tests/helpers/`
   - `forgepilot-api/tests/integration/`
4. Their specific source files to study
5. Their deliverables checklist

---

## This is the fucking way! 🚀

**Clear assignments. Proven patterns. Battle-tested code. Ship it!**
