"""Health check endpoints."""

from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
import logging

from ..clients import FederationClient

logger = logging.getLogger(__name__)

router = APIRouter(tags=["health"])


@router.get("/health", status_code=status.HTTP_200_OK)
async def health_check():
    """
    Liveness probe.

    Returns 200 if the service process is alive.
    Does not check external dependencies.
    """
    return {"status": "ok"}


@router.get("/ready", status_code=status.HTTP_200_OK)
async def readiness_check():
    """
    Readiness probe.

    Returns 200 if service is ready to accept traffic.
    Checks Federation Core availability.
    """
    client = FederationClient()
    federation_available = await client.health_check()

    if not federation_available:
        logger.warning("Federation Core unavailable - service not ready")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "unavailable",
                "federation_available": False,
            },
        )

    return {
        "status": "ready",
        "federation_available": True,
    }
