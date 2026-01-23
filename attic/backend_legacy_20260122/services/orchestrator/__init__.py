# ForgePilot Orchestrator Package
"""
🧬 ForgePilot Orchestrator - Autonomous Brand Campaign Coordination

The orchestrator coordinates the complete ForgePilot swarm to generate
comprehensive brand campaigns through multi-phase agent collaboration.

Components:
- ForgePilotOrchestrator: Core orchestration class
- FastAPI Service: REST API interface
- Request/Response Models: Data structures for campaigns

This package provides both:
- Standalone orchestrator class for programmatic use
- FastAPI service for HTTP API integration
"""

from .forgepilot_orchestrator import (
    ForgePilotOrchestrator,
    BrandCampaignRequest,
    BrandCampaignResponse,
    forgepilot_orchestrator,
)

from .service import app

__all__ = [
    "ForgePilotOrchestrator",
    "BrandCampaignRequest",
    "BrandCampaignResponse",
    "forgepilot_orchestrator",
    "app",
]
