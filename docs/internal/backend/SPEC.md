# ForgePilot Backend API Specification

## Architecture Intent

Thin Product API layer - HTTP/WebSocket translation only.
- forgepilot-api receives HTTP requests
- Validates, enriches with correlation/tenant context
- Delegates to Federation Core
- Returns structured responses
- NO orchestration, NO agent logic, NO tool routing

## Responsibilities (WHAT IT DOES)

1. **HTTP/WebSocket Boundary**: Translate REST/WS ↔ Federation Core protocol
2. **Request Validation**: Pydantic models, required fields
3. **Correlation Enforcement**: Generate/validate correlation_id
4. **Tenant Scoping**: Enforce tenant_id and actor_id
5. **Status Translation**: Map Federation conversation state → campaign status
6. **Artifact Retrieval**: Fetch deliverables from conversation
7. **Error Structuring**: Consistent error format

## Forbidden List (WHAT IT MUST NOT DO)

1. ❌ Orchestrate agent workflows
2. ❌ Manage conversation state
3. ❌ Route tool invocations
4. ❌ Implement agent communication
5. ❌ Store campaign content (only metadata pointers)
6. ❌ Fallback to local agents if Federation unavailable

## Federation Integration Rules

- **Start Mission**: `POST /conversations` with OMEGA/KEON mission template
- **Get Status**: `GET /conversations/{id}` for progress
- **Get Artifacts**: `GET /conversations/{id}/artifacts` for deliverables
- **Health Check**: `GET /health` and `GET /capabilities`
- **Failure Mode**: Return 503 if Federation unavailable (no silent fallback)

## Technology Stack

- Python 3.11+
- FastAPI (async/await)
- Pydantic v2 (validation)
- httpx (HTTP client)
- uvicorn (ASGI server)
- NO ORM, NO agent SDKs

## API Endpoints

- `POST /api/v1/campaigns` - Create campaign
- `GET /api/v1/campaigns/{id}` - Get status
- `GET /api/v1/campaigns/{id}/artifacts` - Get artifacts
- `GET /health` - Liveness probe
- `GET /ready` - Readiness probe

## Deployment Model

- Stateless HTTP server
- Horizontal scaling via load balancer
- No sticky sessions required
- Health checks on /health and /ready
