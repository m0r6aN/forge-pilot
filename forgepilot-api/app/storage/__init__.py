"""Storage abstractions for campaign metadata."""

from .memory import (
    InMemoryCampaignStore,
    CampaignStore,
    CampaignMetadata,
    get_campaign_store,
)

__all__ = [
    "InMemoryCampaignStore",
    "CampaignStore",
    "CampaignMetadata",
    "get_campaign_store",
]
