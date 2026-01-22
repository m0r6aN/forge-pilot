# What Runs Today (Observed)

## Environment Setup
- `.venv` created; installed `backend/requirements.runtime.txt` and `backend/requirements.dev.txt` successfully.

## Backend API Attempt
- Command: `$env:PYTHONPATH='backend'; .\\.venv\\Scripts\\uvicorn backend.services.orchestrator.service:app --host 0.0.0.0 --port 8010`
- Result: **failure**
- Error: `ModuleNotFoundError: No module named 'core'` (import in `backend/services/orchestrator/forgepilot_orchestrator.py`).
- Root cause: repo ships `backend/omega` but code imports `core.omega`; no `core` package present unless external OMEGA repo is mounted.

## Backend Docker Build
- Command: `docker build -t forgepilot-backend-test backend`
- Result: **failure**
- Error: `COPY requirements.txt .` -> file not found.
- Root cause: backend Dockerfile expects `requirements.txt`; repo only has `requirements.runtime.txt` and `requirements.dev.txt`.

## Frontend Dev/Lint
- Command: `npm run dev` / `npm run lint`
- Result: **failure**
- Error: Next.js rejects `next.config.ts` (“Configuring Next.js via 'next.config.ts' is not supported”).
- Root cause: Next 14 requires `next.config.js/mjs`; TypeScript config unsupported.

## Tests
- Backend `backend/tests`: no test files.
- `python test-integration-quick.py`: not executed; would hit same `core` import issue.
- `npm run test-brand`: not executed; requires OpenAI key, unrelated to OMEGA integration.

## Health/Campaign Proof
- No successful `/health` or `/campaign` response obtained due to backend import failure. Logs above serve as “if not possible” proof.
