# ForgePilot v1 — Production Runbook

**Version:** 1.0.0
**Date:** 2026-02-20
**Scope:** Azure deployment of the Idea → Teaser → Blueprint flow

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Environment Variables](#environment-variables)
3. [Startup Sequence](#startup-sequence)
4. [Database Setup](#database-setup)
5. [Seed Data (First Deploy Only)](#seed-data-first-deploy-only)
6. [Running Tests](#running-tests)
7. [E2E Smoke Test](#e2e-smoke-test)
8. [Acceptance Criteria Checklist](#acceptance-criteria-checklist)
9. [Open Risks & Follow-Up Items](#open-risks--follow-up-items)

---

## Architecture Overview

```
User Browser
    │
    ▼
ForgePilot (Next.js)
  - /api/launch/teaser       →  runs forgepilot.teaser.v1 via omega-core FC
  - /api/launch/teaser/answer →  resumes paused run (clarification gate)
  - /api/launch/blueprint    →  runs forgepilot.blueprint.v1 via omega-core FC
    │
    │  HTTP  Bearer OMEGA_API_KEY
    │  X-Tenant-Id: OMEGA_TENANT_ID
    ▼
omega-core Federation Core  (FastAPI, port 9405)
  - POST /api/fc/runs                       create/resume workflow run
  - GET  /api/fc/runs/{run_id}              poll run status
  - GET  /api/fc/registry/domain-profiles/  fetch domain enrichment
    │
    ├── FC Inline Runner (background loop)
    │     forgepilot.teaser.v1   → poml_renderer + Anthropic API
    │     forgepilot.blueprint.v1 → poml_renderer + Anthropic API
    │
    └── MongoDB
          fc_workflow_runs         (run state)
          fc_workflow_run_logs
          fc_workflow_gates
          workflow_definitions     (registry)
          prompt_assets
          keon_policies
          domain_profiles
```

**POML resolution order (forgepilot_runner.py):**
1. `FORGEPILOT_POML_PATH` env override (for custom mounts)
2. `../../forgepilot/workflows/forgepilot/teaser.v1/prompts.poml` (sibling repo, dev)
3. `/repos/forgepilot/workflows/forgepilot/teaser.v1/prompts.poml` (Docker mount)
4. Inline hardcoded fallback (last resort)

---

## Environment Variables

### omega-core (Federation Core)

| Variable | Required | Default | Description |
|---|---|---|---|
| `MONGODB_URI` | Yes (prod) | — | MongoDB connection string |
| `FC_STORAGE_BACKEND` | Yes (prod) | `sqlite` | Set to `mongodb` |
| `ANTHROPIC_API_KEY` | Yes | — | Anthropic API key for LLM calls |
| `FORGEPILOT_LLM_MODEL` | No | `claude-sonnet-4-6` | Model to use for teaser/blueprint |
| `FORGEPILOT_MAX_TOKENS` | No | `4096` | Max tokens per LLM call |
| `FORGEPILOT_POML_PATH` | No | — | Override POML file directory |
| `FC_API_KEY` | Yes | — | Shared secret validated by FC middleware |
| `DEV_BEHAVIORAL_DEBUG` | No | `false` | Verbose behavioral gate logging |

### ForgePilot (Next.js)

| Variable | Required | Default | Description |
|---|---|---|---|
| `OMEGA_FEDERATION_URL` | Yes | — | Base URL of omega-core FC, e.g. `https://omega-core.internal` |
| `OMEGA_API_KEY` | Yes | — | Must match `FC_API_KEY` in omega-core |
| `OMEGA_TENANT_ID` | Yes | — | Tenant identifier, e.g. `forgepilot-prod` |
| `NEXT_PUBLIC_APP_URL` | Yes | — | Public URL of ForgePilot |
| `NEXTAUTH_SECRET` | Yes | — | NextAuth session secret |
| `DATABASE_URL` | Yes | — | Postgres/Supabase for user/session storage (FP-side only) |

**Azure Key Vault secrets to provision:**
- `omega-api-key` → set as `OMEGA_API_KEY` + `FC_API_KEY`
- `anthropic-api-key` → set as `ANTHROPIC_API_KEY`
- `mongodb-uri` → set as `MONGODB_URI`

---

## Startup Sequence

### 1. MongoDB

Ensure MongoDB is running and accessible. For Azure:
- Use Cosmos DB for MongoDB API (`MONGODB_URI` = Cosmos connection string), or
- Deploy a MongoDB Atlas cluster and add the Cosmos DB connection string

### 2. omega-core Federation Core

```bash
# With MongoDB backend enabled
export FC_STORAGE_BACKEND=mongodb
export MONGODB_URI="mongodb+srv://..."
export ANTHROPIC_API_KEY="sk-ant-..."
export FC_API_KEY="<shared-secret>"

# Start
cd /repos/omega-core
uvicorn services.federation_core.main:app --host 0.0.0.0 --port 9405
```

Verify health:
```bash
curl http://localhost:9405/api/fc/health
# Expected: {"status": "ok", ...}
```

### 3. Seed (first deploy only — see section below)

### 4. ForgePilot Next.js

```bash
export OMEGA_FEDERATION_URL="http://omega-core:9405"
export OMEGA_API_KEY="<shared-secret>"
export OMEGA_TENANT_ID="forgepilot-prod"

cd /repos/forgepilot
npm run build && npm start
```

---

## Database Setup

FC manages its own MongoDB collections via `MongoDBBackend.initialize()`, which runs on startup and creates indexes automatically. No manual schema migration required.

Collections created automatically:
- `fc_workflow_runs` — run state (indexed on `run_id`, `tenant_id+created_at`, `status`)
- `fc_workflow_run_logs`
- `fc_workflow_gates`
- `fc_workflow_decisions`
- `fc_workflow_receipts`
- `fc_terminate_guards`
- `fc_workflow_artifacts`

Registry collections are created by the seed script (next section).

---

## Seed Data (First Deploy Only)

The seed script loads the ForgePilot v1 workflow definitions, POML prompts, and keon behavioral policy into MongoDB. It is **idempotent** — safe to re-run.

```bash
cd /repos/omega-core
export MONGODB_URI="mongodb+srv://..."

python services/federation_core/scripts/seed_forgepilot_v1.py
```

**What gets seeded:**

| Collection | Document | Key |
|---|---|---|
| `prompt_assets` | Teaser POML prompt | `forgepilot.prompt.teaser.v1` |
| `prompt_assets` | Blueprint POML prompt | `forgepilot.prompt.blueprint.v1` |
| `workflow_definitions` | Teaser workflow YAML | `forgepilot.idea_to_blueprint.v1` |
| `keon_policies` | Behavioral policy | `keon.policy.behavioral.v1` |
| `domain_profiles` | Landscaping example | `landscaping` / `domain.schema.v1` |

---

## Running Tests

### omega-core unit tests (no external deps required)

```bash
cd /repos/omega-core
pip install -e ".[dev]"

# Stub-mode tests (no ANTHROPIC_API_KEY needed)
pytest tests/forgepilot/test_forgepilot_runner.py -v

# MongoDB registry tests (requires MONGODB_URI)
MONGODB_URI="mongodb://localhost:27017" \
pytest tests/forgepilot/test_mongo_registry.py -v
```

### ForgePilot TypeScript unit tests

```bash
cd /repos/forgepilot

# Domain profile hydration unit tests
node --experimental-test-runner --import tsx \
  src/lib/domain/hydrateDomainProfile.test.ts

# Or via npm (if test script configured):
npm test -- --grep hydrateDomainProfile
```

### forgepilot-api (Python campaign API)

```bash
cd /repos/forgepilot/forgepilot-api
pip install -e ".[dev]"
pytest -v
```

---

## E2E Smoke Test

Runs against live omega-core + ForgePilot instances. Hard checks on FC health and teaser run execution. Soft checks on registry endpoints.

```bash
cd /repos/forgepilot

# Local dev:
OMEGA_API_KEY=dev-api-key \
./scripts/smoke-e2e-v1.sh http://localhost:3000 http://localhost:9405

# Azure staging:
OMEGA_API_KEY="<secret>" \
OMEGA_TENANT_ID="forgepilot-staging" \
./scripts/smoke-e2e-v1.sh \
  https://forgepilot-staging.azurewebsites.net \
  https://omega-core-staging.internal
```

**Smoke test coverage:**

| # | Test | Hard/Soft |
|---|---|---|
| 1 | omega-core FC health endpoint | Hard |
| 2 | Create `forgepilot.teaser.v1` run | Hard |
| 3 | Poll run to `completed` status (30 s max) | Hard |
| 4 | Output payload contains `teaser` key | Hard |
| 5 | Register domain profile in registry | Soft |
| 6 | Retrieve domain profile from registry | Soft |

---

## Acceptance Criteria Checklist

All items below must be green before declaring ForgePilot v1 production-ready.

### Workflow Execution

- [x] `POST /api/fc/runs` with `workflow_id=forgepilot.teaser.v1` creates a run and reaches `completed` status
- [x] FC inline runner calls real Anthropic API (not stubs) when `ANTHROPIC_API_KEY` is set
- [x] Stub fallback fires correctly when `ANTHROPIC_API_KEY` is absent (dev/CI safety)
- [x] `forgepilot.blueprint.v1` workflow reaches `completed` status with blueprint output
- [x] POML prompts loaded from registry (MongoDB) or file fallback (4-path resolution)

### Storage

- [x] FC uses MongoDB backend when `FC_STORAGE_BACKEND=mongodb` + `MONGODB_URI` set
- [x] FC falls back to SQLite when env vars absent (dev default unchanged)
- [x] MongoDB indexes created on startup without manual migration
- [x] Registry collections: `workflow_definitions`, `prompt_assets`, `keon_policies`, `domain_profiles`

### ForgePilot Integration

- [x] `hydrateDomainProfile.ts` calls omega-core registry (not Supabase)
- [x] Domain profile hydration returns `null` gracefully on any failure (never throws)
- [x] Teaser route does not fail-closed on missing domain profile
- [x] Blueprint route wired: `POST /api/launch/blueprint` → `runGovernedWorkflow`
- [x] Launch session UI shows blueprint step after teaser completes

### Tests

- [x] `tests/forgepilot/test_forgepilot_runner.py` — POML parsing, JSON extraction, stub fallback
- [x] `tests/forgepilot/test_mongo_registry.py` — MongoDB registry CRUD (skipped without `MONGODB_URI`)
- [x] `src/lib/domain/hydrateDomainProfile.test.ts` — 12 unit tests, all graceful degradation paths
- [x] `scripts/smoke-e2e-v1.sh` — E2E smoke harness

### Seeding

- [x] Seed script idempotent (safe to re-run)
- [x] Teaser POML prompt seeded from disk file `workflows/forgepilot/teaser.v1/prompts.poml`
- [x] Blueprint POML prompt seeded

---

## Open Risks & Follow-Up Items

### P0 — Must resolve before production traffic

| Risk | Detail | Action |
|---|---|---|
| **Payment gate before blueprint** | The blueprint step has no payment check. Any user who completes the teaser can request a blueprint for free. | Add Stripe receipt verification to `POST /api/launch/blueprint` before enabling in prod. |
| **Azure Key Vault wiring** | `ANTHROPIC_API_KEY`, `OMEGA_API_KEY`, `MONGODB_URI` must be provisioned in Key Vault and injected into container env. | Run `scripts/setup-secrets.sh` against staging subscription; verify before cutover. |

### P1 — Required for GA stability

| Risk | Detail | Action |
|---|---|---|
| **FC poll timeout in ForgePilot** | `runGovernedWorkflow` uses 90 s timeout, 2 s poll. If the Anthropic API is slow, the request may timeout before the run completes. | Monitor p95 LLM latency. Increase `timeoutMs` or move to webhook/SSE if needed. |
| **POML blueprint file on disk** | Blueprint runner resolves `workflows/forgepilot/blueprint.v1/prompts.poml` from disk (4-path resolution). If the path is wrong in the container, it falls to the inline fallback. | Verify Docker build copies `forgepilot/workflows/` into the omega-core container image at `/repos/forgepilot/workflows/`. |
| **asyncio.to_thread blocking** | The FC event loop uses `asyncio.to_thread()` for sync Anthropic calls. Under high concurrency, thread pool exhaustion is possible. | Set `ANTHROPIC_MAX_RETRIES=0` and monitor thread pool metrics. Consider `httpx`-based async Anthropic client for v1.1. |

### P2 — Follow-up after v1 launch

| Item | Detail |
|---|---|
| **Critique loop** | `__behavioral_policy_hint` rewrite path is wired in `runGovernedWorkflow` but the critique workflow is stubbed as disabled. Enable post-launch once the critique policy is tuned. |
| **Domain profile auto-seeding** | Currently one landscaping domain profile is seeded manually. Productionize the domain profile ingestion pipeline. |
| **Blueprint schema validation** | FC runner normalizes blueprint output but does not validate against `output.schema.json`. Add JSON Schema validation in v1.1. |
| **Clarification gate on blueprint** | Blueprint runner does not support paused/gate state. If the LLM asks for more info, the run fails. Add clarification pass for blueprint in v1.1. |
| **Pricing page gating** | `src/app/pricing/page.tsx` exists but payment is not enforced at the API level. Full Stripe integration needed. |

---

## Commit Summary

### omega-core
| Hash | Message |
|---|---|
| `5f8583e` | feat(fc-runner): replace stub inline runner with real POML+LLM execution |
| `89b2922` | feat(fc-storage): add MongoDB backend for FC runs and registry collections |
| `7d1a451` | feat(fc-seed): add ForgePilot v1 seed script |

### forgepilot
| Hash | Message |
|---|---|
| `f1adcc8` | fix(domain): replace Supabase domain profile hydration with omega-core registry |
| `da20c9b` | feat(launch): add blueprint route and blueprint step to launch session |
| `c9b8766` | test(forgepilot-v1): add smoke e2e script and domain profile unit tests |
