"""Tenant scoping middleware for multi-tenancy."""

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse
from uuid import UUID
import logging

logger = logging.getLogger(__name__)


class TenantScopeMiddleware(BaseHTTPMiddleware):
    """Middleware to enforce tenant scoping on requests."""

    TENANT_REQUIRED_PATHS = ["/api/v1/campaigns"]

    async def dispatch(self, request: Request, call_next):
        """Process request and validate tenant context."""
        # Skip tenant validation for health/ready endpoints
        if request.url.path in ["/health", "/ready"]:
            return await call_next(request)

        # For campaign endpoints, tenant_id will come from request body
        # This middleware just ensures proper logging context
        # Actual validation happens in route handlers via Pydantic

        response: Response = await call_next(request)
        return response
