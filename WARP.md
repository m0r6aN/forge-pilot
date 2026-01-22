# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

ForgePilot is an AI-powered brand generation platform with a dual architecture:
- **Frontend**: Next.js 14 web application for brand creation UI
- **Backend**: Python FastAPI service with autonomous AI agents (OMEGA-powered)

## Development Commands

### Frontend (Next.js)
```bash
npm install          # Install dependencies
npm run dev          # Start dev server (port 3000)
npm run build        # Production build
npm run lint         # Run ESLint
```

### Backend (Python/FastAPI)
```bash
cd backend
pip install -r requirements.txt    # Install dependencies
python -m uvicorn src.brandgenie.services.orchestrator.service:app --host 0.0.0.0 --port 8010  # Start service
```

### Docker Deployment
```bash
# Requires OMEGA network running first
docker-compose up -d                          # Start services
docker-compose logs -f forgepilot-orchestrator  # View logs
```

### Testing
```bash
npm run test-brand           # Run brand generator test (JS)
python test-integration.py   # Run Python integration tests
pytest backend/              # Run pytest suite
```

## Architecture

### Service Communication
```
Next.js Frontend (3000) → ForgePilot Orchestrator (8010) → OMEGA Federation (8001+)
```

### Frontend Structure (`src/`)
- `app/` - Next.js App Router pages and API routes
- `components/` - React components (auth, dashboard, generator, pricing)
- `lib/ai/` - AI service integrations (brand-generator, avatar-generator, video-generator)
- `lib/forgepilot-client.ts` - Backend API client with `useBrandGenie()` hook

Uses path alias `@/*` → `./src/*`

### Backend Structure (`backend/`)
- `agents/` - Specialized AI agents (brand_strategist, creative_director, domain_hunter, legal_guardian)
- `services/orchestrator/` - Main ForgePilot orchestrator service
- `omega/` - OMEGA compatibility layer (supports standalone or full OMEGA integration)

### Agent Swarm Architecture
The backend uses a multi-agent swarm with 4 execution phases:
1. **Phase 1**: Strategic Foundation (Brand Strategist)
2. **Phase 2**: Market Research & Legal Validation (parallel)
3. **Phase 3**: Digital Assets & Creative Identity (parallel)
4. **Phase 4**: Revenue Model & Launch Planning (parallel)

Agents inherit from `BaseAgent` and `CollaboratorMixin` from the OMEGA compatibility layer (`backend/omega/__init__.py`).

### OMEGA Integration
The system supports two modes:
- **Full Integration**: When OMEGA pantheon is running (Federation Core on 8001, Context Server on 8002)
- **Standalone Mode**: Uses lightweight compatibility classes when OMEGA is unavailable

Check mode with `is_omega_available()` from `core.omega`.

## Key API Endpoints

### Backend (port 8010)
- `POST /campaign` - Generate complete brand campaign
- `GET /health` - Service health check
- `GET /capabilities` - List available agent capabilities

### Frontend API Routes (`src/app/api/`)
- `generate/brand/` - Basic brand generation
- `generate/advanced_brand/` - Full brand campaign via orchestrator
- `auth/` - Authentication endpoints
- `domains/`, `hosting/`, `payments/` - Business service integrations

## Environment Variables

Required in `.env`:
- `OPENAI_API_KEY` or `AZURE_OPENAI_KEY` - For AI generation
- `AZURE_OPENAI_ENDPOINT` - Azure OpenAI endpoint (if using Azure)
- `OMEGA_FEDERATION_URL` - Federation Core URL (default: `http://federation-core:8001`)

## Code Patterns

### Adding New Agents
1. Create agent in `backend/agents/{agent_name}/agent.py`
2. Inherit from `BaseAgent` and `CollaboratorMixin`
3. Implement `is_task_relevant()` and `execute_task()` methods
4. Register in orchestrator's `agent_registry`

### Frontend-Backend Integration
Use `BrandGenieClient` or `useBrandGenie()` hook from `@/lib/forgepilot-client`:
```typescript
const { generateCampaign } = useBrandGenie();
const campaign = await generateCampaign({ description: "..." });
```
