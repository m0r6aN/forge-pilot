# forgepilot.blueprint.v1

Paid workflow for post-checkout blueprint generation.

## Purpose

- Consumes teaser-aligned trace state after payment unlock.
- Generates blueprint artifact.
- Stores artifact in workflow memory.
- Emits a new receipt.

## Responsibility Boundary

- Federation Core (FC) is the control plane: run intent, canonical state, governance boundary.
- ForgePilot worker is the execution plane for this workflow.
- Runner lifecycle logs for `forgepilot.blueprint.v1` are expected in worker/stream consumer logs, not FC API logs.
- Missing FC `RUNNER/DISPATCH` logs alone is not evidence of execution failure for this workflow.

## Workflow Topology

1. `blueprint_generate`
2. `memory_store`
3. `receipt_emit`

## Redis Event Contract

Request channel: `omega.forgepilot.blueprint.requested.v1`

```json
{
  "specVersion": "1.0",
  "eventType": "forgepilot.blueprint.requested",
  "eventVersion": "1",
  "eventId": "uuid",
  "time": "ISO8601",
  "traceId": "string",
  "tenantId": "string",
  "correlationId": "string",
  "idempotencyKey": "sha256(traceId + ':blueprint:v1')",
  "producer": { "service": "forgepilot-webhook", "env": "prod" },
  "payload": {
    "email": "verified@domain.com",
    "workflowId": "forgepilot.blueprint.v1",
    "workflowVersion": "1.0.0",
    "trigger": {
      "paymentProvider": "stripe",
      "paymentEventId": "string",
      "checkoutSessionId": "string",
      "teaserReceiptRef": "string"
    }
  }
}
```

Completed channel: `omega.forgepilot.blueprint.completed.v1`

- `payload.status = success|failed`
- success includes `receiptRef` and `artifactKey`
- failed includes `errorCode` and `errorMessage`

Dead-letter channel: `omega.forgepilot.blueprint.dlq.v1`

## Guardrails

- Never run before trace unlock.
- Never run without teaser payload + success receipt binding.
- Idempotent by trace key: duplicate requests publish existing result.
- Fail closed if workflow returns missing `receiptRef`.
