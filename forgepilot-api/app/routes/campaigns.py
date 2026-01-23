"""Campaign API endpoints."""

from fastapi import APIRouter, Request, status
from fastapi.responses import JSONResponse
from uuid import uuid4, UUID
from datetime import datetime
import logging
import httpx

from ..models import (
    CreateCampaignRequest,
    CampaignResponse,
    CampaignStatusResponse,
    ArtifactsResponse,
    ErrorResponse,
    ErrorDetail,
    CampaignStatus,
    ProgressInfo,
    ErrorInfo,
    Artifacts,
    DomainSuggestion,
    BrandGuidelines,
    LegalReview,
)
from ..models.errors import ErrorCodes
from ..clients import FederationClient
from ..storage import get_campaign_store, CampaignMetadata

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/campaigns", tags=["campaigns"])


def get_correlation_id(request: Request) -> str:
    """Extract correlation ID from request state."""
    return request.state.correlation_id


def error_response(
    code: str,
    message: str,
    correlation_id: str,
    status_code: int,
) -> JSONResponse:
    """Create standardized error response."""
    return JSONResponse(
        status_code=status_code,
        content=ErrorResponse(
            error=ErrorDetail(
                code=code,
                message=message,
                correlation_id=correlation_id,
            )
        ).model_dump(),
    )


@router.post("", status_code=status.HTTP_201_CREATED, response_model=CampaignResponse)
async def create_campaign(
    request: Request,
    campaign_request: CreateCampaignRequest,
):
    """
    Create a new brand campaign.

    This endpoint:
    1. Validates the request
    2. Generates correlation_id if not provided
    3. Builds OMEGA/KEON mission template
    4. Delegates to Federation Core
    5. Stores campaign_id → conversation_id mapping
    6. Returns campaign metadata
    """
    correlation_id = (
        str(campaign_request.correlation_id)
        if campaign_request.correlation_id
        else get_correlation_id(request)
    )

    try:
        # Initialize Federation client
        client = FederationClient()

        # Build mission template
        mission = client.build_forgepilot_mission(
            business_idea=campaign_request.business_idea,
            target_audience=campaign_request.target_audience,
            brand_values=campaign_request.brand_values,
        )

        # Create conversation in Federation Core
        logger.info(
            f"Creating Federation conversation",
            extra={
                "correlation_id": correlation_id,
                "tenant_id": str(campaign_request.tenant_id),
            },
        )

        response = await client.create_conversation(
            mission=mission,
            correlation_id=UUID(correlation_id),
            tenant_id=campaign_request.tenant_id,
            actor_id=campaign_request.actor_id,
        )

        conversation_id = response.get("conversation_id")
        if not conversation_id:
            raise ValueError("Federation did not return conversation_id")

        # Generate campaign ID
        campaign_id = uuid4()
        created_at = datetime.utcnow()

        # Store metadata
        store = get_campaign_store()
        await store.save(
            CampaignMetadata(
                campaign_id=campaign_id,
                conversation_id=conversation_id,
                tenant_id=campaign_request.tenant_id,
                actor_id=campaign_request.actor_id,
                correlation_id=UUID(correlation_id),
                created_at=created_at,
            )
        )

        logger.info(
            f"Campaign created: {campaign_id}",
            extra={
                "campaign_id": str(campaign_id),
                "conversation_id": conversation_id,
                "correlation_id": correlation_id,
            },
        )

        return CampaignResponse(
            campaign_id=campaign_id,
            status=CampaignStatus.IN_PROGRESS,
            created_at=created_at,
            correlation_id=UUID(correlation_id),
        )

    except httpx.HTTPStatusError as e:
        logger.error(
            f"Federation error: {e}",
            extra={"correlation_id": correlation_id},
        )
        return error_response(
            code=ErrorCodes.FEDERATION_ERROR,
            message=f"Federation Core returned error: {e.response.status_code}",
            correlation_id=correlation_id,
            status_code=status.HTTP_502_BAD_GATEWAY,
        )

    except httpx.RequestError as e:
        logger.error(
            f"Federation unavailable: {e}",
            extra={"correlation_id": correlation_id},
        )
        return error_response(
            code=ErrorCodes.FEDERATION_UNAVAILABLE,
            message="Cannot reach Federation Core",
            correlation_id=correlation_id,
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    except Exception as e:
        logger.exception(
            f"Unexpected error creating campaign: {e}",
            extra={"correlation_id": correlation_id},
        )
        return error_response(
            code=ErrorCodes.INTERNAL_ERROR,
            message="Internal server error",
            correlation_id=correlation_id,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@router.get(
    "/{campaign_id}",
    status_code=status.HTTP_200_OK,
    response_model=CampaignStatusResponse,
)
async def get_campaign_status(
    request: Request,
    campaign_id: UUID,
):
    """
    Get campaign status.

    This endpoint:
    1. Looks up conversation_id from campaign_id
    2. Fetches conversation state from Federation Core
    3. Maps Federation state to campaign status
    4. Returns progress information
    """
    correlation_id = get_correlation_id(request)

    try:
        # Lookup campaign metadata
        store = get_campaign_store()
        metadata = await store.get(campaign_id)

        if not metadata:
            return error_response(
                code=ErrorCodes.CAMPAIGN_NOT_FOUND,
                message=f"Campaign {campaign_id} not found",
                correlation_id=correlation_id,
                status_code=status.HTTP_404_NOT_FOUND,
            )

        # Get conversation from Federation
        client = FederationClient()
        conversation = await client.get_conversation(metadata.conversation_id)

        # Map Federation state to campaign status
        fed_state = conversation.get("state", "active")
        status_map = {
            "queued": CampaignStatus.QUEUED,
            "active": CampaignStatus.IN_PROGRESS,
            "completed": CampaignStatus.COMPLETED,
            "failed": CampaignStatus.FAILED,
        }
        campaign_status = status_map.get(fed_state, CampaignStatus.IN_PROGRESS)

        # Extract progress information
        progress = None
        if campaign_status == CampaignStatus.IN_PROGRESS:
            messages = conversation.get("messages", [])
            last_message = messages[-1].get("content", "") if messages else None

            progress = ProgressInfo(
                current_phase=conversation.get("current_phase"),
                completion_percentage=conversation.get("completion_percentage"),
                last_message=last_message,
            )

        # Extract error information
        error_info = None
        if campaign_status == CampaignStatus.FAILED:
            error_data = conversation.get("error", {})
            if error_data:
                error_info = ErrorInfo(
                    code=error_data.get("code", "UNKNOWN"),
                    message=error_data.get("message", "Campaign failed"),
                )

        updated_at = datetime.fromisoformat(
            conversation.get("updated_at", datetime.utcnow().isoformat())
        )

        return CampaignStatusResponse(
            campaign_id=campaign_id,
            status=campaign_status,
            created_at=metadata.created_at,
            updated_at=updated_at,
            progress=progress,
            error=error_info,
        )

    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            return error_response(
                code=ErrorCodes.CAMPAIGN_NOT_FOUND,
                message=f"Campaign {campaign_id} not found in Federation",
                correlation_id=correlation_id,
                status_code=status.HTTP_404_NOT_FOUND,
            )
        return error_response(
            code=ErrorCodes.FEDERATION_ERROR,
            message=f"Federation Core error: {e.response.status_code}",
            correlation_id=correlation_id,
            status_code=status.HTTP_502_BAD_GATEWAY,
        )

    except Exception as e:
        logger.exception(
            f"Error fetching campaign status: {e}",
            extra={"correlation_id": correlation_id},
        )
        return error_response(
            code=ErrorCodes.INTERNAL_ERROR,
            message="Internal server error",
            correlation_id=correlation_id,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@router.get(
    "/{campaign_id}/artifacts",
    status_code=status.HTTP_200_OK,
    response_model=ArtifactsResponse,
)
async def get_campaign_artifacts(
    request: Request,
    campaign_id: UUID,
):
    """
    Get campaign artifacts.

    This endpoint:
    1. Looks up conversation_id from campaign_id
    2. Checks campaign is completed
    3. Fetches artifacts from Federation Core
    4. Returns structured artifact data
    """
    correlation_id = get_correlation_id(request)

    try:
        # Lookup campaign metadata
        store = get_campaign_store()
        metadata = await store.get(campaign_id)

        if not metadata:
            return error_response(
                code=ErrorCodes.CAMPAIGN_NOT_FOUND,
                message=f"Campaign {campaign_id} not found",
                correlation_id=correlation_id,
                status_code=status.HTTP_404_NOT_FOUND,
            )

        # Get conversation status
        client = FederationClient()
        conversation = await client.get_conversation(metadata.conversation_id)

        # Check if completed
        if conversation.get("state") != "completed":
            return error_response(
                code=ErrorCodes.CAMPAIGN_NOT_COMPLETED,
                message=f"Campaign {campaign_id} is not yet completed",
                correlation_id=correlation_id,
                status_code=status.HTTP_409_CONFLICT,
            )

        # Fetch artifacts
        artifact_data = await client.get_artifacts(metadata.conversation_id)

        # Parse artifacts
        artifacts = Artifacts(
            brand_name=artifact_data.get("brand_name"),
            tagline=artifact_data.get("tagline"),
            domain_suggestions=[
                DomainSuggestion(**d)
                for d in artifact_data.get("domain_suggestions", [])
            ],
            brand_guidelines=BrandGuidelines(**artifact_data.get("brand_guidelines", {}))
            if artifact_data.get("brand_guidelines")
            else None,
            legal_review=LegalReview(**artifact_data.get("legal_review", {}))
            if artifact_data.get("legal_review")
            else None,
        )

        return ArtifactsResponse(
            campaign_id=campaign_id,
            artifacts=artifacts,
            generated_at=datetime.fromisoformat(
                artifact_data.get("generated_at", datetime.utcnow().isoformat())
            ),
        )

    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            return error_response(
                code=ErrorCodes.CAMPAIGN_NOT_FOUND,
                message=f"Campaign {campaign_id} not found",
                correlation_id=correlation_id,
                status_code=status.HTTP_404_NOT_FOUND,
            )
        return error_response(
            code=ErrorCodes.FEDERATION_ERROR,
            message=f"Federation Core error: {e.response.status_code}",
            correlation_id=correlation_id,
            status_code=status.HTTP_502_BAD_GATEWAY,
        )

    except Exception as e:
        logger.exception(
            f"Error fetching campaign artifacts: {e}",
            extra={"correlation_id": correlation_id},
        )
        return error_response(
            code=ErrorCodes.INTERNAL_ERROR,
            message="Internal server error",
            correlation_id=correlation_id,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
