# FORGEPILOT_SMOKE_v1

## Run Context
- Base URL: `http://localhost:3000`
- Executed (Local): `2026-02-14 18:40:09 -05:00`
- Executed (UTC): `2026-02-14T23:40:09.524Z`
- ForgePilot Git SHA: `6f46715`
- SDK Tarball: `omega-sdk-1.0.0.tgz`
- SDK Tarball SHA256: `D190F11D960A94A07EAE8E3DECCE8CC88533D21E6F39754BDD5F533103DD6D0A`
- FC Image: `omega-core-federation_core`
- FC Image Digest: `sha256:31501dcd75701f8867e2e50387e210ea08312e5b861ec4a5f4f7370fddd024ca`

## Gate Rule
- This run follows: if any step fails, list failing boundary and stop.

## Step A - Workflow Registration
- Command / request: `node -r dotenv/config scripts/omega-register.mjs`
- HTTP status: `200` (command succeeded)
- traceId: `n/a`
- receiptRef: `n/a`
- Expected vs actual: expected both teaser + blueprint workflows registered with artifact hashes; actual returned 2 registrations with hashes.
- Pass/Fail: **PASS**

```json
[
  {
    "workflowId": "forgepilot.teaser.v1",
    "version": "1.0.0",
    "idempotent": false
  },
  {
    "workflowId": "forgepilot.blueprint.v1",
    "version": "1.0.0",
    "idempotent": false
  }
]
```

## Step B - Teaser Run
- Command / request: `POST /api/launch/teaser`
- HTTP status: `502`
- traceId: `n/a` (request failed before usable response payload)
- receiptRef: `n/a`
- Expected vs actual: expected `200` with teaser/clarification payload and trace; actual `502` timeout after 120s with FC run still `pending`.
- Pass/Fail: **FAIL**

### Request
```json
{
  "idea": "AI compliance copilot for SMB HR teams",
  "email": "smoke-runner@example.com",
  "sessionId": "656c88bb-ee4a-43c1-9368-59554eafc6e9"
}
```

### Response
```json
{
  "error": "Failed to generate teaser via OMEGA",
  "details": {
    "name": "Error",
    "message": "OMEGA run timeout: runId=76825e8b-3467-40ad-a01d-141906ab2441, elapsedMs=120007, status=pending, currentStep=unknown, gateId=none"
  }
}
```

## Failing Boundary
- Boundary: **Execution plane not progressing FC runs** (`runId=76825e8b-3467-40ad-a01d-141906ab2441` stayed `pending` until timeout).
- Impact: Cannot produce teaser `traceId`/`receiptRef`; downstream hostile steps C-H are blocked by design.

## Key Log Excerpts
### FC
```text
GET /api/fc/runs/76825e8b-3467-40ad-a01d-141906ab2441?include_gates=true -> 200 (repeated polling)
event: "Getting run: 76825e8b-3467-40ad-a01d-141906ab2441, tenant=morgan-findings"
No dispatch/runner lifecycle event observed for this run during polling window.
```

### Worker
```text
> npm run omega:blueprint-worker
> tsx scripts/blueprint-worker.ts
```

## Ledger Proof
```json
{"type":"payment.ignored","traceId":"unknown","detail":"missing required launch metadata","meta":{"checkoutSessionId":"cs_smoke_1771112127162"}}
{"type":"payment.ignored","traceId":"unknown","detail":"missing required launch metadata","meta":{"checkoutSessionId":"cs_smoke_1771112127162"}}
```

## Steps C-H
- Not executed.
- Reason: Step B failure hit stop rule.

## Overall
- Result: **FAIL (NOT SEALED)**
- Summary: `A=PASS, B=FAIL, C-H=BLOCKED`
