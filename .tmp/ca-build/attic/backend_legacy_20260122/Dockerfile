# ForgePilot Backend Dockerfile - OMEGA Compatible
# Production-ready containerized service for autonomous brand campaigns

FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code with correct structure
COPY ./ ./src/

# Set Python path to include our source
ENV PYTHONPATH=/app/src:/app

# Create startup script that works with our new structure
RUN echo '#!/bin/bash\ncd /app && python -m uvicorn src.forgepilot.services.orchestrator.service:app --host 0.0.0.0 --port 8010' > start.sh
RUN chmod +x start.sh

# Expose port
EXPOSE 8010

# Environment variables
ENV OMEGA_FEDERATION_URL=http://federation-core:8001
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8010/health || exit 1

# Labels for OMEGA integration
LABEL omega.service.type="forgepilot_orchestrator"
LABEL omega.swarm="forgepilot" 
LABEL omega.api.port="8010"
LABEL omega.version="1.0.0"

# Start command
CMD ["./start.sh"]
