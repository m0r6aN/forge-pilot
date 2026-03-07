# ForgePilot API

Thin OMEGA-native backend for ForgePilot brand campaign generation.

## Architecture

This API is a **translation layer** between HTTP/WebSocket clients and Federation Core. It does NOT orchestrate agents, manage state, or route tools.

### Responsibilities

- HTTP/WebSocket boundary translation
- Request validation (Pydantic)
- Correlation ID enforcement
- Tenant scoping
- Status translation (Federation → Campaign)
- Artifact retrieval

### What It Does NOT Do

- Orchestrate agent workflows (Federation Core does this)
- Manage conversation state (Federation Core does this)
- Route tool invocations (Federation Core does this)
- Store campaign content (only metadata pointers)

## Quick Start

### Local Development

```bash
# Install dependencies
pip install -e ".[dev]"

# Set environment variables
export FEDERATION_URL=http://localhost:3000
export DEBUG=true

# Run server
uvicorn app.main:app --reload --port 8000
```

### Docker

```bash
# Build image
docker build -t forgepilot-api:latest .

# Run container
docker run -p 8000:8000 \
  -e FEDERATION_URL=http://federation-core:3000 \
  forgepilot-api:latest
```

### Docker Compose

```bash
# Start all services
docker-compose up -d forgepilot-api

# View logs
docker-compose logs -f forgepilot-api
```

## API Endpoints

### Create Campaign

```bash
POST /api/v1/campaigns
Content-Type: application/json

{
  "business_idea": "AI-powered meal planning app",
  "target_audience": "Busy professionals aged 25-40",
  "brand_values": ["health", "convenience", "sustainability"],
  "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
  "actor_id": "user@example.com"
}
```

Response:
```json
{
  "campaign_id": "123e4567-e89b-12d3-a456-426614174000",
  "status": "in_progress",
  "created_at": "2026-01-22T10:30:00Z",
  "correlation_id": "987fbc97-4bed-5078-9f07-9141ba07c9f3"
}
```

### Get Campaign Status

```bash
GET /api/v1/campaigns/{campaign_id}
```

Response:
```json
{
  "campaign_id": "123e4567-e89b-12d3-a456-426614174000",
  "status": "in_progress",
  "created_at": "2026-01-22T10:30:00Z",
  "updated_at": "2026-01-22T10:32:15Z",
  "progress": {
    "current_phase": "brand_strategy",
    "completion_percentage": 45,
    "last_message": "Generated 3 brand name options"
  }
}
```

### Get Campaign Artifacts

```bash
GET /api/v1/campaigns/{campaign_id}/artifacts
```

Response:
```json
{
  "campaign_id": "123e4567-e89b-12d3-a456-426614174000",
  "artifacts": {
    "brand_name": "NutriFlow",
    "tagline": "Fuel Your Day, Naturally",
    "domain_suggestions": [
      {
        "domain": "nutriflow.com",
        "available": true,
        "price": 2499.0
      }
    ],
    "brand_guidelines": {
      "colors": ["#4CAF50", "#8BC34A", "#CDDC39"],
      "typography": "Montserrat for headings, Open Sans for body",
      "voice": "Friendly, motivating, health-conscious"
    },
    "legal_review": {
      "trademark_status": "clear",
      "risks": []
    }
  },
  "generated_at": "2026-01-22T10:35:00Z"
}
```

### Health Checks

```bash
# Liveness probe
GET /health

# Readiness probe
GET /ready
```

## Development

### Run Tests

```bash
# All tests
pytest

# With coverage
pytest --cov=app --cov-report=html

# Specific test file
pytest tests/unit/test_models.py

# Integration tests only
pytest tests/integration/

# API-driven E2E scenarios
python tests/e2e/run_e2e.py --scenario E2E-1 --base-url http://localhost:8000

# Chaos experiment (staging only)
python tests/chaos/run_chaos.py --experiment Chaos-01
```

### Release Gates

```powershell
# Contract + trace continuity + idempotency
./scripts/release-gates.ps1

# Include staging E2E-1 and E2E-2 gates
./scripts/release-gates.ps1 -RunStagingE2E -ApiBaseUrl http://staging-keon-backend
```

### Linting

```bash
# Format code
black app/ tests/

# Lint
ruff check app/ tests/

# Type check
mypy app/
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `FEDERATION_URL` | Federation Core base URL | `http://localhost:3000` |
| `FEDERATION_TIMEOUT` | Request timeout (seconds) | `30` |
| `DEBUG` | Enable debug mode | `false` |
| `PORT` | Server port | `8000` |
| `CORS_ORIGINS` | Allowed CORS origins | `["http://localhost:3000"]` |
| `EVIDENCE_ENABLED` | Emit run manifests/artifacts | `true` |
| `EVIDENCE_ENV` | Evidence environment prefix | `dev` |
| `EVIDENCE_LAYER` | Layer name in manifests | `keon-backend` |
| `EVIDENCE_CONTAINER` | Blob container for receipts | `fc-receipts` |
| `EVIDENCE_PREFER_LOCAL` | Write evidence to local spool | `false` |

### Canonical Evidence Output

Every pytest suite run now emits:
- `run_manifest.json`
- `artifacts.json`

Canonical prefix:
`{env}/{layer}/{suite}/{scenarioId}/{runId}`

Run manifests use schema:
`docs/internal/canon/schemas/keon.run_manifest.v1.schema.json`

## Architecture Patterns

### Correlation ID Flow

Every request gets a correlation ID:
1. Extracted from `X-Correlation-ID` header
2. Generated if not provided
3. Passed to Federation Core
4. Returned in response headers
5. Logged with all operations

### Error Handling

All errors return consistent format:

```json
{
  "error": {
    "code": "FEDERATION_UNAVAILABLE",
    "message": "Cannot reach Federation Core",
    "correlation_id": "987fbc97-4bed-5078-9f07-9141ba07c9f3"
  }
}
```

Error codes:
- `VALIDATION_ERROR` - Request validation failed
- `CAMPAIGN_NOT_FOUND` - Campaign ID not found
- `CAMPAIGN_NOT_COMPLETED` - Artifacts requested before completion
- `FEDERATION_UNAVAILABLE` - Cannot reach Federation Core
- `FEDERATION_ERROR` - Federation Core returned error
- `INTERNAL_ERROR` - Unexpected API error

### State Mapping

```
Federation State → Campaign Status
----------------------------------
queued         → queued
active         → in_progress
completed      → completed
failed         → failed
```

## Deployment

### Production Checklist

- [ ] Set `DEBUG=false`
- [ ] Configure proper `FEDERATION_URL`
- [ ] Set up CORS origins
- [ ] Configure health check endpoints
- [ ] Set up monitoring (Prometheus/Grafana)
- [ ] Configure structured logging
- [ ] Set up distributed tracing
- [ ] Deploy behind load balancer

### Scaling

This service is **stateless** and horizontally scalable:
- No sticky sessions required
- Campaign metadata stored in Federation Core
- In-memory store is per-instance (replace with Redis in production)

## Federation Core Integration

### Mission Template

The API sends OMEGA/KEON mission templates to Federation Core:

```python
{
    "type": "conversational_pantheon",
    "workflow": "forgepilot_brand_campaign",
    "phases": [
        {"name": "brand_strategy", "agent": "brand_strategist"},
        {"name": "domain_research", "agent": "domain_hunter"},
        {"name": "brand_guidelines", "agent": "creative_director"},
        {"name": "legal_review", "agent": "legal_guardian"},
    ],
}
```

Federation Core:
1. Initializes conversation
2. Orchestrates OMEGA Pantheon
3. Manages agent communication
4. Stores artifacts
5. Streams progress

## Testing Federation Integration

Mock Federation Core for local testing:

```bash
# Install httpx mock
pip install respx

# Run tests with mocked Federation
pytest tests/integration/test_federation_mock.py
```

## License

MIT
