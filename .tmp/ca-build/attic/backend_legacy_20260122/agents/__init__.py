# ForgePilot Agents Package
"""
🧬 ForgePilot Agent Swarm

Autonomous agents that collaborate to generate complete brand campaigns:
- Brand Strategist: Market psychology and positioning
- Domain Hunter: Real-time domain availability
- Legal Guardian: Trademark and IP validation
- Market Intelligence: Competitive analysis
- Creative Director: Visual identity generation
- Pricing Strategist: Revenue optimization
- Launch Coordinator: Go-to-market strategy

All agents follow OMEGA Doctrine patterns for seamless integration.
"""

from .brand_strategist.agent import BrandStrategistAgent, brand_strategist_agent
from .creative_director.agent import CreativeDirectorAgent, creative_director_agent
from .domain_hunter.agent import DomainHunterAgent, domain_hunter_agent
from .legal_guardian.agent import LegalGuardianAgent, legal_guardian_agent
from .market_intelligence.agent import (
    MarketIntelligenceAgent,
    market_intelligence_agent,
)
from .pricing_strategist.agent import PricingStrategistAgent, pricing_strategist_agent
from .launch_coordinator.agent import LaunchCoordinatorAgent, launch_coordinator_agent
from .legal_guardian.agent import LegalGuardianAgent, legal_guardian_agent
from .market_intelligence.agent import (
    MarketIntelligenceAgent,
    market_intelligence_agent,
)
from .pricing_strategist.agent import PricingStrategistAgent, pricing_strategist_agent

__all__ = [
    "BrandStrategistAgent",
    "brand_strategist_agent",
    "CreativeDirectorAgent",
    "creative_director_agent",
    "DomainHunterAgent",
    "domain_hunter_agent",
    "LegalGuardianAgent",
    "legal_guardian_agent",
    "MarketIntelligenceAgent",
    "market_intelligence_agent",
    "PricingStrategistAgent",
    "pricing_strategist_agent",
    "LaunchCoordinatorAgent",
    "launch_coordinator_agent",
]
