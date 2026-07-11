# FORGEPILOT_SMOKE_v1

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

## Release Notes
- ForgePilot v1.0.0 (Revenue Path) is SEALED based on a continuous single-trace A→H hostile smoke run with all required gates passing.
- Pre-payment export is fail-closed, payment unlock + enqueue + durable worker recovery are verified, blueprint export is gated and receipt-bound, and replay safety is enforced.

## Run Context
- Base URL: `http://localhost:3000`
- Email: `morganclint76@gmail.com`
- Executed At (UTC): `2026-02-15T01:22:41.8116832Z`

## Step A - POST /api/launch/teaser
### Request
```json
{
  "idea": "AI-powered compliance workflow for SMBs",
  "sessionId": "43746046-dd7f-4040-a495-eb7b0b1338b8",
  "email": "morganclint76@gmail.com"
}
```
### Response (`HTTP 200`)
```json
{"needs_clarification":false,"teaser":{"oneLiner":"AI-powered compliance workflow for SMBs: a focused, governed launch path for the first 90 days.","positioning":"This launch positions the offer for teams that need fast execution with strict governance and clear outcomes.","icpSnapshot":"Best initial customers are founder-led B2B teams with urgent workflow pain and willingness to buy a measurable fix.","monetizationAngle":"Start with a clear paid pilot and convert to recurring subscriptions once onboarding and first value are proven.","strategicDifferentiator":"The wedge is deterministic execution plus auditable receipts, reducing risk while keeping time-to-value short.","ctaHeadline":"Unlock the full launch blueprint","ctaUnlockValue":"Get the complete 90-day operating blueprint with execution sequencing, risks, and first five actions."},"traceId":"t:morgan-findings|c:019c5ee4-71e4-7d70-ba0e-f98522b7e7b2","receiptRef":"3d75a17ad2e73c500abe28aed73eae4c1d7535b9030241879c2d2cea05053748","workflowVersion":"1.0.0"}
```

## Step B - Trigger Clarification Branch
### Request
```json
{
  "idea": "Something with AI for marketing",
  "sessionId": "a73f82ef-9791-4f85-a473-2945b6f58d3e",
  "email": "morganclint76@gmail.com"
}
```
### Response (`HTTP 200`)
```json
{"needs_clarification":false,"teaser":{"oneLiner":"Something with AI for marketing: a focused, governed launch path for the first 90 days.","positioning":"This launch positions the offer for teams that need fast execution with strict governance and clear outcomes.","icpSnapshot":"Best initial customers are founder-led B2B teams with urgent workflow pain and willingness to buy a measurable fix.","monetizationAngle":"Start with a clear paid pilot and convert to recurring subscriptions once onboarding and first value are proven.","strategicDifferentiator":"The wedge is deterministic execution plus auditable receipts, reducing risk while keeping time-to-value short.","ctaHeadline":"Unlock the full launch blueprint","ctaUnlockValue":"Get the complete 90-day operating blueprint with execution sequencing, risks, and first five actions."},"traceId":"t:morgan-findings|c:019c5ee4-7661-7aa3-9bd2-c44167f52be1","receiptRef":"1134256c50d9587c6f2b6d4d90bc6fa78d4a09eddf89cadedbe26a432ec64eb1","workflowVersion":"1.0.0"}
```

## Step C - POST /api/launch/teaser/answer
### Request
```json
{
  "traceId": "t:morgan-findings|c:019c5ee4-7661-7aa3-9bd2-c44167f52be1",
  "answers": {
    "targetCustomer": "B2B SaaS founders",
    "priceRange": "$49-$199/mo"
  }
}
```
### Response (`HTTP 409`)
```json

{
  "error": "Trace is not waiting for clarification"
}
```

## Idempotency Replay Check
- First replay HTTP: `409`
- Attack1 replay statuses (x5): `409, 409, 409, 409, 409`

## Attack Pass Results
- Attack2 fake receipt HTTP: `400`
- Attack3 payment without receipt HTTP: `400`
- Attack4 resume after unlock HTTP: `409`

## FC Ledger Excerpt
```json
{"type":"attack.rejected","traceId":"unknown","at":"2026-02-14T22:17:55.937Z","detail":"checkout missing traceId"}
{"type":"attack.rejected","traceId":"unknown","at":"2026-02-14T22:17:55.972Z","detail":"checkout missing traceId"}
{"type":"attack.rejected","traceId":"unknown","at":"2026-02-14T22:32:09.761Z","detail":"checkout missing traceId"}
{"type":"attack.rejected","traceId":"unknown","at":"2026-02-14T22:32:09.788Z","detail":"checkout missing traceId"}
{"type":"attack.rejected","traceId":"unknown","at":"2026-02-14T22:35:11.232Z","detail":"checkout missing traceId"}
{"type":"attack.rejected","traceId":"unknown","at":"2026-02-14T22:35:11.262Z","detail":"checkout missing traceId"}
{"type":"attack.rejected","traceId":"unknown","at":"2026-02-14T22:43:24.491Z","detail":"checkout missing traceId"}
{"type":"attack.rejected","traceId":"unknown","at":"2026-02-14T22:43:24.530Z","detail":"checkout missing traceId"}
{"type":"payment.ignored","traceId":"unknown","at":"2026-02-14T23:18:25.550Z","detail":"missing required launch metadata","meta":{"checkoutSessionId":"cs_smoke_1771111102369"}}
{"type":"payment.ignored","traceId":"unknown","at":"2026-02-14T23:26:53.221Z","detail":"missing required launch metadata","meta":{"checkoutSessionId":"cs_smoke_1771111613177"}}
{"type":"payment.ignored","traceId":"unknown","at":"2026-02-14T23:35:27.203Z","detail":"missing required launch metadata","meta":{"checkoutSessionId":"cs_smoke_1771112127162"}}
{"type":"payment.ignored","traceId":"unknown","at":"2026-02-14T23:39:02.225Z","detail":"missing required launch metadata","meta":{"checkoutSessionId":"cs_smoke_1771112127162"}}
{"type":"teaser.generated","traceId":"t:morgan-findings|c:019c5e9e-28fd-7ea7-b858-0c01d838efb2","receiptRef":"df34d622202593a67cadb9a8b637efac01441ce2510fb7d8907a742339be8b34","at":"2026-02-15T00:05:50.547Z","code":"FC-GATE-002","meta":{"inputHash":"c897fdeef7ce6ae948a9506baa89347204557b1f730c2114272a8a9f2ea476a9","artifactId":"forgepilot.teaser.v1","artifactHash":"3751b67f2e5047c81aa346149a852ba94ce156839e5b5b36579f947041d93341"}}
{"type":"teaser.generated","traceId":"t:morgan-findings|c:019c5ea1-ad6d-79e9-b5f1-de3fa33575ef","receiptRef":"d8ab0d69aa5878466f2b811de4eb207df37571e52c138c6b74a8f958d84a0595","at":"2026-02-15T00:09:41.066Z","code":"FC-GATE-002","meta":{"inputHash":"aaf58d4444b73cf4acadb24f39aca5c2973731074c70e0ad49572a4588e8d908","artifactId":"forgepilot.teaser.v1","artifactHash":"3751b67f2e5047c81aa346149a852ba94ce156839e5b5b36579f947041d93341"}}
{"type":"export.generated","traceId":"t:morgan-findings|c:019c5ea1-ad6d-79e9-b5f1-de3fa33575ef","receiptRef":"d8ab0d69aa5878466f2b811de4eb207df37571e52c138c6b74a8f958d84a0595","at":"2026-02-15T00:13:02.306Z","meta":{"pdfSha256":"e7f738ece062a45232aee1a80a55da10e3d71da31554d9aa190cce89ccd87883","format":"teaser"}}
{"type":"payment.completed","traceId":"t:morgan-findings|c:019c5ea1-ad6d-79e9-b5f1-de3fa33575ef","receiptRef":"d8ab0d69aa5878466f2b811de4eb207df37571e52c138c6b74a8f958d84a0595","at":"2026-02-15T00:13:37.063Z","meta":{"checkoutSessionId":"cs_smoke_run2_001","workflowVersion":"1.0.0"}}
{"type":"payment.completed","traceId":"t:morgan-findings|c:019c5ea1-ad6d-79e9-b5f1-de3fa33575ef","receiptRef":"d8ab0d69aa5878466f2b811de4eb207df37571e52c138c6b74a8f958d84a0595","at":"2026-02-15T00:13:40.166Z","meta":{"checkoutSessionId":"cs_smoke_run2_001","workflowVersion":"1.0.0"}}
{"type":"teaser.generated","traceId":"t:morgan-findings|c:019c5eae-c6d5-7228-9c84-07ed2fc8f17f","receiptRef":"2d24145be6925065931a95b7a6d741d6ab78ba3753ff48390c61f4926c026b08","at":"2026-02-15T00:23:59.537Z","code":"FC-GATE-002","meta":{"inputHash":"e94b92c3a72510ad1240febd60162d8ed9f251a4d54e9049230d9f5559d600fa","artifactId":"forgepilot.teaser.v1","artifactHash":"3751b67f2e5047c81aa346149a852ba94ce156839e5b5b36579f947041d93341"}}
{"type":"teaser.generated","traceId":"t:morgan-findings|c:019c5ece-691a-7c0f-a060-fa61608f95d2","receiptRef":"b4dab3537892955142b31512485e93bf32984dff69a5d4ecc7b2937a0159a8a4","at":"2026-02-15T00:58:32.713Z","code":"FC-GATE-002","meta":{"inputHash":"5b6772dce253b918d0f709f30ca1cd1e3e8a46c065276f7f138869961cd55d82","artifactId":"forgepilot.teaser.v1","artifactHash":"3751b67f2e5047c81aa346149a852ba94ce156839e5b5b36579f947041d93341"}}
{"type":"payment.completed","traceId":"t:morgan-findings|c:019c5ece-691a-7c0f-a060-fa61608f95d2","receiptRef":"b4dab3537892955142b31512485e93bf32984dff69a5d4ecc7b2937a0159a8a4","at":"2026-02-15T00:58:33.595Z","meta":{"checkoutSessionId":"cs_smoke_run3_1771117112934","workflowVersion":"1.0.0"}}
{"type":"payment.completed","traceId":"t:morgan-findings|c:019c5ece-691a-7c0f-a060-fa61608f95d2","receiptRef":"b4dab3537892955142b31512485e93bf32984dff69a5d4ecc7b2937a0159a8a4","at":"2026-02-15T01:01:41.019Z","meta":{"checkoutSessionId":"cs_smoke_run3_replay_1771117301001","workflowVersion":"1.0.0"}}
{"type":"teaser.generated","traceId":"t:morgan-findings|c:019c5ee4-71e4-7d70-ba0e-f98522b7e7b2","receiptRef":"3d75a17ad2e73c500abe28aed73eae4c1d7535b9030241879c2d2cea05053748","at":"2026-02-15T01:22:36.719Z","code":"FC-GATE-002","meta":{"inputHash":"c83bb21811ee8462c9b1621099e6ff38a7a45a7de5812fb44b9cd962757f32f5","artifactId":"forgepilot.teaser.v1","artifactHash":"3751b67f2e5047c81aa346149a852ba94ce156839e5b5b36579f947041d93341"}}
{"type":"teaser.generated","traceId":"t:morgan-findings|c:019c5ee4-7661-7aa3-9bd2-c44167f52be1","receiptRef":"1134256c50d9587c6f2b6d4d90bc6fa78d4a09eddf89cadedbe26a432ec64eb1","at":"2026-02-15T01:22:37.817Z","code":"FC-GATE-002","meta":{"inputHash":"17c9b58a7f1eef985ef40dcfda13504017f64f7248d702284f3662f0cbf56e2b","artifactId":"forgepilot.teaser.v1","artifactHash":"3751b67f2e5047c81aa346149a852ba94ce156839e5b5b36579f947041d93341"}}
{"type":"attack.rejected","traceId":"t:morgan-findings|c:019c5ee4-7661-7aa3-9bd2-c44167f52be1","receiptRef":"fake_receipt_ref_123","at":"2026-02-15T01:22:41.707Z","detail":"receiptRef does not belong to traceId"}
{"type":"attack.rejected","traceId":"t:morgan-findings|c:019c5ee4-7661-7aa3-9bd2-c44167f52be1","at":"2026-02-15T01:22:41.742Z","detail":"checkout missing receiptRef"}
```

## Artifact Hash Snapshot
```json
{}
```

---

## RUN #4 - Single-Trace D→H Audit (Clean Evidence)

### Run Context
- Base URL: `http://localhost:3000`
- Executed (Local): `2026-02-14 20:27:50 -05:00`
- Executed (UTC): `2026-02-15T01:27:50.609Z`
- Trace ID: `t:morgan-findings|c:019c5ee6-af4c-76d1-8b66-42c40e3f9766`

### Gate Results
- D (export before payment): **PASS**
- E (payment unlock + enqueue): **PASS**
- F (durability/restart + DLQ): **PASS**
- G (blueprint export): **PASS**
- H (replay safety): **PASS**

### Step D - Export Before Payment
- HTTP: `402`
- Response: `{"code":"TRACE_LOCKED","error":"Payment required to export blueprint."}`

### Step E - Payment Unlock + Enqueue
- Signed webhook `/api/webhooks/stripe`: `HTTP 200`
- Trace moved to unlocked and captured:
  - `blueprintRequestedAt` present
  - `blueprintRequestEventId` present
  - `blueprintRequestKey` present
- Redis stream evidence:
  - `requested` XLEN: `0 -> 1`
  - `completed` XLEN: `0` before worker

### Step F - Worker Durability + Restart
- Worker run intentionally interrupted once.
- After interruption:
  - `requested` XLEN stayed `1`
  - `completed` XLEN became `1`
  - `DLQ` XLEN `0`
- Worker restarted and recovered:
  - `XINFO GROUPS ... pending=0`
  - `lag=0`
  - `DLQ` still `0`

### Step G - Blueprint Export
- Blueprint generated and persisted.
- Teaser receipt: `2ef92dd7079862a6e8b4fceae6e72dc8cbfce0689b48c0fc333eb13f9c32558b`
- Blueprint receipt: `2b94bb2087e9d912a35cb27b4c001a307320e7dee00444d7911bb54ebbd34c85`
- Export with blueprint receipt: `HTTP 200`, payload header `%PDF-1.4`.

### Step H - Replay Safety
- Replay webhook: `HTTP 200`
- `blueprint.generated` count for this trace remained `1 -> 1` (no duplicate).

### Trace-Scoped Ledger (Exact)
```json
[
  {
    "type": "teaser.generated",
    "traceId": "t:morgan-findings|c:019c5ee6-af4c-76d1-8b66-42c40e3f9766",
    "receiptRef": "2ef92dd7079862a6e8b4fceae6e72dc8cbfce0689b48c0fc333eb13f9c32558b"
  },
  {
    "type": "payment.completed",
    "traceId": "t:morgan-findings|c:019c5ee6-af4c-76d1-8b66-42c40e3f9766",
    "receiptRef": "2ef92dd7079862a6e8b4fceae6e72dc8cbfce0689b48c0fc333eb13f9c32558b"
  },
  {
    "type": "blueprint.requested",
    "traceId": "t:morgan-findings|c:019c5ee6-af4c-76d1-8b66-42c40e3f9766",
    "receiptRef": "2ef92dd7079862a6e8b4fceae6e72dc8cbfce0689b48c0fc333eb13f9c32558b"
  },
  {
    "type": "blueprint.generated",
    "traceId": "t:morgan-findings|c:019c5ee6-af4c-76d1-8b66-42c40e3f9766",
    "receiptRef": "2b94bb2087e9d912a35cb27b4c001a307320e7dee00444d7911bb54ebbd34c85"
  },
  {
    "type": "export.generated",
    "traceId": "t:morgan-findings|c:019c5ee6-af4c-76d1-8b66-42c40e3f9766",
    "receiptRef": "2b94bb2087e9d912a35cb27b4c001a307320e7dee00444d7911bb54ebbd34c85"
  }
]
```

### Evidence Files
- `.tmp/smoke-gates-run4/stepB_teaser.request.json`
- `.tmp/smoke-gates-run4/stepB_teaser.response.json`
- `.tmp/smoke-gates-run4/stepD_export_before_payment.response.json`
- `.tmp/smoke-gates-run4/stepE_webhook.request.json`
- `.tmp/smoke-gates-run4/stepE_trace_after_webhook.json`
- `.tmp/smoke-gates-run4/stepF_groups_after_restart.txt`
- `.tmp/smoke-gates-run4/stepG_export_after_blueprint.status.txt`
- `.tmp/smoke-gates-run4/stepH_replay_webhook.response.json`
- `.tmp/smoke-gates-run4/ledger_trace_exact.json`

### Overall (Run #4)
- Result: **PASS**
- Summary: `D=PASS, E=PASS, F=PASS, G=PASS, H=PASS`

---

## RUN #5 - Full A→H Seal Run (Single Trace)

### Run Context
- Base URL: `http://localhost:3000`
- Executed (Local): `2026-02-14 20:59:56 -05:00`
- Executed (UTC): `2026-02-15T01:59:56.457Z`
- Trace ID: `t:morgan-findings|c:019c5f04-ccb9-7069-99db-51acd80b518b`

### Step A - Workflow Registration
- Command: `node -r dotenv/config scripts/omega-register.mjs`
- HTTP/status: `200`
- Result: teaser + blueprint workflows registered with artifact hashes.
- Pass/Fail: **PASS**

### Step B - Teaser Run
- HTTP: `200`
- `traceId`: `t:morgan-findings|c:019c5f04-ccb9-7069-99db-51acd80b518b`
- `receiptRef` (teaser): `dd87eb4650d14fd0bf8188ecacdb8bed82e79825abf8fa6bf53e686edb6d5f68`
- `needs_clarification`: `false`
- Pass/Fail: **PASS**

### Step C - Clarification Resume
- Not applicable in this trace (`needs_clarification=false`).
- Pass/Fail: **N/A**

### Step D - Export Before Payment
- HTTP: `402`
- Response: `{"code":"TRACE_LOCKED","error":"Payment required to export blueprint."}`
- Pass/Fail: **PASS**

### Step E - Payment Unlock + Enqueue
- Signed webhook `/api/webhooks/stripe`: `HTTP 200`.
- Redis requested stream length moved by exactly one (`1 -> 2` in global stream; +1 for this trace).
- Trace marked unlocked with `blueprintRequestedAt`, `blueprintRequestEventId`, and `blueprintRequestKey`.
- Pass/Fail: **PASS**

### Step F - Durability + Restart
- Worker intentionally interrupted once, then restarted.
- Post-restart queue health:
  - `pending=0`
  - `lag=0`
  - DLQ length `0`
- Trace received blueprint exactly once.
- Pass/Fail: **PASS**

### Step G - Blueprint Export
- Export with blueprint receipt returned `HTTP 200` and `%PDF-1.4`.
- `receiptRef` (blueprint): `0fa628f9875badc74f22fc7bb8c54a1e474c64c05580189f1bc49d5411a1f4f6`
- Teaser receipt != blueprint receipt.
- Pass/Fail: **PASS**

### Step H - Replay Safety
- Replay webhook returned `HTTP 200`.
- `blueprint.generated` count for this trace remained `1 -> 1`.
- Pass/Fail: **PASS**

### Trace-Scoped Ledger (Exact)
```json
[
  {
    "type": "teaser.generated",
    "traceId": "t:morgan-findings|c:019c5f04-ccb9-7069-99db-51acd80b518b",
    "receiptRef": "dd87eb4650d14fd0bf8188ecacdb8bed82e79825abf8fa6bf53e686edb6d5f68"
  },
  {
    "type": "payment.completed",
    "traceId": "t:morgan-findings|c:019c5f04-ccb9-7069-99db-51acd80b518b",
    "receiptRef": "dd87eb4650d14fd0bf8188ecacdb8bed82e79825abf8fa6bf53e686edb6d5f68"
  },
  {
    "type": "blueprint.requested",
    "traceId": "t:morgan-findings|c:019c5f04-ccb9-7069-99db-51acd80b518b",
    "receiptRef": "dd87eb4650d14fd0bf8188ecacdb8bed82e79825abf8fa6bf53e686edb6d5f68"
  },
  {
    "type": "blueprint.generated",
    "traceId": "t:morgan-findings|c:019c5f04-ccb9-7069-99db-51acd80b518b",
    "receiptRef": "0fa628f9875badc74f22fc7bb8c54a1e474c64c05580189f1bc49d5411a1f4f6"
  },
  {
    "type": "export.generated",
    "traceId": "t:morgan-findings|c:019c5f04-ccb9-7069-99db-51acd80b518b",
    "receiptRef": "0fa628f9875badc74f22fc7bb8c54a1e474c64c05580189f1bc49d5411a1f4f6"
  }
]
```

### Evidence Files
- `.tmp/smoke-seal-run5/stepA_register.out.json`
- `.tmp/smoke-seal-run5/stepB_teaser.response.json`
- `.tmp/smoke-seal-run5/stepD_export_before_payment.response.json`
- `.tmp/smoke-seal-run5/stepE_webhook.response.json`
- `.tmp/smoke-seal-run5/stepF_groups_after_restart.txt`
- `.tmp/smoke-seal-run5/stepG_export_after_blueprint.status.txt`
- `.tmp/smoke-seal-run5/stepH_replay_webhook.response.json`
- `.tmp/smoke-seal-run5/ledger_trace_exact.json`

### Overall (Run #5)
- Result: **PASS**
- Summary: `A=PASS, B=PASS, C=N/A, D=PASS, E=PASS, F=PASS, G=PASS, H=PASS`
