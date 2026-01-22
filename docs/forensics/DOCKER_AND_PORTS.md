# Docker, Ports, and Networks Inventory

## Compose Files
- `docker-compose.yml`
  - Service: `forgepilot-orchestrator`
    - Build: `./backend` with `Dockerfile`
    - Ports: `8010:8010`
    - Env: `OMEGA_FEDERATION_URL=http://federation-core:8001`, `PYTHONPATH=/app/src:/app`, `LOG_LEVEL=INFO`
    - Networks: `omega-net` (external, must exist)
    - Depends on: `federation-core`, `context-server` (not defined in this compose, assumed external)
    - Healthcheck: `curl http://localhost:8010/health`
    - Labels: `omega.service.type=forgepilot_orchestrator`, etc.
  - Networks: `omega-net` declared `external: true`

- `docker/docker-compose.forgepilot.yml`
  - Services: `brand-strategist`, `domain-hunter`, `legal-guardian`
    - Build: `Dockerfile.agent` (missing), args `AGENT_NAME`
    - Env: `OMEGA_AGENT_NAME`, `FEDERATION_CORE_URL`, `CONTEXT_SERVER_URL`
    - Networks: `omega-net`
    - Depends on external `federation-core`, `context-server`
    - Ports: none exposed

## Dockerfiles
- `backend/Dockerfile`
  - Exposes `8010`, sets `OMEGA_FEDERATION_URL`.
  - Copies `requirements.txt` (file absent; build fails) then installs, copies code to `/app/src/`.
  - Start command: `python -m uvicorn src.brandgenie.services.orchestrator.service:app --port 8010` (path does not exist in repo).
  - Healthcheck: `curl http://localhost:8010/health`.

- `Dockerfile` (frontend)
  - Next.js multi-stage; exposes `3030`; start command `node server.js` from `.next/standalone`.

## Ports & Potential Collisions
- Frontend: `3030`
- Backend API: `8010`
- Expected OMEGA: `8001` (Federation), `8002` (Context)
- No defined collisions inside the repo; reliance on external 8001/8002 means clashes if another service already uses those ports.

## Anti-Patterns / Risks
- Missing `backend/requirements.txt` breaks backend container build.
- Backend Dockerfile start path (`src.brandgenie...`) mismatched to current layout (`backend/services/...`); container would fail even if build succeeded.
- Compose depends on services not defined in the same file (`federation-core`, `context-server`) and on pre-existing `omega-net`; onboarding is brittle.
- Agent compose references `Dockerfile.agent` which is not present; agent containers cannot be built.
