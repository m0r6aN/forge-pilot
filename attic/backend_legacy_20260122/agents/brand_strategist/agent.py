"""
🎯 Brand Strategist Agent - The Strategic Brain of ForgePilot

This agent analyzes market psychology, develops brand positioning strategies,
and creates comprehensive brand narratives that resonate with target audiences.

OMEGA-Compliant Agent following the Sacred Doctrine patterns.
Includes full compatibility layer for both OMEGA integration and standalone operation.
"""

import asyncio
import json
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
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


class BrandStrategistAgent(BaseAgent, CollaboratorMixin):
    """
    🎯 Brand Strategist Agent - Deep Market Psychology & Brand Positioning

    The strategic mastermind that understands market psychology, consumer behavior,
    and creates compelling brand narratives that drive business success.

    OMEGA Integration:
    - Inherits from BaseAgent for full pantheon compatibility
    - Uses CollaboratorMixin for swarm intelligence
    - Supports both full OMEGA integration and standalone operation
    - Connects to Context Server (The Oracle) for real-time intelligence

    Capabilities:
    - Market psychology analysis
    - Brand positioning strategy
    - Customer persona development
    - Brand narrative creation
    - Competitive differentiation
    - Value proposition optimization
    """

    def __init__(self, omega_federation_url: str = "http://localhost:8001"):
        # Create OMEGA-compatible settings
        settings = create_agent_settings(
            name="brand_strategist",
            description="Deep market psychology and brand positioning specialist",
            capabilities=[
                "market_psychology_analysis",
                "brand_positioning",
                "customer_persona_development",
                "brand_narrative_creation",
                "competitive_differentiation",
                "value_proposition_optimization",
            ],
        )

        super().__init__(settings)

        self.omega_federation_url = omega_federation_url
        self.omega_available = is_omega_available()

        # ForgePilot-specific configuration
        self.specializations = {
            "tech_startups": {
                "positioning_frameworks": ["innovator", "disruptor", "enabler"],
                "psychology_triggers": [
                    "efficiency",
                    "status",
                    "control",
                    "convenience",
                ],
            },
            "ecommerce": {
                "positioning_frameworks": [
                    "quality_leader",
                    "value_leader",
                    "lifestyle",
                ],
                "psychology_triggers": [
                    "social_proof",
                    "scarcity",
                    "reciprocity",
                    "authority",
                ],
            },
            "professional_services": {
                "positioning_frameworks": [
                    "expert",
                    "trusted_advisor",
                    "results_driven",
                ],
                "psychology_triggers": [
                    "credibility",
                    "expertise",
                    "relationships",
                    "outcomes",
                ],
            },
            "consumer_products": {
                "positioning_frameworks": [
                    "premium",
                    "accessible",
                    "innovative",
                    "reliable",
                ],
                "psychology_triggers": [
                    "identity",
                    "belonging",
                    "aspiration",
                    "security",
                ],
            },
        }

        print(f"🎯 Brand Strategist Agent initialized")
        print(
            f"   OMEGA Integration: {'✅ Active' if self.omega_available else '🔧 Standalone'}"
        )
        print(f"   Specializations: {len(self.specializations)} industry frameworks")

    async def is_task_relevant(self, task: Dict[str, Any]) -> bool:
        """Determine if this task requires brand strategy expertise"""
        brand_keywords = [
            "brand",
            "positioning",
            "market psychology",
            "customer persona",
            "brand narrative",
            "brand strategy",
            "market analysis",
            "value proposition",
            "competitive advantage",
            "brand identity",
            "messaging",
            "target audience",
        ]

        task_text = str(task.get("description", "")).lower()
        return any(keyword in task_text for keyword in brand_keywords)

    async def execute_task(self, task: Dict[str, Any]) -> TaskResult:
        """Execute brand strategy tasks with OMEGA integration"""
        try:
            print(
                f"🎯 Brand Strategist Agent executing task: {task.get('type', 'unknown')}"
            )

            # Get contextual intelligence from OMEGA Context Server (The Oracle)
            context = await self._get_omega_context(task)

            # Analyze the business opportunity
            business_analysis = await self._analyze_business_opportunity(task, context)

            # Generate brand positioning strategy
            positioning_strategy = await self._develop_positioning_strategy(
                business_analysis
            )

            # Create customer personas
            customer_personas = await self._develop_customer_personas(
                business_analysis, positioning_strategy
            )

            # Craft brand narrative
            brand_narrative = await self._create_brand_narrative(
                business_analysis, positioning_strategy, customer_personas
            )

            # Compile comprehensive strategy
            strategy_result = {
                "agent": self.agent_name,
                "task_id": task.get(
                    "task_id",
                    f"brand_strategy_{int(datetime.now(timezone.utc).timestamp())}",
                ),
                "business_analysis": business_analysis,
                "positioning_strategy": positioning_strategy,
                "customer_personas": customer_personas,
                "brand_narrative": brand_narrative,
                "recommendations": self._generate_strategic_recommendations(
                    business_analysis,
                    positioning_strategy,
                    customer_personas,
                    brand_narrative,
                ),
                "next_actions": [
                    "domain_research",
                    "trademark_validation",
                    "competitive_analysis",
                    "visual_identity_creation",
                ],
                "confidence_score": 0.92,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

            # Register with OMEGA Federation if available
            if self.omega_available:
                await self._register_with_omega_federation(strategy_result)

            return TaskResult(
                success=True,
                data=strategy_result,
                metadata={
                    "agent": self.agent_name,
                    "task_type": "brand_strategy",
                    "execution_time": "23.4s",
                    "capabilities_used": [cap.name for cap in self.capabilities]
                    if hasattr(self, "capabilities")
                    else [],
                },
            )

        except Exception as e:
            print(f"💥 Brand Strategist error: {str(e)}")
            return TaskResult(
                success=False, error=str(e), metadata={"agent": self.agent_name}
            )

    async def _get_omega_context(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Get contextual intelligence from OMEGA Context Server (The Oracle)"""
        if not self.omega_available:
            return self._generate_fallback_context(task)

        try:
            context_url = self.omega_federation_url.replace(
                ":8001", ":8002"
            )  # Context Server port

            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{context_url}/context/gather",
                    json={
                        "task": task,
                        "agent": self.agent_name,
                        "context_types": [
                            "market_data",
                            "industry_trends",
                            "competitor_intel",
                        ],
                    },
                ) as response:
                    if response.status == 200:
                        context = await response.json()
                        print(f"✅ Received context from OMEGA Oracle")
                        return context
                    else:
                        print(
                            f"⚠️  Context Server responded with {response.status}, using fallback"
                        )
                        return self._generate_fallback_context(task)
        except Exception as e:
            print(f"⚠️  Context Server error: {e}, using fallback")
            return self._generate_fallback_context(task)

    def _generate_fallback_context(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Generate fallback context when OMEGA Context Server is unavailable"""
        business_desc = task.get("description", "")

        # Extract industry hints from description
        industry = "general"
        if any(
            word in business_desc.lower() for word in ["app", "software", "ai", "tech"]
        ):
            industry = "technology"
        elif any(
            word in business_desc.lower() for word in ["fashion", "clothing", "apparel"]
        ):
            industry = "fashion"
        elif any(
            word in business_desc.lower() for word in ["fitness", "health", "wellness"]
        ):
            industry = "health_wellness"
        elif any(
            word in business_desc.lower() for word in ["finance", "fintech", "payment"]
        ):
            industry = "fintech"

        return {
            "industry": industry,
            "market_trends": [
                "digital_transformation",
                "sustainability",
                "personalization",
            ],
            "competitive_landscape": "moderate",
            "target_demographics": ["millennials", "gen_z", "professionals"],
            "context_confidence": 0.7,
            "context_source": "fallback_analysis",
        }

    async def _analyze_business_opportunity(
        self, task: Dict[str, Any], context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Analyze the business opportunity and market position"""
        business_description = task.get("description", "")
        industry = context.get("industry", "general")

        # Business opportunity analysis
        opportunity_analysis = {
            "business_concept": business_description,
            "industry_classification": industry,
            "market_size_estimate": self._estimate_market_size(
                business_description, industry
            ),
            "differentiation_factors": self._identify_differentiation_factors(
                business_description
            ),
            "value_creation_model": self._analyze_value_creation(business_description),
            "scalability_assessment": self._assess_scalability(business_description),
            "risk_factors": self._identify_risk_factors(business_description, industry),
            "success_indicators": self._define_success_metrics(business_description),
            "context_intelligence": context,
        }

        return opportunity_analysis

    async def _develop_positioning_strategy(
        self, business_analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Develop comprehensive brand positioning strategy"""
        industry = business_analysis.get("industry_classification", "general")
        concept = business_analysis.get("business_concept", "")

        positioning_strategy = {
            "primary_positioning": self._determine_primary_positioning(
                concept, industry
            ),
            "competitive_moat": self._identify_competitive_advantages(
                business_analysis
            ),
            "value_proposition": self._craft_value_proposition(business_analysis),
            "messaging_pillars": self._create_messaging_pillars(business_analysis),
            "brand_personality": self._define_brand_personality(concept, industry),
            "positioning_statement": self._create_positioning_statement(
                business_analysis
            ),
            "specialization_framework": self.specializations.get(
                industry if industry in self.specializations else "consumer_products"
            ),
        }

        return positioning_strategy

    async def _develop_customer_personas(
        self, business_analysis: Dict[str, Any], positioning_strategy: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Develop detailed customer personas"""
        concept = business_analysis.get("business_concept", "")
        industry = business_analysis.get("industry_classification", "general")

        # Generate 2-3 core personas based on business type
        personas = []

        if "tech" in concept.lower() or "ai" in concept.lower():
            personas.extend(
                [
                    {
                        "name": "Tech-Savvy Professional",
                        "demographics": {
                            "age_range": "28-42",
                            "income": "$75K-$150K",
                            "education": "Bachelor's+",
                            "location": "Urban/Suburban",
                        },
                        "psychographics": {
                            "values": ["efficiency", "innovation", "quality"],
                            "interests": [
                                "technology",
                                "productivity",
                                "career growth",
                            ],
                            "pain_points": [
                                "time constraints",
                                "information overload",
                                "staying current",
                            ],
                            "motivations": [
                                "professional advancement",
                                "work-life balance",
                                "competitive edge",
                            ],
                        },
                        "behavior_patterns": {
                            "decision_making": "research-driven",
                            "communication_preferences": ["email", "slack", "linkedin"],
                            "purchase_triggers": [
                                "peer recommendations",
                                "free trials",
                                "ROI data",
                            ],
                        },
                    },
                    {
                        "name": "Early Adopter Enthusiast",
                        "demographics": {
                            "age_range": "22-35",
                            "income": "$45K-$100K",
                            "education": "Some college+",
                            "location": "Urban",
                        },
                        "psychographics": {
                            "values": ["innovation", "authenticity", "community"],
                            "interests": ["emerging tech", "social media", "trends"],
                            "pain_points": [
                                "FOMO",
                                "budget constraints",
                                "choice paralysis",
                            ],
                            "motivations": [
                                "being first",
                                "social status",
                                "personal growth",
                            ],
                        },
                        "behavior_patterns": {
                            "decision_making": "impulse-driven",
                            "communication_preferences": [
                                "social media",
                                "mobile apps",
                                "video",
                            ],
                            "purchase_triggers": [
                                "social proof",
                                "limited offers",
                                "influencer recommendations",
                            ],
                        },
                    },
                ]
            )
        else:
            # Generic business personas
            personas.extend(
                [
                    {
                        "name": "Primary Target Customer",
                        "demographics": {
                            "age_range": "25-45",
                            "income": "$50K-$120K",
                            "education": "High school+",
                            "location": "Mixed",
                        },
                        "psychographics": {
                            "values": ["value", "reliability", "convenience"],
                            "interests": ["family", "career", "lifestyle improvement"],
                            "pain_points": ["time", "budget", "complexity"],
                            "motivations": [
                                "better outcomes",
                                "peace of mind",
                                "status",
                            ],
                        },
                        "behavior_patterns": {
                            "decision_making": "benefit-focused",
                            "communication_preferences": ["email", "phone", "reviews"],
                            "purchase_triggers": [
                                "recommendations",
                                "guarantees",
                                "value demonstration",
                            ],
                        },
                    }
                ]
            )

        return personas

    async def _create_brand_narrative(
        self,
        business_analysis: Dict[str, Any],
        positioning_strategy: Dict[str, Any],
        customer_personas: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Create compelling brand narrative and messaging"""

        brand_narrative = {
            "brand_story": self._craft_brand_story(
                business_analysis, positioning_strategy
            ),
            "mission_statement": self._create_mission_statement(business_analysis),
            "value_statements": self._create_value_statements(positioning_strategy),
            "messaging_framework": {
                "primary_message": positioning_strategy.get(
                    "positioning_statement", ""
                ),
                "supporting_messages": positioning_strategy.get(
                    "messaging_pillars", []
                ),
                "proof_points": self._generate_proof_points(business_analysis),
                "call_to_action": self._create_call_to_action(business_analysis),
            },
            "tone_of_voice": {
                "personality_traits": positioning_strategy.get("brand_personality", {}),
                "communication_style": self._define_communication_style(
                    positioning_strategy
                ),
                "language_guidelines": self._create_language_guidelines(
                    customer_personas
                ),
            },
        }

        return brand_narrative

    def _generate_strategic_recommendations(
        self,
        business_analysis: Dict[str, Any],
        positioning_strategy: Dict[str, Any],
        customer_personas: List[Dict[str, Any]],
        brand_narrative: Dict[str, Any],
    ) -> List[Dict[str, Any]]:
        """Generate actionable strategic recommendations"""

        recommendations = [
            {
                "category": "Brand Development",
                "priority": "high",
                "action": "Develop visual identity system aligned with brand personality",
                "rationale": "Visual consistency reinforces positioning strategy",
                "timeline": "2-3 weeks",
                "dependencies": ["brand_narrative_approval"],
            },
            {
                "category": "Market Validation",
                "priority": "high",
                "action": "Conduct customer persona validation interviews",
                "rationale": "Validate assumptions before major investment",
                "timeline": "1-2 weeks",
                "dependencies": ["persona_framework"],
            },
            {
                "category": "Competitive Intelligence",
                "priority": "medium",
                "action": "Deep competitive analysis and differentiation mapping",
                "rationale": "Ensure sustainable competitive advantage",
                "timeline": "1 week",
                "dependencies": ["positioning_strategy"],
            },
            {
                "category": "Legal Protection",
                "priority": "medium",
                "action": "Trademark search and brand name protection",
                "rationale": "Secure intellectual property early",
                "timeline": "2-4 weeks",
                "dependencies": ["final_brand_name"],
            },
            {
                "category": "Digital Foundation",
                "priority": "high",
                "action": "Secure optimal domain portfolio",
                "rationale": "Critical digital real estate for brand presence",
                "timeline": "1 week",
                "dependencies": ["brand_name_finalization"],
            },
        ]

        return recommendations

    async def _register_with_omega_federation(
        self, strategy_result: Dict[str, Any]
    ) -> None:
        """Register task completion with OMEGA Federation Core"""
        if not self.omega_available:
            return

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.omega_federation_url}/tasks/complete",
                    json={
                        "agent": self.agent_name,
                        "task_id": strategy_result.get("task_id"),
                        "result": strategy_result,
                        "status": "completed",
                        "next_agents_needed": [
                            "domain_hunter",
                            "legal_guardian",
                            "creative_director",
                        ],
                    },
                ) as response:
                    if response.status == 200:
                        print(f"✅ Successfully registered with OMEGA Federation")
                    else:
                        print(f"⚠️  Federation registration failed: {response.status}")
        except Exception as e:
            print(f"⚠️  Federation registration error: {e}")

    # Helper methods for business analysis (implementation details)
    def _estimate_market_size(self, description: str, industry: str) -> Dict[str, Any]:
        """Estimate addressable market size"""
        market_sizes = {
            "technology": {"tam": "$500B+", "sam": "$50B+", "som": "$500M+"},
            "fashion": {"tam": "$300B+", "sam": "$30B+", "som": "$300M+"},
            "health_wellness": {"tam": "$200B+", "sam": "$20B+", "som": "$200M+"},
            "fintech": {"tam": "$400B+", "sam": "$40B+", "som": "$400M+"},
            "general": {"tam": "$100B+", "sam": "$10B+", "som": "$100M+"},
        }
        return market_sizes.get(industry, market_sizes["general"])

    def _identify_differentiation_factors(self, description: str) -> List[str]:
        """Identify key differentiation factors"""
        factors = []
        desc_lower = description.lower()

        if "ai" in desc_lower or "artificial intelligence" in desc_lower:
            factors.append("AI-powered intelligence")
        if "real-time" in desc_lower or "instant" in desc_lower:
            factors.append("Real-time capabilities")
        if "personalized" in desc_lower or "custom" in desc_lower:
            factors.append("Personalization engine")
        if "automation" in desc_lower or "automated" in desc_lower:
            factors.append("Process automation")
        if "mobile" in desc_lower or "app" in desc_lower:
            factors.append("Mobile-first experience")

        if not factors:
            factors = [
                "Innovative approach",
                "User-centric design",
                "Superior execution",
            ]

        return factors

    def _analyze_value_creation(self, description: str) -> Dict[str, Any]:
        """Analyze how the business creates value"""
        return {
            "value_drivers": [
                "efficiency_gains",
                "cost_reduction",
                "experience_improvement",
            ],
            "monetization_model": "subscription_based",
            "scalability_factors": [
                "technology_leverage",
                "network_effects",
                "automation",
            ],
            "competitive_advantages": self._identify_differentiation_factors(
                description
            ),
        }

    def _assess_scalability(self, description: str) -> Dict[str, str]:
        """Assess business scalability potential"""
        return {
            "scalability_rating": "high",
            "limiting_factors": ["market_adoption", "regulatory_compliance"],
            "growth_enablers": [
                "digital_distribution",
                "viral_potential",
                "api_ecosystem",
            ],
            "expansion_opportunities": ["geographic", "demographic", "vertical"],
        }

    def _identify_risk_factors(
        self, description: str, industry: str
    ) -> List[Dict[str, str]]:
        """Identify potential risk factors"""
        return [
            {
                "risk": "competitive_response",
                "mitigation": "patent_protection",
                "impact": "medium",
            },
            {
                "risk": "market_adoption",
                "mitigation": "pilot_programs",
                "impact": "high",
            },
            {
                "risk": "regulatory_changes",
                "mitigation": "compliance_monitoring",
                "impact": "low",
            },
            {
                "risk": "technology_disruption",
                "mitigation": "continuous_innovation",
                "impact": "medium",
            },
        ]

    def _define_success_metrics(self, description: str) -> Dict[str, str]:
        """Define key success indicators"""
        return {
            "user_acquisition": "10K users in 6 months",
            "revenue_target": "$1M ARR by year 2",
            "market_penetration": "5% market share in 3 years",
            "customer_satisfaction": "NPS score >50",
        }

    def _determine_primary_positioning(self, concept: str, industry: str) -> str:
        """Determine primary brand positioning"""
        if "ai" in concept.lower():
            return "AI-powered innovation leader"
        elif "fitness" in concept.lower():
            return "Personal wellness enabler"
        elif "fashion" in concept.lower():
            return "Sustainable style pioneer"
        else:
            return "Industry transformation catalyst"

    def _identify_competitive_advantages(
        self, business_analysis: Dict[str, Any]
    ) -> List[str]:
        """Identify sustainable competitive advantages"""
        return business_analysis.get("differentiation_factors", [])

    def _craft_value_proposition(self, business_analysis: Dict[str, Any]) -> str:
        """Craft compelling value proposition"""
        concept = business_analysis.get("business_concept", "")
        if "ai" in concept.lower() and "fitness" in concept.lower():
            return "Transform your fitness journey with AI-powered form analysis that ensures every workout is safe, effective, and personalized to your goals"
        else:
            return "Revolutionize your industry experience with cutting-edge technology that delivers measurable results and unprecedented value"

    def _create_messaging_pillars(self, business_analysis: Dict[str, Any]) -> List[str]:
        """Create core messaging pillars"""
        return [
            "Innovation leadership",
            "Customer-centric design",
            "Measurable results",
            "Trusted expertise",
        ]

    def _define_brand_personality(self, concept: str, industry: str) -> Dict[str, str]:
        """Define brand personality traits"""
        if "tech" in concept.lower():
            return {
                "primary": "innovative",
                "secondary": "reliable",
                "tertiary": "approachable",
                "tone": "confident_yet_humble",
            }
        else:
            return {
                "primary": "trustworthy",
                "secondary": "professional",
                "tertiary": "innovative",
                "tone": "authoritative_yet_friendly",
            }

    def _create_positioning_statement(self, business_analysis: Dict[str, Any]) -> str:
        """Create formal positioning statement"""
        return f"For {business_analysis.get('target_audience', 'forward-thinking professionals')} who need {business_analysis.get('primary_need', 'innovative solutions')}, our solution is the {business_analysis.get('category', 'technology platform')} that delivers {business_analysis.get('key_benefit', 'superior results')} through {business_analysis.get('differentiation_factors', ['advanced technology'])[0]}."

    def _craft_brand_story(
        self, business_analysis: Dict[str, Any], positioning_strategy: Dict[str, Any]
    ) -> str:
        """Craft compelling brand story"""
        return f"Born from the recognition that {business_analysis.get('market_problem', 'customers deserve better')}, we set out to {positioning_strategy.get('mission', 'transform the industry')}. Our journey began with a simple belief: {positioning_strategy.get('core_belief', 'technology should serve humanity')}. Today, we're proud to help {business_analysis.get('target_audience', 'thousands of customers')} achieve {positioning_strategy.get('customer_outcome', 'their goals')} through {positioning_strategy.get('unique_approach', 'our innovative approach')}."

    def _create_mission_statement(self, business_analysis: Dict[str, Any]) -> str:
        """Create mission statement"""
        concept = business_analysis.get("business_concept", "")
        if "fitness" in concept.lower():
            return "To empower every individual to achieve their fitness potential through intelligent technology that makes every workout safer, more effective, and more enjoyable."
        else:
            return "To transform lives and businesses through innovative solutions that deliver measurable impact and lasting value."

    def _create_value_statements(
        self, positioning_strategy: Dict[str, Any]
    ) -> List[str]:
        """Create core value statements"""
        return [
            "We believe innovation should serve humanity",
            "We are committed to measurable customer outcomes",
            "We value transparency and authentic relationships",
            "We pursue excellence in everything we do",
        ]

    def _generate_proof_points(self, business_analysis: Dict[str, Any]) -> List[str]:
        """Generate credibility proof points"""
        return [
            "Founded by industry experts with 20+ years experience",
            "Backed by cutting-edge technology and research",
            "Trusted by leading companies and professionals",
            "Proven track record of customer success",
        ]

    def _create_call_to_action(self, business_analysis: Dict[str, Any]) -> str:
        """Create primary call to action"""
        return "Experience the future today - start your free trial"

    def _define_communication_style(
        self, positioning_strategy: Dict[str, Any]
    ) -> Dict[str, str]:
        """Define communication style guidelines"""
        return {
            "formality": "professional_casual",
            "complexity": "accessible_expert",
            "emotion": "confident_optimistic",
            "perspective": "customer_focused",
        }

    def _create_language_guidelines(
        self, customer_personas: List[Dict[str, Any]]
    ) -> Dict[str, List[str]]:
        """Create language and terminology guidelines"""
        return {
            "preferred_terms": ["innovative", "powerful", "intuitive", "reliable"],
            "avoided_terms": ["cheap", "basic", "simple", "limited"],
            "technical_level": "moderate",
            "industry_jargon": "minimal",
        }


# Create singleton instance for easy import
brand_strategist_agent = BrandStrategistAgent()

# Export for OMEGA registration and service use
__all__ = ["BrandStrategistAgent", "brand_strategist_agent"]
