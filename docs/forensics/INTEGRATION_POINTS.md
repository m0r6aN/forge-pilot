# ForgePilot ↔ OMEGA Integration Points

## Code-Level Touchpoints
- `backend/omega/__init__.py`
  - Tries to import real OMEGA classes from multiple paths; sets `OMEGA_AVAILABLE` and exposes `BaseAgent`, `CollaboratorMixin`, `TaskResult`, `create_agent_settings`, `is_omega_available`, `get_omega_info`.
  - **Boundary:** Clean fallback (lightweight classes) when OMEGA missing, but import namespace is `core.*` which is absent locally.

- `backend/services/orchestrator/forgepilot_orchestrator.py`
  - Uses `create_agent_settings`, `is_omega_available` for orchestrator initialization.
  - `_register_campaign_with_omega` → POST `${OMEGA_FEDERATION_URL}/campaigns/register`.
  - `_complete_campaign_with_omega` → POST `${OMEGA_FEDERATION_URL}/campaigns/complete`.
  - **Coupling:** Tight (hard-coded endpoints, assumes federation-core API).

- `backend/services/orchestrator/service.py`
  - `/health` includes `omega_info = get_omega_info()` and `omega_connected = is_omega_available()`.
  - `/capabilities` reports OMEGA mode.
  - **Boundary:** Clean (read-only status), but blocked by missing `core.omega` import.

- `backend/agents/brand_strategist/agent.py`
  - `_get_omega_context` → POST `${OMEGA_FEDERATION_URL.replace(':8001', ':8002')}/context/gather`.
  - `_register_with_omega_federation` → POST `${OMEGA_FEDERATION_URL}/tasks/complete`.
  - **Coupling:** Tight for full capability; has fallback context generation.

## Operational Touchpoints
- Docker/env: `OMEGA_FEDERATION_URL` in `docker-compose.yml`, backend `Dockerfile`, and runtime env expectations.
- Scripts: `quick-start.sh`, `deploy-forgepilot.sh`, `launch_forgepilot.sh` check/create `omega-net` docker network and look for `federation-core` / `context-server` containers, spinning mock nginx proxies if absent.

## Gaps / Mismatches
- Namespace mismatch: code imports `core.omega` but repository provides `backend/omega`; without real OMEGA repo on PYTHONPATH, imports fail (blocks service start).
- No local stubs for Federation/Core HTTP endpoints; POSTs will 404 even if import hurdle is fixed unless external pantheon is running.
