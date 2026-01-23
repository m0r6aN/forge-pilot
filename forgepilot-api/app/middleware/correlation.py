"""Correlation ID middleware for request tracing."""

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from uuid import uuid4
import logging

logger = logging.getLogger(__name__)


class CorrelationMiddleware(BaseHTTPMiddleware):
    """Middleware to ensure all requests have correlation IDs."""

    async def dispatch(self, request: Request, call_next):
        """Process request and ensure correlation ID exists."""
        # Get or generate correlation ID
        correlation_id = request.headers.get("X-Correlation-ID")
        if not correlation_id:
            correlation_id = str(uuid4())

        # Store in request state for access in route handlers
        request.state.correlation_id = correlation_id

        # Log request with correlation ID
        logger.info(
            f"Request {request.method} {request.url.path}",
            extra={"correlation_id": correlation_id},
        )

        # Process request
        response: Response = await call_next(request)

        # Add correlation ID to response headers
        response.headers["X-Correlation-ID"] = correlation_id

        return response
