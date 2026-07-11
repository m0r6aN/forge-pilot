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
    ConversationStatus,
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
    ValidationError,
    GenesisProtocolError,
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
    "ConversationStatus",
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
    "ValidationError",
    "GenesisProtocolError",
]


# Convenience imports for common use case
import asyncio


def create_campaign(
    api_key: str,
    business_idea: str,
    target_audience: str,
    brand_values: list[str],
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
    return asyncio.run(
        client.create_brand_campaign(
            business_idea=business_idea,
            target_audience=target_audience,
            brand_values=brand_values,
        )
    )
