"""
🧬 OMEGA Compatibility Layer for ForgePilot Integration

This module provides OMEGA class imports with intelligent fallbacks.
It tries to import from the real OMEGA pantheon, but provides lightweight
compatible implementations if OMEGA isn't available.

This ensures ForgePilot works both:
- With full OMEGA integration (when pantheon is running)
- In standalone mode (for development/testing)
"""

import os
import sys
from typing import Dict, Any, List, Optional, Union
from datetime import datetime, timezone
from abc import ABC, abstractmethod

# Try to import from real OMEGA first
OMEGA_AVAILABLE = False
OMEGA_PATH = None

# Check for OMEGA in parent directory (common setup)
possible_omega_paths = [
    "/app/omega",  # Docker container path
    os.path.join(os.path.dirname(__file__), "../../../../../o.m.e.g.a/backend/src"),
    os.path.join(os.path.dirname(__file__), "../../../../o.m.e.g.a/backend/src"),
    os.path.join(os.path.dirname(__file__), "../../../o.m.e.g.a/backend/src"),
    "D:/Repos/o.m.e.g.a/backend/src",  # Your specific path
]

for path in possible_omega_paths:
    if os.path.exists(os.path.join(path, "omega")):
        OMEGA_PATH = path
        if path not in sys.path:
            sys.path.insert(0, path)
        break

# Try to import real OMEGA classes
try:
    from core.agents.base_agent import BaseAgent as OmegaBaseAgent
    from core.mixins.collaborator import CollaboratorMixin as OmegaCollaboratorMixin
    from core.models.core_models import TaskStatus, TaskOutcome, TaskEvent, TaskPriority
    from core.models.agent_settings import AgentSettings
    from core.models.core_models import AgentCapability, CapabilityCategory

    OMEGA_AVAILABLE = True
    print("✅ OMEGA classes imported successfully from real pantheon")
except ImportError as e:
    print(f"⚠️  OMEGA pantheon not available: {e}")
    print("🔧 Using lightweight compatibility mode")
    OMEGA_AVAILABLE = False

# =============================================================================
# LIGHTWEIGHT OMEGA-COMPATIBLE CLASSES (Fallback implementations)
# =============================================================================

if not OMEGA_AVAILABLE:
    from enum import Enum
    from pydantic import BaseModel, Field
    from typing import Any, Dict, List, Optional
    import uuid

    # Task-related enums
    class TaskStatus(str, Enum):
        CREATED = "created"
        QUEUED = "queued"
        ASSIGNED = "assigned"
        IN_PROGRESS = "in_progress"
        COMPLETED = "completed"
        FAILED = "failed"
        CANCELLED = "cancelled"

    class TaskOutcome(str, Enum):
        SUCCESS = "success"
        FAILURE = "failure"
        PENDING = "pending"
        CANCELLED = "cancelled"

    class TaskEvent(str, Enum):
        PLAN = "plan"
        EXECUTE = "execute"
        COMPLETE = "complete"
        INFO = "info"
        ANALYZE = "analyze"

    class TaskPriority(int, Enum):
        LOW = 1
        NORMAL = 5
        HIGH = 7
        URGENT = 9

    class CapabilityCategory(str, Enum):
        ANALYSIS = "analysis"
        COORDINATION = "coordination"
        ORCHESTRATION = "orchestration"
        GENERATION = "generation"
        VALIDATION = "validation"

    # Core models
    class AgentCapability(BaseModel):
        name: str
        description: str
        confidence: float = 0.85
        category: CapabilityCategory = CapabilityCategory.ANALYSIS

    class AgentSettings(BaseModel):
        agent_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
        name: str
        description: str
        version: str = "1.0.0"
        port: int = 8000
        mcp_port: int = 8001
        host: str = "0.0.0.0"
        capabilities: Optional[List[AgentCapability]] = None

    # Lightweight BaseAgent
    class OmegaBaseAgent:
        """Lightweight OMEGA-compatible BaseAgent"""

        def __init__(self, settings: AgentSettings = None, **kwargs):
            if settings:
                self.agent_name = settings.name
                self.agent_id = settings.agent_id
                self.description = settings.description
                self.version = settings.version
                self.capabilities = settings.capabilities or []
            else:
                # Support direct initialization
                self.agent_name = kwargs.get("agent_name", "unknown_agent")
                self.agent_id = kwargs.get("agent_id", str(uuid.uuid4()))
                self.description = kwargs.get("description", "ForgePilot Agent")
                self.version = kwargs.get("version", "1.0.0")
                self.capabilities = kwargs.get("capabilities", [])

            self.start_time = datetime.now(timezone.utc)
            self.omega_available = False

        async def get_context(self) -> Dict[str, Any]:
            """Get contextual information - lightweight fallback"""
            return {
                "agent": self.agent_name,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "context_source": "fallback",
                "omega_available": False,
            }

    # Lightweight CollaboratorMixin
    class OmegaCollaboratorMixin:
        """Lightweight OMEGA-compatible CollaboratorMixin"""

        def __init__(self, *args, **kwargs):
            super().__init__(*args, **kwargs)
            self.collaboration_enabled = True
            self.omega_available = False

        async def is_task_relevant(self, task: Dict[str, Any]) -> bool:
            """Default task relevance check - override in agent"""
            return True

        async def publish_result(self, result: Dict[str, Any]) -> None:
            """Publish result - lightweight implementation"""
            print(
                f"📊 Agent {getattr(self, 'agent_name', 'unknown')} result: {result.get('success', False)}"
            )


# =============================================================================
# UNIFIED INTERFACE (Works with both real OMEGA and fallback)
# =============================================================================


# TaskResult-compatible class
class TaskResult:
    """OMEGA-compatible task result"""

    def __init__(
        self,
        success: bool,
        data: Any = None,
        error: str = None,
        metadata: Dict[str, Any] = None,
    ):
        self.success = success
        self.data = data
        self.error = error
        self.metadata = metadata or {}
        self.timestamp = datetime.now(timezone.utc)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "data": self.data,
            "error": self.error,
            "metadata": self.metadata,
            "timestamp": self.timestamp.isoformat(),
        }


# Unified base classes that work with either mode
BaseAgent = OmegaBaseAgent
CollaboratorMixin = OmegaCollaboratorMixin


# Helper functions
def create_agent_settings(
    name: str, description: str, capabilities: List[str] = None, **kwargs
) -> AgentSettings:
    """Create AgentSettings compatible with both modes"""

    # Convert capability strings to AgentCapability objects
    capability_objects = []
    if capabilities:
        for cap in capabilities:
            capability_objects.append(
                AgentCapability(
                    name=cap,
                    description=f"Agent capability: {cap}",
                    confidence=0.85,
                    category=CapabilityCategory.ANALYSIS,
                )
            )

    return AgentSettings(
        name=name, description=description, capabilities=capability_objects, **kwargs
    )


def is_omega_available() -> bool:
    """Check if real OMEGA pantheon is available"""
    return OMEGA_AVAILABLE


def get_omega_info() -> Dict[str, Any]:
    """Get OMEGA integration information"""
    return {
        "omega_available": OMEGA_AVAILABLE,
        "omega_path": OMEGA_PATH,
        "mode": "full_integration" if OMEGA_AVAILABLE else "standalone",
        "compatible_classes": [
            "BaseAgent",
            "CollaboratorMixin",
            "TaskResult",
            "AgentSettings",
            "AgentCapability",
        ],
    }


# Export all the classes agents need
__all__ = [
    "BaseAgent",
    "CollaboratorMixin",
    "TaskResult",
    "TaskStatus",
    "TaskOutcome",
    "TaskEvent",
    "TaskPriority",
    "AgentSettings",
    "AgentCapability",
    "CapabilityCategory",
    "create_agent_settings",
    "is_omega_available",
    "get_omega_info",
    "OMEGA_AVAILABLE",
]
