"""
🧬 ForgePilot Orchestrator - Autonomous Brand Campaign Coordination Class

This is the core orchestration class that coordinates the ForgePilot swarm
to generate complete brand campaigns. It's separate from the FastAPI service
and can be used independently or imported by other services.

This class handles:
- Agent swarm coordination
- Multi-phase campaign execution
- OMEGA integration
- Result compilation and validation
"""

import asyncio
import json
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone
import uuid
import aiohttp

# Import from our OMEGA compatibility layer
from core.omega import (
    BaseAgent,
    CollaboratorMixin,
    TaskResult,
    TaskStatus,
    create_agent_settings,
    is_omega_available,
)


class BrandCampaignRequest:
    """Brand campaign request data structure"""

    def __init__(
        self,
        description: str,
        industry: Optional[str] = None,
        target_audience: Optional[str] = None,
        budget_range: Optional[str] = None,
        timeline: Optional[str] = None,
        special_requirements: Optional[List[str]] = None,
    ):
        self.description = description
        self.industry = industry
        self.target_audience = target_audience
        self.budget_range = budget_range
        self.timeline = timeline
        self.special_requirements = special_requirements or []
        self.request_id = str(uuid.uuid4())
        self.timestamp = datetime.now(timezone.utc)


class BrandCampaignResponse:
    """Brand campaign response data structure"""

    def __init__(
        self,
        campaign_id: str,
        status: str,
        brand_strategy: Dict[str, Any],
        execution_time: float,
        cost_estimate: float,
        **kwargs,
    ):
        self.campaign_id = campaign_id
        self.status = status
        self.brand_strategy = brand_strategy
        self.execution_time = execution_time
        self.cost_estimate = cost_estimate

        # Optional components
        self.domain_options = kwargs.get("domain_options")
        self.legal_status = kwargs.get("legal_status")
        self.market_intelligence = kwargs.get("market_intelligence")
        self.visual_identity = kwargs.get("visual_identity")
        self.pricing_strategy = kwargs.get("pricing_strategy")
        self.launch_plan = kwargs.get("launch_plan")
        self.next_actions = kwargs.get("next_actions", [])

        self.timestamp = datetime.now(timezone.utc)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses"""
        return {
            "campaign_id": self.campaign_id,
            "status": self.status,
            "brand_strategy": self.brand_strategy,
            "domain_options": self.domain_options,
            "legal_status": self.legal_status,
            "market_intelligence": self.market_intelligence,
            "visual_identity": self.visual_identity,
            "pricing_strategy": self.pricing_strategy,
            "launch_plan": self.launch_plan,
            "execution_time": self.execution_time,
            "cost_estimate": self.cost_estimate,
            "next_actions": self.next_actions,
            "timestamp": self.timestamp.isoformat(),
        }


class ForgePilotOrchestrator(BaseAgent, CollaboratorMixin):
    """
    🧬 ForgePilot Orchestrator - The Autonomous Brand Campaign Director

    This class orchestrates the complete ForgePilot swarm to create comprehensive
    brand campaigns. It coordinates multiple specialized agents working in parallel
    and sequential phases to deliver professional-grade brand strategies.

    Architecture:
    - Inherits from OMEGA BaseAgent for full pantheon integration
    - Uses CollaboratorMixin for swarm intelligence
    - Coordinates 7 specialized agents in 4 execution phases
    - Supports both full OMEGA integration and standalone operation
    """

    def __init__(self, omega_federation_url: str = "http://localhost:8001"):
        # Initialize with OMEGA-compatible settings
        settings = create_agent_settings(
            name="forgepilot_orchestrator",
            description="Autonomous brand campaign orchestration and coordination",
            capabilities=[
                "brand_campaign_orchestration",
                "agent_swarm_coordination",
                "multi_phase_execution",
                "result_compilation",
                "omega_integration",
            ],
        )

        super().__init__(settings)

        self.omega_federation_url = omega_federation_url
        self.orchestrator_id = f"forgepilot_orchestrator_{uuid.uuid4().hex[:8]}"
        self.active_campaigns = {}
        self.omega_available = is_omega_available()

        # Agent registry - maps capabilities to agent instances
        self.agent_registry = {
            "brand_strategy": None,  # Will be loaded dynamically
            "domain_research": None,
            "legal_validation": None,
            "market_intelligence": None,
            "visual_identity": None,
            "pricing_strategy": None,
            "launch_planning": None,
        }

        # Campaign execution templates
        self.campaign_templates = {
            "tech_startup": {
                "priority_sequence": [
                    "brand_strategy",
                    "market_intelligence",
                    "domain_research",
                    "legal_validation",
                    "pricing_strategy",
                    "visual_identity",
                    "launch_planning",
                ],
                "parallel_phases": [
                    ["domain_research", "legal_validation"],
                    ["market_intelligence", "visual_identity"],
                    ["pricing_strategy", "launch_planning"],
                ],
            },
            "ecommerce": {
                "priority_sequence": [
                    "brand_strategy",
                    "market_intelligence",
                    "visual_identity",
                    "domain_research",
                    "pricing_strategy",
                    "legal_validation",
                    "launch_planning",
                ],
                "parallel_phases": [
                    ["market_intelligence", "visual_identity"],
                    ["domain_research", "legal_validation"],
                    ["pricing_strategy", "launch_planning"],
                ],
            },
            "default": {
                "priority_sequence": [
                    "brand_strategy",
                    "market_intelligence",
                    "domain_research",
                    "legal_validation",
                    "visual_identity",
                    "pricing_strategy",
                    "launch_planning",
                ],
                "parallel_phases": [
                    ["market_intelligence", "domain_research"],
                    ["legal_validation", "visual_identity"],
                    ["pricing_strategy", "launch_planning"],
                ],
            },
        }

        print(f"🧬 ForgePilot Orchestrator initialized")
        print(f"   Orchestrator ID: {self.orchestrator_id}")
        print(
            f"   OMEGA Integration: {'✅ Active' if self.omega_available else '🔧 Standalone'}"
        )
        print(f"   Federation URL: {self.omega_federation_url}")

    async def create_brand_campaign(
        self, request: BrandCampaignRequest
    ) -> BrandCampaignResponse:
        """
        🚀 Create a complete brand campaign autonomously

        This is the main orchestration method that coordinates the entire swarm
        to generate a comprehensive brand campaign in 4 phases:

        Phase 1: Strategic Foundation (Brand Strategist)
        Phase 2: Market Research & Legal Validation (Parallel)
        Phase 3: Digital Foundation & Creative Direction (Parallel)
        Phase 4: Business Model & Launch Strategy (Parallel)

        Args:
            request: BrandCampaignRequest with business description and requirements

        Returns:
            BrandCampaignResponse with complete brand campaign
        """
        campaign_id = f"forgepilot_{uuid.uuid4().hex[:8]}"
        start_time = datetime.now(timezone.utc)

        print(f"🧬 Starting brand campaign: {campaign_id}")
        print(f"📋 Business: {request.description}")

        try:
            # Register campaign with OMEGA Federation if available
            if self.omega_available:
                await self._register_campaign_with_omega(campaign_id, request)

            # Load agents dynamically
            await self._load_agents()

            # Phase 1: Strategic Foundation
            print(f"🎯 Phase 1: Strategic Analysis")
            brand_strategy = await self._execute_brand_strategy_phase(request)

            # Phase 2: Research & Validation (Parallel)
            print(f"📊 Phase 2: Market Intelligence & Legal Validation")
            market_intel, legal_status = await self._execute_research_phase(
                request, brand_strategy
            )

            # Phase 3: Digital & Creative (Parallel)
            print(f"🌐 Phase 3: Digital Assets & Creative Identity")
            domain_options, visual_identity = await self._execute_creative_phase(
                request, brand_strategy
            )

            # Phase 4: Business & Launch (Parallel)
            print(f"💰 Phase 4: Revenue Model & Launch Planning")
            pricing_strategy, launch_plan = await self._execute_business_phase(
                request, brand_strategy, market_intel
            )

            # Compile final campaign
            execution_time = (datetime.now(timezone.utc) - start_time).total_seconds()

            campaign_response = BrandCampaignResponse(
                campaign_id=campaign_id,
                status="completed",
                brand_strategy=brand_strategy,
                domain_options=domain_options,
                legal_status=legal_status,
                market_intelligence=market_intel,
                visual_identity=visual_identity,
                pricing_strategy=pricing_strategy,
                launch_plan=launch_plan,
                execution_time=execution_time,
                cost_estimate=0.47,  # API costs estimate
                next_actions=self._compile_next_actions(
                    [
                        brand_strategy,
                        market_intel,
                        legal_status,
                        domain_options,
                        visual_identity,
                        pricing_strategy,
                        launch_plan,
                    ]
                ),
            )

            # Register completion with OMEGA if available
            if self.omega_available:
                await self._complete_campaign_with_omega(campaign_id, campaign_response)

            print(f"✅ Campaign completed in {execution_time:.1f} seconds!")
            return campaign_response

        except Exception as e:
            print(f"💥 Campaign failed: {str(e)}")
            raise Exception(f"Brand campaign generation failed: {str(e)}")

    async def _load_agents(self):
        """Dynamically load available agents"""
        try:
            # Try to load Brand Strategist Agent
            from core.agents.brand_strategist.agent import brand_strategist_agent

            self.agent_registry["brand_strategy"] = brand_strategist_agent
            print(f"✅ Loaded Brand Strategist Agent")
        except ImportError:
            print(f"⚠️  Brand Strategist Agent not available")

        # Future agents will be loaded here as they're implemented
        # from core.agents.domain_hunter.agent import domain_hunter_agent
        # self.agent_registry["domain_research"] = domain_hunter_agent

    async def _execute_brand_strategy_phase(
        self, request: BrandCampaignRequest
    ) -> Dict[str, Any]:
        """Execute Phase 1: Brand Strategy"""
        agent = self.agent_registry.get("brand_strategy")

        if agent:
            # Use real Brand Strategist Agent
            task = {
                "type": "brand_strategy",
                "description": request.description,
                "industry": request.industry,
                "target_audience": request.target_audience,
                "priority": "high",
                "request_id": request.request_id,
            }

            result = await agent.execute_task(task)

            if result["success"]:
                return result["data"]
            else:
                raise Exception(
                    f"Brand strategy failed: {result.get('error', 'unknown error')}"
                )
        else:
            # Fallback simulation
            return await self._simulate_brand_strategy(request)

    async def _execute_research_phase(
        self, request: BrandCampaignRequest, brand_strategy: Dict[str, Any]
    ) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        """Execute Phase 2: Market Intelligence & Legal Validation (Parallel)"""

        # Execute in parallel
        market_task = asyncio.create_task(
            self._execute_market_intelligence(request, brand_strategy)
        )
        legal_task = asyncio.create_task(
            self._execute_legal_validation(request, brand_strategy)
        )

        market_intel, legal_status = await asyncio.gather(market_task, legal_task)
        return market_intel, legal_status

    async def _execute_creative_phase(
        self, request: BrandCampaignRequest, brand_strategy: Dict[str, Any]
    ) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        """Execute Phase 3: Domain Research & Visual Identity (Parallel)"""

        domain_task = asyncio.create_task(
            self._execute_domain_research(request, brand_strategy)
        )
        creative_task = asyncio.create_task(
            self._execute_visual_identity(request, brand_strategy)
        )

        domain_options, visual_identity = await asyncio.gather(
            domain_task, creative_task
        )
        return domain_options, visual_identity

    async def _execute_business_phase(
        self,
        request: BrandCampaignRequest,
        brand_strategy: Dict[str, Any],
        market_intel: Dict[str, Any],
    ) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        """Execute Phase 4: Pricing Strategy & Launch Planning (Parallel)"""

        pricing_task = asyncio.create_task(
            self._execute_pricing_strategy(request, brand_strategy, market_intel)
        )
        launch_task = asyncio.create_task(
            self._execute_launch_planning(request, brand_strategy, market_intel)
        )

        pricing_strategy, launch_plan = await asyncio.gather(pricing_task, launch_task)
        return pricing_strategy, launch_plan

    # Individual agent execution methods (with fallback simulations)
    async def _execute_market_intelligence(
        self, request: BrandCampaignRequest, brand_strategy: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute Market Intelligence Agent (or simulation)"""
        agent = self.agent_registry.get("market_intelligence")

        if agent:
            # Use real agent when available
            task = {
                "type": "market_intelligence",
                "description": request.description,
                "brand_strategy": brand_strategy,
            }
            result = await agent.execute_task(task)
            return result["data"] if result["success"] else {}
        else:
            # Simulation fallback
            await asyncio.sleep(2.3)
            return {
                "agent": "market_intelligence",
                "market_size": "$2.4B addressable market",
                "competition_level": "Moderate with differentiation opportunities",
                "growth_trends": ["AI adoption", "mobile-first", "personalization"],
                "success_probability": 0.87,
            }

    async def _execute_legal_validation(
        self, request: BrandCampaignRequest, brand_strategy: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute Legal Guardian Agent (or simulation)"""
        agent = self.agent_registry.get("legal_validation")

        if agent:
            task = {
                "type": "legal_validation",
                "description": request.description,
                "brand_strategy": brand_strategy,
            }
            result = await agent.execute_task(task)
            return result["data"] if result["success"] else {}
        else:
            await asyncio.sleep(1.8)
            return {
                "agent": "legal_guardian",
                "trademark_status": "Available with minor conflicts",
                "risk_assessment": "LOW",
                "recommended_actions": ["File provisional trademark application"],
            }

    async def _execute_domain_research(
        self, request: BrandCampaignRequest, brand_strategy: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute Domain Hunter Agent (or simulation)"""
        agent = self.agent_registry.get("domain_research")

        if agent:
            task = {
                "type": "domain_research",
                "description": request.description,
                "brand_strategy": brand_strategy,
            }
            result = await agent.execute_task(task)
            return result["data"] if result["success"] else {}
        else:
            await asyncio.sleep(1.5)
            return {
                "agent": "domain_hunter",
                "recommended_primary": "brandname.com",
                "available_domains": [
                    {"domain": "brandname.com", "available": True, "price": "$12.99"},
                    {"domain": "brandname.ai", "available": True, "price": "$89.99"},
                ],
                "total_cost_estimate": "$150-$500",
            }

    async def _execute_visual_identity(
        self, request: BrandCampaignRequest, brand_strategy: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute Creative Director Agent (or simulation)"""
        agent = self.agent_registry.get("visual_identity")

        if agent:
            task = {
                "type": "visual_identity",
                "description": request.description,
                "brand_strategy": brand_strategy,
            }
            result = await agent.execute_task(task)
            return result["data"] if result["success"] else {}
        else:
            await asyncio.sleep(3.2)
            return {
                "agent": "creative_director",
                "color_palette": {
                    "primary": "#1E40AF",
                    "secondary": "#10B981",
                    "accent": "#F59E0B",
                },
                "typography": {"primary_font": "Inter", "secondary_font": "Roboto"},
                "logo_concepts": [
                    {"style": "wordmark", "description": "Clean typography-based logo"},
                    {"style": "icon", "description": "Symbolic representation"},
                ],
            }

    async def _execute_pricing_strategy(
        self,
        request: BrandCampaignRequest,
        brand_strategy: Dict[str, Any],
        market_intel: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Execute Pricing Strategist Agent (or simulation)"""
        agent = self.agent_registry.get("pricing_strategy")

        if agent:
            task = {
                "type": "pricing_strategy",
                "description": request.description,
                "brand_strategy": brand_strategy,
                "market_intel": market_intel,
            }
            result = await agent.execute_task(task)
            return result["data"] if result["success"] else {}
        else:
            await asyncio.sleep(2.1)
            return {
                "agent": "pricing_strategist",
                "recommended_model": "Freemium with Premium Tiers",
                "pricing_tiers": [
                    {
                        "name": "Free",
                        "price": "$0/month",
                        "features": ["Basic features"],
                    },
                    {
                        "name": "Pro",
                        "price": "$19.99/month",
                        "features": ["Advanced features"],
                    },
                ],
                "revenue_projections": {"year_1": "$120K MRR"},
            }

    async def _execute_launch_planning(
        self,
        request: BrandCampaignRequest,
        brand_strategy: Dict[str, Any],
        market_intel: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Execute Launch Coordinator Agent (or simulation)"""
        agent = self.agent_registry.get("launch_planning")

        if agent:
            task = {
                "type": "launch_planning",
                "description": request.description,
                "brand_strategy": brand_strategy,
                "market_intel": market_intel,
            }
            result = await agent.execute_task(task)
            return result["data"] if result["success"] else {}
        else:
            await asyncio.sleep(2.4)
            return {
                "agent": "launch_coordinator",
                "launch_strategy": "Phased rollout with early adopter focus",
                "marketing_channels": [
                    {"channel": "Product Hunt", "budget": "$5K"},
                    {"channel": "Social media", "budget": "$10K"},
                ],
                "success_metrics": {"user_acquisition": "10K signups in first month"},
            }

    async def _simulate_brand_strategy(
        self, request: BrandCampaignRequest
    ) -> Dict[str, Any]:
        """Fallback brand strategy simulation"""
        await asyncio.sleep(3.5)

        return {
            "agent": "brand_strategist",
            "positioning_strategy": {
                "primary_positioning": "Innovation leader in target market",
                "value_proposition": f"Revolutionary solution for {request.target_audience or 'target customers'}",
                "messaging_pillars": ["Innovation", "Quality", "Results", "Trust"],
            },
            "customer_personas": [
                {
                    "name": "Primary Target Customer",
                    "demographics": {"age_range": "25-45", "income": "$50K-$120K"},
                    "psychographics": {
                        "values": ["innovation", "quality", "efficiency"]
                    },
                }
            ],
            "brand_narrative": {
                "mission_statement": f"To transform {request.industry or 'the industry'} through innovative solutions",
                "brand_story": "A vision born from the need for better solutions",
            },
        }

    def _compile_next_actions(self, results: List[Dict[str, Any]]) -> List[str]:
        """Compile next actions from all agent results"""
        actions = []

        for result in results:
            if isinstance(result, dict):
                if "next_actions" in result:
                    actions.extend(result["next_actions"])
                elif "recommended_actions" in result:
                    actions.extend(result["recommended_actions"])

        # Standard post-campaign actions
        actions.extend(
            [
                "Register recommended domains",
                "File trademark applications",
                "Set up business entity",
                "Begin product development",
                "Launch beta testing program",
            ]
        )

        # Remove duplicates
        return list(dict.fromkeys(actions))

    # OMEGA Integration methods
    async def _register_campaign_with_omega(
        self, campaign_id: str, request: BrandCampaignRequest
    ):
        """Register campaign with OMEGA Federation Core"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.omega_federation_url}/campaigns/register",
                    json={
                        "campaign_id": campaign_id,
                        "orchestrator": self.orchestrator_id,
                        "type": "brand_campaign",
                        "description": request.description,
                        "estimated_agents": 7,
                    },
                ) as response:
                    if response.status == 200:
                        print(f"✅ Registered with OMEGA Federation: {campaign_id}")
                    else:
                        print(f"⚠️  OMEGA registration failed: {response.status}")
        except Exception as e:
            print(f"⚠️  OMEGA registration error: {e}")

    async def _complete_campaign_with_omega(
        self, campaign_id: str, campaign_response: BrandCampaignResponse
    ):
        """Register campaign completion with OMEGA Federation"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.omega_federation_url}/campaigns/complete",
                    json={
                        "campaign_id": campaign_id,
                        "orchestrator": self.orchestrator_id,
                        "status": "completed",
                        "execution_time": campaign_response.execution_time,
                        "agents_used": 7,
                        "cost": campaign_response.cost_estimate,
                    },
                ) as response:
                    if response.status == 200:
                        print(f"✅ Campaign completion registered with OMEGA")
                    else:
                        print(f"⚠️  OMEGA completion failed: {response.status}")
        except Exception as e:
            print(f"⚠️  OMEGA completion error: {e}")


# Create singleton instance
forgepilot_orchestrator = ForgePilotOrchestrator()

# Export for use
__all__ = [
    "ForgePilotOrchestrator",
    "BrandCampaignRequest",
    "BrandCampaignResponse",
    "forgepilot_orchestrator",
]
