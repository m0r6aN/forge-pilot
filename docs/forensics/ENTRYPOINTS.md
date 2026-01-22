# ForgePilot Entrypoints

Every way to run or validate ForgePilot as it exists today. Commands are written for PowerShell unless noted.

## Frontend (Next.js)
- Command: `npm run dev` (port `3030`)
- Env: `OPENAI_API_KEY` or `AZURE_OPENAI_KEY`/`AZURE_OPENAI_ENDPOINT`
- Dependencies: Node 18+ recommended, packages installed (`npm ci`)
- Current status: **fails** with Next.js error (`next.config.ts` unsupported); replace with `next.config.mjs/js` before it will start.
- Success criteria: server listens on `http://localhost:3030`, renders landing/dashboard pages.

## Backend API (FastAPI)
- Command: `$env:PYTHONPATH='backend'; .\\.venv\\Scripts\\uvicorn backend.services.orchestrator.service:app --host 0.0.0.0 --port 8010`
- Env: `OMEGA_FEDERATION_URL` (defaults to `http://localhost:8001`), optional `LOG_LEVEL`; Python deps installed from `backend/requirements.runtime.txt`
- Dependencies: `.venv` with runtime requirements
- Current status: **fails** with `ModuleNotFoundError: No module named 'core'` because code imports `core.omega` but only `backend/omega` exists.
- Success criteria: `/health` returns 200 with omega info; `/campaign` accepts POST and returns campaign payload.

## Docker: backend orchestrator
- Command: `docker-compose up -d forgepilot-orchestrator`
- Ports: `8010:8010`
- Env (compose): `OMEGA_FEDERATION_URL`, `PYTHONPATH=/app/src:/app`
- Dependencies: external docker network `omega-net`; expects OMEGA federation/context running or mocked.
- Current status: **fails to build** because `backend/Dockerfile` copies `requirements.txt` (missing; only `requirements.runtime.txt` exists). Also start script points to `src.brandgenie...` path that is not present.
- Success criteria: container healthy; `/health` responds.

## Docker: agent swarm (unused stubs)
- File: `docker/docker-compose.forgepilot.yml`
- Command: `docker-compose -f docker-compose.yml -f docker/docker-compose.forgepilot.yml up -d`
- Ports: none exposed
- Dependencies: `Dockerfile.agent` missing; requires `omega-net`, federation/core services.
- Current status: not runnable (build context and dockerfile absent).

## Helper scripts
- `./quick-start.sh`: builds backend image, brings up compose, runs `/health` + `/campaign` demo. Requires Docker, `omega-net`; continues in standalone mode with mock services. Currently blocked by backend Dockerfile missing `requirements.txt`.
- `./deploy-forgepilot.sh`: similar to quick-start with pre-checks, can create mock OMEGA services; suffers same backend Dockerfile issue.
- `./launch_forgepilot.sh`: assumes OMEGA core deploy script under `backend/scripts/deploy.sh` (not present), then composes services; currently non-functional.
- `python demo.py` / `python forgepilot_live_demo.py`: rely on backend imports; currently fail because `core.omega` not found.

## Tests / smoke
- Python: `python test-integration-quick.py` (top-level). Requires backend imports; will fail without fixing `core.omega`.
- JS smoke: `npm run test-brand` runs `test-brand-generator.js` (pure JS OpenAI demo; needs OpenAI key).
- Planned: no tests inside `backend/tests` (directory empty).

## Ports Summary
- Frontend: `3030`
- Backend API: `8010`
- OMEGA Federation (expected external): `8001`
- OMEGA Context Server (expected external): `8002`
