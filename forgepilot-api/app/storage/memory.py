"""In-memory campaign metadata storage (v0.1.0)."""

from typing import Protocol, Optional
from uuid import UUID
from datetime import datetime
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)


@dataclass
class CampaignMetadata:
    """Campaign metadata stored by API."""

    campaign_id: UUID
    conversation_id: str
    tenant_id: UUID
    actor_id: str
    correlation_id: UUID
    created_at: datetime


class CampaignStore(Protocol):
    """Protocol for campaign metadata storage."""

    async def save(self, metadata: CampaignMetadata) -> None:
        """Save campaign metadata."""
        ...

    async def get(self, campaign_id: UUID) -> Optional[CampaignMetadata]:
        """Get campaign metadata by ID."""
        ...

    async def list_by_tenant(self, tenant_id: UUID) -> list[CampaignMetadata]:
        """List campaigns by tenant."""
        ...


class InMemoryCampaignStore:
    """
    In-memory campaign metadata store.

    NOTE: This is a v0.1.0 implementation. Production should use:
    - Redis for high-performance caching
    - PostgreSQL for durable storage
    - Proper indexing on tenant_id and actor_id
    """

    def __init__(self):
        """Initialize in-memory store."""
        self._store: dict[UUID, CampaignMetadata] = {}
        self._tenant_index: dict[UUID, set[UUID]] = {}

    async def save(self, metadata: CampaignMetadata) -> None:
        """Save campaign metadata."""
        self._store[metadata.campaign_id] = metadata

        # Update tenant index
        if metadata.tenant_id not in self._tenant_index:
            self._tenant_index[metadata.tenant_id] = set()
        self._tenant_index[metadata.tenant_id].add(metadata.campaign_id)

        logger.info(
            f"Saved campaign metadata: {metadata.campaign_id}",
            extra={
                "campaign_id": str(metadata.campaign_id),
                "conversation_id": metadata.conversation_id,
                "tenant_id": str(metadata.tenant_id),
            },
        )

    async def get(self, campaign_id: UUID) -> Optional[CampaignMetadata]:
        """Get campaign metadata by ID."""
        return self._store.get(campaign_id)

    async def list_by_tenant(self, tenant_id: UUID) -> list[CampaignMetadata]:
        """List campaigns by tenant."""
        campaign_ids = self._tenant_index.get(tenant_id, set())
        return [self._store[cid] for cid in campaign_ids if cid in self._store]


# Singleton instance for v0.1.0
_store: Optional[InMemoryCampaignStore] = None


def get_campaign_store() -> InMemoryCampaignStore:
    """Get singleton campaign store instance."""
    global _store
    if _store is None:
        _store = InMemoryCampaignStore()
    return _store
