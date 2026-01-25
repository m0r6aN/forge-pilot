# ForgePilot SDK Build Directive

## Mission: Build Production-Ready Python SDK

Build a modern Python SDK for ForgePilot based on battle-tested patterns from `forgepilot-api/tests`. This SDK will enable developers to create brand campaigns, manage workflows, and leverage the Genesis Protocol with minimal code.

---

## Architecture Overview

```
forgepilot-sdk/
├── pyproject.toml                    # Modern Python packaging
├── README.md                         # Quick start + examples
├── docs/                             # Full documentation
│   ├── quickstart.md
│   ├── api-reference.md
│   └── examples/
├── forgepilot/
│   ├── __init__.py                   # Public API surface
│   ├── client.py                     # Main ForgePilotClient
│   ├── conversation.py               # Conversation management
│   ├── genesis.py                    # Genesis Protocol features
│   ├── models.py                     # Pydantic models
│   ├── utilities.py                  # Polling, tracking helpers
│   ├── exceptions.py                 # Custom exceptions
│   └── config.py                     # Configuration management
├── tests/                            # SDK tests
│   ├── test_client.py
│   ├── test_conversation.py
│   ├── test_genesis.py
│   └── conftest.py
└── examples/                         # Usage examples
    ├── basic_campaign.py
    ├── genesis_protocol.py
    └── multi_titan.py
```

---

## Phase 1: Core Client (Priority: CRITICAL)

### File: `forgepilot/client.py`

**Objective**: Main SDK client with conversation management

**Source Patterns**:
- `forgepilot-api/app/clients/federation_client.py`
- `forgepilot-api/tests/helpers/federation_helpers.py`

**Key Features**:
```python
class ForgePilotClient:
    """Main SDK client for ForgePilot API."""

    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.forgepilot.ai",
        timeout: float = 30.0
    ):
        """Initialize client with API credentials."""

    async def create_brand_campaign(
        self,
        business_idea: str,
        target_audience: str,
        brand_values: List[str],
        wait_for_completion: bool = True,
        on_progress: Optional[Callable] = None
    ) -> CampaignResult:
        """Create and optionally monitor a brand campaign.

        Args:
            business_idea: Description of the business
            target_audience: Target customer description
            brand_values: List of brand values (e.g., ["innovation", "quality"])
            wait_for_completion: Whether to poll until complete
            on_progress: Optional callback for progress updates

        Returns:
            CampaignResult with brand name, domains, guidelines, etc.

        Example:
            >>> client = ForgePilotClient(api_key="...")
            >>> result = await client.create_brand_campaign(
            ...     business_idea="AI-powered fitness app",
            ...     target_audience="Health-conscious millennials",
            ...     brand_values=["innovation", "wellness"]
            ... )
            >>> print(f"Brand: {result.brand_name}")
            >>> print(f"Domains: {result.available_domains}")
        """

    async def get_conversation(
        self,
        conversation_id: str
    ) -> ConversationStatus:
        """Get conversation status."""

    async def get_artifacts(
        self,
        conversation_id: str
    ) -> CampaignArtifacts:
        """Get campaign deliverables."""
```

**Implementation Requirements**:
1. Use `httpx.AsyncClient` for all HTTP calls
2. Include automatic retry with exponential backoff
3. Proper error handling with custom exceptions
4. Support both sync and async interfaces (use `asyncio.run` wrapper for sync)
5. Built-in polling using `ConversationPoller` pattern from tests
6. Progress callbacks for monitoring

---

## Phase 2: Utilities Module (Priority: CRITICAL)

### File: `forgepilot/utilities.py`

**Objective**: Battle-tested utilities from test suite

**Source**: `forgepilot-api/tests/helpers/federation_helpers.py`

**Port These Classes**:

1. **`ConversationPoller`** - Adaptive polling with backoff
2. **`PhaseTracker`** - Track workflow phase progression
3. **`ArtifactValidator`** - Validate campaign outputs
4. **`TitanParticipationTracker`** - Track multi-Titan workflows

**Critical**: Copy implementation exactly from test helpers. These are battle-tested and proven.

---

## Phase 3: Models (Priority: HIGH)

### File: `forgepilot/models.py`

**Objective**: Pydantic models for type safety

**Models to Create**:

```python
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from enum import Enum

class WorkflowState(str, Enum):
    """Workflow states."""
    QUEUED = "queued"
    ACTIVE = "active"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class ConversationStatus(BaseModel):
    """Conversation status response."""
    conversation_id: str
    state: WorkflowState
    created_at: str
    updated_at: Optional[str] = None
    current_phase: Optional[str] = None
    completion_percentage: int = 0
    phase_results: Dict[str, Any] = {}
    error: Optional[str] = None

class BrandStrategy(BaseModel):
    """Brand strategy deliverable."""
    brand_name: str
    tagline: Optional[str] = None
    positioning: str
    values: List[str]
    personality: Dict[str, Any]

class DomainSuggestion(BaseModel):
    """Domain availability suggestion."""
    domain: str
    available: bool
    tld: str
    alternative_suggestions: List[str] = []

class BrandGuidelines(BaseModel):
    """Brand guidelines deliverable."""
    colors: Dict[str, str]  # e.g., {"primary": "#1E40AF"}
    typography: Dict[str, str]
    logo_usage: Dict[str, Any]
    voice_tone: Dict[str, Any]

class CampaignArtifacts(BaseModel):
    """Complete campaign deliverables."""
    brand_strategy: BrandStrategy
    domains: List[DomainSuggestion]
    brand_guidelines: BrandGuidelines
    legal_review: Optional[Dict[str, Any]] = None

class CampaignResult(BaseModel):
    """Result of campaign creation."""
    conversation_id: str
    status: WorkflowState
    artifacts: Optional[CampaignArtifacts] = None

    @property
    def brand_name(self) -> Optional[str]:
        """Convenience accessor for brand name."""
        if self.artifacts:
            return self.artifacts.brand_strategy.brand_name
        return None

    @property
    def available_domains(self) -> List[str]:
        """Get list of available domains."""
        if self.artifacts:
            return [d.domain for d in self.artifacts.domains if d.available]
        return []
```

---

## Phase 4: Genesis Protocol (Priority: HIGH)

### File: `forgepilot/genesis.py`

**Objective**: Genesis Protocol SDK features

**Source**: `forgepilot-api/tests/helpers/federation_helpers.py::GenesisTestHelper`

**Key Features**:
```python
class GenesisClient:
    """Client for Genesis Protocol - dynamic tool/agent creation."""

    def __init__(self, base_url: str, api_key: str):
        """Initialize Genesis client."""

    async def create_tool(
        self,
        name: str,
        description: str,
        input_schema: Dict[str, Any],
        implementation: str,
        runtime: str = "python3.11"
    ) -> ToolCreationResult:
        """Create a new tool dynamically.

        Example:
            >>> genesis = GenesisClient(base_url, api_key)
            >>> result = await genesis.create_tool(
            ...     name="brand_color_validator",
            ...     description="Validates brand colors for accessibility",
            ...     input_schema={...},
            ...     implementation="def validate(colors): ..."
            ... )
            >>> print(f"Tool ID: {result.tool_id}")
        """

    async def invoke_tool(
        self,
        tool_id: str,
        inputs: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Invoke a Genesis-created tool."""

    async def spawn_agent(
        self,
        name: str,
        description: str,
        capabilities: List[str],
        tools: List[str] = []
    ) -> AgentSpawnResult:
        """Spawn a specialized agent."""
```

---

## Phase 5: Configuration (Priority: MEDIUM)

### File: `forgepilot/config.py`

**Objective**: Configuration management

```python
from pydantic_settings import BaseSettings
from typing import Optional

class ForgePilotConfig(BaseSettings):
    """SDK configuration."""

    api_key: Optional[str] = None
    base_url: str = "https://api.forgepilot.ai"
    timeout: float = 30.0
    max_retries: int = 3

    class Config:
        env_prefix = "FORGEPILOT_"
        env_file = ".env"

# Singleton for global config
_config: Optional[ForgePilotConfig] = None

def get_config() -> ForgePilotConfig:
    """Get global config instance."""
    global _config
    if _config is None:
        _config = ForgePilotConfig()
    return _config

def set_api_key(api_key: str):
    """Set API key globally."""
    config = get_config()
    config.api_key = api_key
```

---

## Phase 6: Exceptions (Priority: MEDIUM)

### File: `forgepilot/exceptions.py`

```python
class ForgePilotError(Exception):
    """Base exception for ForgePilot SDK."""
    pass

class AuthenticationError(ForgePilotError):
    """API key invalid or missing."""
    pass

class WorkflowTimeoutError(ForgePilotError):
    """Workflow did not complete in time."""
    pass

class WorkflowFailedError(ForgePilotError):
    """Workflow execution failed."""
    def __init__(self, message: str, conversation_id: str, error_details: str):
        super().__init__(message)
        self.conversation_id = conversation_id
        self.error_details = error_details

class ValidationError(ForgePilotError):
    """Input validation failed."""
    pass

class GenesisProtocolError(ForgePilotError):
    """Genesis Protocol operation failed."""
    pass
```

---

## Phase 7: Package Setup (Priority: CRITICAL)

### File: `pyproject.toml`

```toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "forgepilot"
version = "1.0.0"
description = "Python SDK for ForgePilot - AI-powered brand campaign creation"
readme = "README.md"
requires-python = ">=3.11"
license = {text = "MIT"}
authors = [
    {name = "ForgePilot", email = "sdk@forgepilot.ai"}
]

dependencies = [
    "httpx>=0.25.0",
    "pydantic>=2.0.0",
    "pydantic-settings>=2.0.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.0.0",
    "pytest-asyncio>=0.21.0",
    "pytest-cov>=4.0.0",
    "black>=23.0.0",
    "ruff>=0.1.0",
    "mypy>=1.0.0",
]

[project.urls]
Homepage = "https://forgepilot.ai"
Documentation = "https://docs.forgepilot.ai/sdk"
Repository = "https://github.com/forgepilot/forgepilot-sdk"

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
python_files = ["test_*.py"]
python_classes = ["Test*"]
python_functions = ["test_*"]

[tool.black]
line-length = 100
target-version = ['py311']

[tool.ruff]
line-length = 100
target-version = "py311"
```

### File: `forgepilot/__init__.py`

```python
"""ForgePilot SDK - AI-powered brand campaign creation."""

from .client import ForgePilotClient
from .genesis import GenesisClient
from .models import (
    CampaignResult,
    CampaignArtifacts,
    BrandStrategy,
    BrandGuidelines,
    DomainSuggestion,
    WorkflowState,
)
from .utilities import (
    ConversationPoller,
    PhaseTracker,
    ArtifactValidator,
)
from .config import set_api_key, get_config
from .exceptions import (
    ForgePilotError,
    AuthenticationError,
    WorkflowTimeoutError,
    WorkflowFailedError,
)

__version__ = "1.0.0"
__all__ = [
    # Main client
    "ForgePilotClient",
    "GenesisClient",

    # Models
    "CampaignResult",
    "CampaignArtifacts",
    "BrandStrategy",
    "BrandGuidelines",
    "DomainSuggestion",
    "WorkflowState",

    # Utilities
    "ConversationPoller",
    "PhaseTracker",
    "ArtifactValidator",

    # Configuration
    "set_api_key",
    "get_config",

    # Exceptions
    "ForgePilotError",
    "AuthenticationError",
    "WorkflowTimeoutError",
    "WorkflowFailedError",
]

# Convenience imports for common use case
import asyncio

def create_campaign(
    api_key: str,
    business_idea: str,
    target_audience: str,
    brand_values: list[str]
) -> CampaignResult:
    """Synchronous convenience function for creating campaigns.

    Example:
        >>> import forgepilot
        >>> result = forgepilot.create_campaign(
        ...     api_key="your-key",
        ...     business_idea="AI fitness app",
        ...     target_audience="Millennials",
        ...     brand_values=["innovation", "health"]
        ... )
        >>> print(result.brand_name)
    """
    client = ForgePilotClient(api_key=api_key)
    return asyncio.run(client.create_brand_campaign(
        business_idea=business_idea,
        target_audience=target_audience,
        brand_values=brand_values
    ))
```

---

## Phase 8: Examples (Priority: HIGH)

### File: `examples/basic_campaign.py`

```python
"""Basic brand campaign creation example."""

import asyncio
from forgepilot import ForgePilotClient

async def main():
    # Initialize client
    client = ForgePilotClient(api_key="your-api-key-here")

    # Create campaign
    print("Creating brand campaign...")
    result = await client.create_brand_campaign(
        business_idea="AI-powered meal planning app for busy professionals",
        target_audience="Working professionals aged 28-42 who value health",
        brand_values=["innovation", "health", "efficiency"]
    )

    # Access results
    print(f"\n✓ Brand Name: {result.brand_name}")
    print(f"✓ Available Domains: {', '.join(result.available_domains)}")
    print(f"✓ Primary Color: {result.artifacts.brand_guidelines.colors['primary']}")

if __name__ == "__main__":
    asyncio.run(main())
```

### File: `examples/genesis_protocol.py`

```python
"""Genesis Protocol - Dynamic tool creation example."""

import asyncio
from forgepilot import ForgePilotClient

async def main():
    client = ForgePilotClient(api_key="your-api-key-here")

    # Create custom validation tool
    print("Creating custom tool via Genesis Protocol...")
    tool_result = await client.genesis.create_tool(
        name="brand_name_validator",
        description="Validates brand names for trademark conflicts",
        input_schema={
            "type": "object",
            "properties": {
                "brand_name": {"type": "string"}
            }
        },
        implementation="""
def validate(brand_name: str) -> dict:
    # Custom validation logic
    conflicts = check_trademark_database(brand_name)
    return {
        "valid": len(conflicts) == 0,
        "conflicts": conflicts
    }
"""
    )

    print(f"✓ Tool created: {tool_result.tool_id}")

    # Use the tool
    validation = await client.genesis.invoke_tool(
        tool_id=tool_result.tool_id,
        inputs={"brand_name": "MyBrand"}
    )

    print(f"✓ Validation result: {validation}")

if __name__ == "__main__":
    asyncio.run(main())
```

### File: `examples/progress_monitoring.py`

```python
"""Monitor campaign progress with callbacks."""

import asyncio
from forgepilot import ForgePilotClient

async def main():
    client = ForgePilotClient(api_key="your-api-key-here")

    # Progress callback
    def on_progress(status):
        phase = status.current_phase or "initializing"
        completion = status.completion_percentage
        print(f"  [{completion}%] Phase: {phase}")

    # Create with monitoring
    print("Creating campaign with progress monitoring...\n")
    result = await client.create_brand_campaign(
        business_idea="Sustainable fashion marketplace",
        target_audience="Eco-conscious millennials",
        brand_values=["sustainability", "quality"],
        on_progress=on_progress
    )

    print(f"\n✓ Campaign complete!")
    print(f"  Brand: {result.brand_name}")

if __name__ == "__main__":
    asyncio.run(main())
```

---

## Phase 9: Tests (Priority: CRITICAL)

### File: `tests/conftest.py`

**Copy from**: `forgepilot-api/tests/conftest.py`

Add SDK-specific fixtures:
```python
import pytest
from forgepilot import ForgePilotClient

@pytest.fixture
def mock_api_key():
    return "test-api-key-12345"

@pytest.fixture
def client(mock_api_key):
    return ForgePilotClient(
        api_key=mock_api_key,
        base_url="http://localhost:3000"
    )
```

### File: `tests/test_client.py`

Use patterns from `forgepilot-api/tests/integration/test_federation_integration.py`

---

## Phase 10: Documentation (Priority: HIGH)

### File: `README.md`

```markdown
# ForgePilot SDK

Official Python SDK for ForgePilot - AI-powered brand campaign creation.

## Installation

```bash
pip install forgepilot
```

## Quick Start

```python
from forgepilot import ForgePilotClient

# Initialize
client = ForgePilotClient(api_key="your-key")

# Create campaign
result = await client.create_brand_campaign(
    business_idea="AI fitness app",
    target_audience="Health-conscious millennials",
    brand_values=["innovation", "wellness"]
)

# Get results
print(f"Brand: {result.brand_name}")
print(f"Domains: {result.available_domains}")
```

## Features

✅ **Brand Campaign Creation** - AI-powered brand strategy
✅ **Domain Research** - Automated availability checking
✅ **Brand Guidelines** - Colors, typography, voice & tone
✅ **Genesis Protocol** - Dynamic tool creation
✅ **Progress Monitoring** - Real-time workflow tracking
✅ **Type Safety** - Full Pydantic models

## Documentation

- [Quick Start Guide](docs/quickstart.md)
- [API Reference](docs/api-reference.md)
- [Examples](examples/)

## License

MIT
```

---

## Implementation Priority

### Phase 1 (Week 1) - CRITICAL PATH
1. ✅ Project structure
2. ✅ `client.py` - Core client
3. ✅ `utilities.py` - Port test helpers
4. ✅ `models.py` - Pydantic models
5. ✅ Basic tests

### Phase 2 (Week 2) - HIGH PRIORITY
6. ✅ `genesis.py` - Genesis Protocol
7. ✅ `config.py` + `exceptions.py`
8. ✅ Examples
9. ✅ Documentation

### Phase 3 (Week 3) - POLISH
10. ✅ Complete test coverage
11. ✅ Type hints + mypy validation
12. ✅ Performance optimization
13. ✅ CI/CD setup

---

## Success Criteria

✅ **Working SDK**: Can create campaigns end-to-end
✅ **Test Coverage**: >80% coverage using proven patterns
✅ **Documentation**: README + examples + API reference
✅ **Type Safety**: Full type hints, passes mypy
✅ **Battle-Tested**: Uses utilities from integration tests

---

## Key Principles

🔥 **Copy Don't Rewrite**: Port proven patterns from tests
🔥 **Type Safety First**: Pydantic models for everything
🔥 **Developer Experience**: Simple API, great examples
🔥 **Battle-Tested**: Use the helpers that already work
🔥 **Production Ready**: Error handling, retries, validation

---

## This is the fucking way! 🚀

Build this SDK and developers will have a production-ready tool for creating brand campaigns with minimal code. Every pattern is proven. Every helper is battle-tested. This is how we ship quality.
