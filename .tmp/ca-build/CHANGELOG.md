# Changelog
---

## [v1.0.0] - 2026-02-14
### Added
- `npm run omega:register` dev-only workflow artifact registration command.
- SDK-driven workflow registration script (`scripts/omega-register.mjs`).
- ForgePilot v1.0.0 (Revenue Path) is SEALED based on a continuous single-trace A→H hostile smoke run with all required gates passing.
- Pre-payment export is fail-closed, payment unlock + enqueue + durable worker recovery are verified, blueprint export is gated and receipt-bound, and replay safety is enforced.

### Changed
- `/api/launch/teaser/answer` now resumes via SDK with governed resume input (`answers`).
- Dependency switched to local workspace SDK (`file:../omega-sdk-ts`) for same-cycle contract features.
- Launch checkout enforces trace+receipt metadata binding (fail-closed).

## Context State (Locked)

ForgePilot has completed the OMEGA standardization pivot:

* ✅ SDK-only execution (`omega-sdk-ts`)
* ✅ Workflow artifact registration (dev-mode)
* ✅ Governed resume with input payload
* ✅ JCS canonicalization + input hashing (FC)
* ✅ Ledgered resume events (`FC-GATE-003`)
* ✅ Strict traceId enforcement
* ✅ receiptRef required on teaser success
* ✅ Zod fail-closed contract validation
* ✅ Stripe metadata binding (trace + receipt)
* ✅ Cross-SDK parity (TS / C# / Python)

Whitepapers + positioning work is complete and published separately.

## Seal Declaration
- Status: **SEALED (Revenue Path)**
- Scope: ForgePilot v1 revenue path validation under current code and configuration.
- Evidence basis: **RUN #5** — continuous single-trace A→H execution.
- ForgePilot Git SHA: `6f46715`
- SDK package: `omega-sdk-1.0.0.tgz`
- SDK SHA256: `D190F11D960A94A07EAE8E3DECCE8CC88533D21E6F39754BDD5F533103DD6D0A`
- Federation Core image ID: `sha256:109b46f0722abb4743190daa621072c60a07bccb98c5b41105e93c2c8b56703c`
- Gate outcome: `A=PASS, B=PASS, C=N/A, D=PASS, E=PASS, F=PASS, G=PASS, H=PASS`
- Conclusion: Revenue-critical controls are verified end-to-end for the sealed trace, with no bypass, replay, or durability violations observed.
- Constraint: Federation Core inline runner is **dev-only**; production requires a dedicated runner/execution plane.

## v1 Release Exit Criteria (Testable)
- Scope lock: no architecture expansion, no new substrate work, ship v1 behavior only.
- User journey completeness: a real user can submit idea, clarify if requested, receive teaser, unlock via payment, and download export PDF.
- Full-run validation: one continuous single-trace A->H hostile smoke run passes with evidence.
- OMEGA teaser/resume smoke: `/api/launch/teaser` and `/api/launch/teaser/answer` are exercised; `traceId`, `receiptRef`, and resume ledger evidence are captured.
- Run integrity: each run records artifact-bound trace, `inputHash` (including resume input hash where applicable), workflow artifact resolution, and no resume state corruption.
- Export artifact gate: `/api/launch/export` is fail-closed before unlock and returns PDF only when authorized; output includes `traceId`, `receiptRef`, workflow version, and line `Generated under OMEGA Governed Execution`.
- Checkout binding hardening: checkout creation requires valid `traceId` + `receiptRef`; both persist into Stripe metadata; webhook verifies metadata integrity.
- Payment execution guard: no post-payment execution path is allowed without valid receipt binding.
- Abuse controls: rate limits hold (`5 requests / 15 min` per IP+email for unlock link), one-time token enforcement holds, resume replay is safe, unlock/checkout flows are idempotent.
- Replay and duplicate safety: webhook replay does not create duplicate `blueprint.generated` artifacts.
- Durability behavior: queued blueprint work survives interruption/restart and completes without DLQ growth for clean-path runs.
- Structured operational logs exist for `teaser.generated`, `teaser.clarify`, `teaser.resumed`, `payment.created`, and `export.generated`.
- SDK boundary: no custom direct OMEGA HTTP transport logic exists in app workflow execution paths (SDK-only calls).
- Production caveat: FC inline runner remains dev-only; production requires dedicated runner/execution plane before production rollout.

---
