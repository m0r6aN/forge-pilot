# ForgePilot Services Package
"""
🧬 ForgePilot Core Services

OMEGA-compliant services for autonomous brand campaign orchestration:
- Orchestrator: Main coordination service that manages the entire swarm
- Future services: Agent Registry, Campaign Analytics, etc.

All services integrate seamlessly with the OMEGA pantheon.
"""

from .orchestrator.service import ForgePilotOrchestrator, app

__all__ = ["ForgePilotOrchestrator", "app"]
