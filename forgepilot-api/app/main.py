"""ForgePilot API main application."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from .config import get_settings
from .middleware import CorrelationMiddleware, TenantScopeMiddleware
from .routes import campaigns_router, health_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Initialize settings
settings = get_settings()

# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    description="Thin OMEGA-native API for ForgePilot brand campaigns",
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=settings.cors_allow_credentials,
    allow_methods=settings.cors_allow_methods,
    allow_headers=settings.cors_allow_headers,
)

# Add custom middleware
app.add_middleware(CorrelationMiddleware)
app.add_middleware(TenantScopeMiddleware)

# Include routers
app.include_router(health_router)
app.include_router(campaigns_router)


@app.on_event("startup")
async def startup_event():
    """Application startup event."""
    logger.info(f"Starting {settings.app_name} v{settings.version}")
    logger.info(f"Federation URL: {settings.federation_url}")
    logger.info(f"Debug mode: {settings.debug}")


@app.on_event("shutdown")
async def shutdown_event():
    """Application shutdown event."""
    logger.info(f"Shutting down {settings.app_name}")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )
