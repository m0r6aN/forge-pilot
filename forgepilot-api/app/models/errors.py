"""Error models for structured API responses."""

from pydantic import BaseModel, Field
from typing import Optional, Any


class ErrorDetail(BaseModel):
    """Structured error detail."""

    code: str = Field(..., description="Machine-readable error code")
    message: str = Field(..., description="Human-readable error message")
    correlation_id: Optional[str] = Field(None, description="Request correlation ID")
    details: Optional[dict[str, Any]] = Field(None, description="Additional context")


class ErrorResponse(BaseModel):
    """Standard error response wrapper."""

    error: ErrorDetail


# Error code constants
class ErrorCodes:
    """Standard error codes."""

    VALIDATION_ERROR = "VALIDATION_ERROR"
    CAMPAIGN_NOT_FOUND = "CAMPAIGN_NOT_FOUND"
    CAMPAIGN_NOT_COMPLETED = "CAMPAIGN_NOT_COMPLETED"
    FEDERATION_UNAVAILABLE = "FEDERATION_UNAVAILABLE"
    FEDERATION_ERROR = "FEDERATION_ERROR"
    INTERNAL_ERROR = "INTERNAL_ERROR"
