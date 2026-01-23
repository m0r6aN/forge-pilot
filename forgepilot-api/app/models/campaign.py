"""Campaign data models."""

from pydantic import BaseModel, Field, UUID4
from typing import Optional
from datetime import datetime
from enum import Enum


class CampaignStatus(str, Enum):
    """Campaign status enum."""

    QUEUED = "queued"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


class CreateCampaignRequest(BaseModel):
    """Request to create a new campaign."""

    business_idea: str = Field(
        ...,
        min_length=10,
        max_length=2000,
        description="Core business concept or product description",
    )
    target_audience: str = Field(
        ...,
        min_length=5,
        max_length=500,
        description="Target demographic or market segment",
    )
    brand_values: Optional[list[str]] = Field(
        None,
        max_length=10,
        description="Optional brand values or principles",
    )
    tenant_id: UUID4 = Field(..., description="Tenant identifier")
    actor_id: str = Field(..., description="User or system actor")
    correlation_id: Optional[UUID4] = Field(None, description="Optional correlation ID")


class CampaignResponse(BaseModel):
    """Response after creating a campaign."""

    campaign_id: UUID4
    status: CampaignStatus
    created_at: datetime
    correlation_id: UUID4


class ProgressInfo(BaseModel):
    """Campaign progress information."""

    current_phase: Optional[str] = None
    completion_percentage: Optional[int] = Field(None, ge=0, le=100)
    last_message: Optional[str] = None


class ErrorInfo(BaseModel):
    """Campaign error information."""

    code: str
    message: str


class CampaignStatusResponse(BaseModel):
    """Campaign status response."""

    campaign_id: UUID4
    status: CampaignStatus
    created_at: datetime
    updated_at: datetime
    progress: Optional[ProgressInfo] = None
    error: Optional[ErrorInfo] = None


class DomainSuggestion(BaseModel):
    """Domain availability suggestion."""

    domain: str
    available: bool
    price: Optional[float] = None


class BrandGuidelines(BaseModel):
    """Brand guidelines artifact."""

    colors: Optional[list[str]] = None
    typography: Optional[str] = None
    voice: Optional[str] = None


class LegalReview(BaseModel):
    """Legal review artifact."""

    trademark_status: Optional[str] = None
    risks: Optional[list[str]] = None


class Artifacts(BaseModel):
    """Campaign artifacts."""

    brand_name: Optional[str] = None
    tagline: Optional[str] = None
    domain_suggestions: Optional[list[DomainSuggestion]] = None
    brand_guidelines: Optional[BrandGuidelines] = None
    legal_review: Optional[LegalReview] = None


class ArtifactsResponse(BaseModel):
    """Campaign artifacts response."""

    campaign_id: UUID4
    artifacts: Artifacts
    generated_at: datetime
