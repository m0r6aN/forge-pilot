"""Storage abstractions for campaign metadata."""

from .memory import InMemoryCampaignStore, CampaignStore

__all__ = ["InMemoryCampaignStore", "CampaignStore"]
