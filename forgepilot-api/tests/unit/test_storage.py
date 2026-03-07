"""Unit tests for storage layer."""

import pytest
from uuid import uuid4
from datetime import datetime

from app.storage import InMemoryCampaignStore, CampaignMetadata


@pytest.mark.asyncio
class TestInMemoryCampaignStore:
    """Tests for InMemoryCampaignStore."""

    async def test_save_and_get(self):
        """Test saving and retrieving campaign metadata."""
        store = InMemoryCampaignStore()
        metadata = CampaignMetadata(
            campaign_id=uuid4(),
            conversation_id="conv_123",
            tenant_id=uuid4(),
            actor_id="user@example.com",
            correlation_id=uuid4(),
            created_at=datetime.utcnow(),
        )

        await store.save(metadata)
        retrieved = await store.get(metadata.campaign_id)

        assert retrieved is not None
        assert retrieved.campaign_id == metadata.campaign_id
        assert retrieved.conversation_id == metadata.conversation_id
        assert retrieved.tenant_id == metadata.tenant_id

    async def test_get_nonexistent(self):
        """Test getting non-existent campaign."""
        store = InMemoryCampaignStore()
        result = await store.get(uuid4())
        assert result is None

    async def test_list_by_tenant(self):
        """Test listing campaigns by tenant."""
        store = InMemoryCampaignStore()
        tenant_id = uuid4()

        # Create 3 campaigns for same tenant
        campaigns = []
        for _ in range(3):
            metadata = CampaignMetadata(
                campaign_id=uuid4(),
                conversation_id=f"conv_{uuid4()}",
                tenant_id=tenant_id,
                actor_id="user@example.com",
                correlation_id=uuid4(),
                created_at=datetime.utcnow(),
            )
            await store.save(metadata)
            campaigns.append(metadata)

        # Create 1 campaign for different tenant
        other_metadata = CampaignMetadata(
            campaign_id=uuid4(),
            conversation_id="conv_other",
            tenant_id=uuid4(),  # Different tenant
            actor_id="other@example.com",
            correlation_id=uuid4(),
            created_at=datetime.utcnow(),
        )
        await store.save(other_metadata)

        # List campaigns for first tenant
        tenant_campaigns = await store.list_by_tenant(tenant_id)

        assert len(tenant_campaigns) == 3
        assert all(c.tenant_id == tenant_id for c in tenant_campaigns)

    async def test_list_empty_tenant(self):
        """Test listing campaigns for tenant with no campaigns."""
        store = InMemoryCampaignStore()
        result = await store.list_by_tenant(uuid4())
        assert result == []

    async def test_overwrite_campaign(self):
        """Test overwriting campaign metadata."""
        store = InMemoryCampaignStore()
        campaign_id = uuid4()

        # Save first version
        metadata1 = CampaignMetadata(
            campaign_id=campaign_id,
            conversation_id="conv_123",
            tenant_id=uuid4(),
            actor_id="user1@example.com",
            correlation_id=uuid4(),
            created_at=datetime.utcnow(),
        )
        await store.save(metadata1)

        # Save second version with same campaign_id
        metadata2 = CampaignMetadata(
            campaign_id=campaign_id,
            conversation_id="conv_456",
            tenant_id=metadata1.tenant_id,
            actor_id="user2@example.com",
            correlation_id=uuid4(),
            created_at=datetime.utcnow(),
        )
        await store.save(metadata2)

        # Should retrieve second version
        retrieved = await store.get(campaign_id)
        assert retrieved.conversation_id == "conv_456"
        assert retrieved.actor_id == "user2@example.com"

    async def test_get_by_idempotency_key(self):
        """Test lookup by idempotency key."""
        store = InMemoryCampaignStore()
        tenant_id = uuid4()
        metadata = CampaignMetadata(
            campaign_id=uuid4(),
            conversation_id="conv_123",
            tenant_id=tenant_id,
            actor_id="user@example.com",
            correlation_id=uuid4(),
            created_at=datetime.utcnow(),
            idempotency_key="idem-123",
        )

        await store.save(metadata)
        retrieved = await store.get_by_idempotency(
            tenant_id=tenant_id,
            actor_id="user@example.com",
            idempotency_key="idem-123",
        )
        assert retrieved is not None
        assert retrieved.campaign_id == metadata.campaign_id
