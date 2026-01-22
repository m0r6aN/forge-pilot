# Architectural Debt Register (Top 20)

Severity: P0 (blocking), P1 (high), P2 (moderate)

1) P0 – Missing `core` package: backend imports `core.omega` but repo only has `backend/omega`; service cannot start. Fix: add shim package `core` or update imports to `backend.omega` and adjust PYTHONPATH.  
2) P0 – Backend Docker build fails: Dockerfile copies `requirements.txt` that does not exist. Fix: align to `requirements.runtime.txt` or add consolidated file.  
3) P0 – Backend Docker start path wrong: command targets `src.brandgenie...` which is not in repo. Fix Dockerfile CMD/WORKDIR to `backend.services.orchestrator.service:app`.  
4) P0 – Next.js config invalid: `next.config.ts` unsupported; `npm run dev/lint` fail. Fix: convert to `next.config.mjs/js`.  
5) P0 – No successful health endpoint: `/health` unreachable due to import error; OMEGA connectivity unverified. Fix items 1–3, rerun.  
6) P1 – External network dependence: compose requires pre-existing `omega-net` and undefined `federation-core`/`context-server`. Fix: include network creation and service definitions or document manual steps.  
7) P1 – Agent containers not buildable: `docker/docker-compose.forgepilot.yml` references missing `Dockerfile.agent`. Fix: add agent Dockerfile or remove unused compose.  
8) P1 – Only one real agent implemented: Brand Strategist exists; others simulated. Limits campaign fidelity and OMEGA registration accuracy. Fix: implement remaining agents or degrade capabilities in API contract.  
9) P1 – OMEGA HTTP endpoints hard-coded: direct POST to `/campaigns/*` and `/tasks/complete` without retries/auth. Fix: central client with retries, auth, and feature flags.  
10) P1 – Secrets committed: root `.env` contains live-looking `OPENAI_API_KEY`. Fix: rotate keys, add to gitignore/secrets manager.  
11) P1 – Missing automated tests: `backend/tests` empty; integration scripts unvalidated. Fix: add smoke tests for `/health` and `/campaign` with fallbacks.  
12) P1 – CI gap: no workflow ensuring backend/frontend build or docker build validity. Fix: add CI jobs for lint/test/docker-build.  
13) P1 – Runtime/env drift: multiple overlapping READMEs (ForgePilot/BrandGenie) with divergent instructions; increases operator error. Fix: consolidate authoritative runbook.  
14) P2 – Logging/observability thin: only stdout prints; metrics limited to Prometheus text in `/metrics`. Fix: add structured logging and tracing for Pantheon integration.  
15) P2 – Error handling sparse: orchestrator catches generic exceptions and rethrows; lack of classification/retry for agent/OMEGA failures. Fix: add typed errors and retries.  
16) P2 – Frontend/Backend contract implicit: frontend client assumes `/campaign` shape; backend uses simulated agents. Fix: publish OpenAPI/SDK and align schemas.  
17) P2 – No rate limiting/auth on backend: public endpoints unsecured. Fix: add auth middleware, API keys, or OAuth depending on deployment mode.  
18) P2 – Dependency pinning drift: mixed loose (`>=`) and exact pins; missing lock for backend. Fix: freeze runtime requirements and publish lockfile.  
19) P2 – Terraform/K8s stubs unmaintained: referenced in README but no configs checked. Fix: remove or add actual infra manifests.  
20) P2 – Lack of multi-tenant isolation plan: Pantheon-native model not defined in code; only single-tenant env vars. Fix: design per-tenant routing/identity for agents and data.
