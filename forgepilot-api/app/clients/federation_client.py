"""Federation Core HTTP client."""

import httpx
from typing import Optional, Any
from uuid import UUID
import logging

from ..config import get_settings

logger = logging.getLogger(__name__)


class FederationClient:
    """Client for Federation Core API."""

    def __init__(self):
        """Initialize Federation Core client."""
        self.settings = get_settings()
        self.base_url = self.settings.federation_url
        self.timeout = self.settings.federation_timeout

    async def health_check(self) -> bool:
        """Check Federation Core health."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.base_url}/health")
                return response.status_code == 200
        except Exception as e:
            logger.error(f"Federation health check failed: {e}")
            return False

    async def create_conversation(
        self,
        mission: dict[str, Any],
        correlation_id: UUID,
        tenant_id: UUID,
        actor_id: str,
    ) -> dict[str, Any]:
        """
        Create a new conversation in Federation Core.

        Args:
            mission: OMEGA/KEON mission template
            correlation_id: Request correlation ID
            tenant_id: Tenant identifier
            actor_id: Actor identifier

        Returns:
            Federation Core conversation response

        Raises:
            httpx.HTTPStatusError: If request fails
            httpx.TimeoutException: If request times out
        """
        payload = {
            "mission": mission,
            "metadata": {
                "correlation_id": str(correlation_id),
                "tenant_id": str(tenant_id),
                "actor_id": actor_id,
                "source": "forgepilot-api",
            },
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                f"{self.base_url}/conversations",
                json=payload,
            )
            response.raise_for_status()
            return response.json()

    async def get_conversation(self, conversation_id: str) -> dict[str, Any]:
        """
        Get conversation status from Federation Core.

        Args:
            conversation_id: Federation conversation ID

        Returns:
            Conversation state and metadata

        Raises:
            httpx.HTTPStatusError: If request fails
        """
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(
                f"{self.base_url}/conversations/{conversation_id}"
            )
            response.raise_for_status()
            return response.json()

    async def get_artifacts(self, conversation_id: str) -> dict[str, Any]:
        """
        Get conversation artifacts from Federation Core.

        Args:
            conversation_id: Federation conversation ID

        Returns:
            Conversation artifacts

        Raises:
            httpx.HTTPStatusError: If request fails
        """
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(
                f"{self.base_url}/conversations/{conversation_id}/artifacts"
            )
            response.raise_for_status()
            return response.json()

    def build_forgepilot_mission(
        self,
        business_idea: str,
        target_audience: str,
        brand_values: Optional[list[str]] = None,
    ) -> dict[str, Any]:
        """
        Build OMEGA/KEON mission template for ForgePilot campaign.

        This mission template instructs the Conversational Pantheon to:
        1. Generate brand name and tagline (Brand Strategist)
        2. Research domain availability (Domain Hunter)
        3. Create brand guidelines (Creative Director)
        4. Perform legal review (Legal Guardian)

        Args:
            business_idea: Core business concept
            target_audience: Target demographic
            brand_values: Optional brand values

        Returns:
            OMEGA mission template
        """
        brand_values_text = (
            f"\n\nBrand Values:\n" + "\n".join(f"- {v}" for v in brand_values)
            if brand_values
            else ""
        )

        mission = {
            "type": "conversational_pantheon",
            "workflow": "forgepilot_brand_campaign",
            "objective": "Generate complete brand campaign with name, domains, guidelines, and legal review",
            "context": {
                "business_idea": business_idea,
                "target_audience": target_audience,
                "brand_values": brand_values or [],
            },
            "phases": [
                {
                    "name": "brand_strategy",
                    "agent": "brand_strategist",
                    "objective": "Generate brand name and tagline",
                    "inputs": {
                        "business_idea": business_idea,
                        "target_audience": target_audience,
                        "brand_values": brand_values or [],
                    },
                    "outputs": ["brand_name", "tagline", "brand_rationale"],
                },
                {
                    "name": "domain_research",
                    "agent": "domain_hunter",
                    "objective": "Find available domains",
                    "depends_on": ["brand_strategy"],
                    "inputs": {
                        "brand_name": "{{brand_strategy.brand_name}}",
                    },
                    "outputs": ["domain_suggestions"],
                },
                {
                    "name": "brand_guidelines",
                    "agent": "creative_director",
                    "objective": "Create visual and voice guidelines",
                    "depends_on": ["brand_strategy"],
                    "inputs": {
                        "brand_name": "{{brand_strategy.brand_name}}",
                        "tagline": "{{brand_strategy.tagline}}",
                        "target_audience": target_audience,
                    },
                    "outputs": ["brand_guidelines"],
                },
                {
                    "name": "legal_review",
                    "agent": "legal_guardian",
                    "objective": "Check trademark and legal risks",
                    "depends_on": ["brand_strategy"],
                    "inputs": {
                        "brand_name": "{{brand_strategy.brand_name}}",
                    },
                    "outputs": ["legal_review"],
                },
            ],
            "initial_message": f"""Create a complete brand campaign for the following business:

Business Idea: {business_idea}

Target Audience: {target_audience}{brand_values_text}

Please collaborate through the Conversational Pantheon to deliver:
1. Brand name and tagline
2. Available domain suggestions
3. Brand guidelines (colors, typography, voice)
4. Legal trademark review

Coordinate through OMEGA and stream progress updates.""",
        }

        return mission
