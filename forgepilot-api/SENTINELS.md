# ForgePilot API — Architecture Sentinels

**Status:** SEALED
**Scope:** Architecture + Contract Guardrails
**Rule:** No merge to main with sentinel failures.
**Layer:** Server — enforces that bad clients can't break server-side rules.

---

## What these sentinels protect

Sentinels are non-negotiable guardrails that prevent architectural drift and authority weakening.
They are designed to fail closed.

## Required Suites

- `pytest -q` must include all four sentinel files.
- CI must block merges if sentinel suites are skipped or fail.
- The `sentinels` CI job gates `test`, which gates `docker`.

## Failure Philosophy

- **Fail-closed:** If authority cannot be verified, the system must refuse to proceed.
- **No silent downgrade:** Contract drift must be explicit and reviewed.
- **No bypass paths:** Forbidden shortcuts are treated as defects, not optimizations.

## Sentinel Inventory

> Update this list intentionally. Removing or weakening sentinels requires doctrine review.

**Guarantee:** No PromptAirlock bypass, no Keon fail-open, no unauthorized route surface expansion.

| File | ID | Invariant |
|------|----|-----------|
| `test_architecture_boundaries.py` | SENTINEL-1a | FC does not import planner, orchestrator, or relay internals |
| `test_architecture_boundaries.py` | SENTINEL-1b | FC imports only via `FederationClient` — no raw httpx in app code |
| `test_architecture_boundaries.py` | SENTINEL-1c | Keon checkpoint calls only via `keon_runtime_gateway.py` |
| `test_architecture_boundaries.py` | SENTINEL-1d | PromptAirlock is the sole entry point into the intake stage |
| `test_fc_routes_surface.py` | SENTINEL-2a | Zero WebSocket routes — REST-only service |
| `test_fc_routes_surface.py` | SENTINEL-2b | No forbidden path fragments (`/ws`, `/relay`, `/pantheon`, etc.) |
| `test_fc_routes_surface.py` | SENTINEL-2c | All approved routes are present (deletion guard) |
| `test_fc_routes_surface.py` | SENTINEL-2d | No unknown routes outside the approved surface (addition guard) |
| `test_fc_routes_surface.py` | SENTINEL-2e | `/health` has no auth dependency |
| `test_keon_fail_closed.py` | SENTINEL-3a | Keon `DENY` decision blocks execution |
| `test_keon_fail_closed.py` | SENTINEL-3b | Keon timeout is fail-closed — `NetworkError` propagates |
| `test_keon_fail_closed.py` | SENTINEL-3c | Missing decision receipt → hard reject |
| `test_keon_fail_closed.py` | SENTINEL-3d | Invalid receipt format → hard reject |
| `test_keon_fail_closed.py` | SENTINEL-3e | Keon `ALLOW` decision permits execution |
| `test_keon_fail_closed.py` | SENTINEL-3f | Decision receipt required before execute — no bypass |
| `test_intake_stage_enforcement.py` | SENTINEL-4a | Intake rejects `blocked` status from PromptAirlock |
| `test_intake_stage_enforcement.py` | SENTINEL-4b | Intake rejects `rewrite` status from PromptAirlock |
| `test_intake_stage_enforcement.py` | SENTINEL-4c | Intake passes through `approved` status |
| `test_intake_stage_enforcement.py` | SENTINEL-4d | PromptAirlock is always called — cannot be skipped |
| `test_intake_stage_enforcement.py` | SENTINEL-4e | Keon checkpoint is always called — cannot be skipped |
| `test_intake_stage_enforcement.py` | SENTINEL-4f | Route surface snapshot matches drift tripwire hash |
| `test_intake_stage_enforcement.py` | SENTINEL-4g | Forbidden fragments list matches drift tripwire hash |

---

## How to Run

```bash
cd forgepilot-api
pytest -q
```

---

## Drift Tripwires

`SENTINEL-4f` and `SENTINEL-4g` are drift tripwires: they hash the approved route surface and forbidden fragments list. If someone modifies those constants without updating the hash, CI fails.

To update a tripwire after an approved change:
1. Make the intentional change to the constant.
2. Run `python -c "import hashlib, json; print(hashlib.sha256(json.dumps(sorted(<new_value>), sort_keys=True).encode()).hexdigest()[:16])"`.
3. Update the `_APPROVED_*_HASH` constant in the sentinel file.
4. Commit with message: `sentinel(drift): approve <what changed> — <reason>`.

---

## Seal Record

- **Tag:** `forgepilot-sentinels-v1.0.0`
- **Commit:** `293f6676102d96b0a2b67af909fc7c58fb8b5804`
- **Date:** 2026-02-22

