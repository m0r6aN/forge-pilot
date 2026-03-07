# ForgePilot Azure Deployment Checklist

Date: 2026-02-15  
Scope: Production deployment targets = Azure Containers + Azure Static Websites

## 0) Deployment Topology Lock
- [ ] Confirm topology decision is documented:
  - `forgepilot-web` (runtime/API) runs in Azure Containers.
  - `forgepilot-blueprint-worker` runs in Azure Containers.
  - Static website hosts only static frontend/marketing assets.
- [ ] Confirm no one expects static hosting to execute Next.js API routes.
- [ ] Confirm API base URL used by static frontend points to container runtime domain.

## 1) Azure Resource Preflight
- [ ] Resource Group created.
- [ ] Azure Container Registry (ACR) created.
- [ ] Container runtime target created (Container Apps Environment or AKS/App Service for Containers).
- [ ] Static website target created (Azure Static Web Apps or Storage Static Website + CDN/Front Door).
- [ ] Key Vault created for production secrets.
- [ ] Log Analytics/Application Insights wired for container logs and metrics.
- [ ] Custom domains + TLS certificates provisioned for:
  - runtime API domain
  - static website domain

## 2) Container Build and Release
- [ ] Build immutable image for `forgepilot-web` and push to ACR.
- [ ] Build immutable image for `forgepilot-blueprint-worker` and push to ACR.
- [ ] Images are pinned by digest in deployment manifests.
- [ ] Release version and git SHA are recorded in deployment notes.

## 3) Runtime Secrets and Env (Containers)
- [ ] Secrets sourced from Key Vault (not plaintext in manifests).
- [ ] Required env vars present for `forgepilot-web`:
  - `OMEGA_FEDERATION_URL`
  - `OMEGA_API_KEY`
  - `OMEGA_TENANT_ID`
  - `OMEGA_ACTOR_ID`
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `STRIPE_LAUNCH_BLUEPRINT_PRICE_ID`
  - `REDIS_URL`
  - `JWT_SECRET`
  - `NEXT_PUBLIC_URL`
- [ ] Required env vars present for `forgepilot-blueprint-worker`:
  - `REDIS_URL`
  - `OMEGA_FEDERATION_URL`
  - `OMEGA_API_KEY`
  - `OMEGA_TENANT_ID`
  - `OMEGA_ACTOR_ID`
- [ ] Production guard confirmed:
  - FC inline runner disabled in prod.
  - Dedicated runner/execution plane enabled.

## 4) Runtime Network and Access
- [ ] Runtime API endpoint publicly reachable over HTTPS.
- [ ] Worker has egress to Redis + Federation endpoint.
- [ ] CORS configured to allow static website origin(s) only.
- [ ] Stripe can reach webhook endpoint (`/api/webhooks/stripe`) from internet.
- [ ] IP/network restrictions documented (if enabled).

## 5) Static Website Release
- [ ] Static build artifact generated from approved commit.
- [ ] Static site deployed to Azure target.
- [ ] Public runtime API base URL injected into static config.
- [ ] Route behavior verified (no static rewrite collisions with app paths).
- [ ] Cache invalidation/CDN purge executed for release.

## 6) Stripe and Payment Hardening
- [ ] Stripe webhook endpoint set to production runtime API URL.
- [ ] Webhook signing secret matches runtime secret.
- [ ] Test event succeeds with `200`.
- [ ] Checkout metadata contains `traceId`, `receiptRef`, `workflowVersion`.
- [ ] Replay event does not duplicate blueprint generation.

## 7) Production Smoke (Required)
- [ ] Run one continuous single-trace `A->H` hostile smoke in production-like environment:
  - A register
  - B teaser
  - C clarify (if requested)
  - D export before payment fail-closed
  - E payment unlock + enqueue
  - F durability/restart
  - G blueprint export
  - H replay safety
- [ ] Save evidence pack with:
  - traceId
  - teaser and blueprint receiptRef
  - stream/group state proof
  - trace-scoped ledger events
  - PDF hash/header proof

## 8) Observability and Alerts
- [ ] Structured logs visible for:
  - `teaser.generated`
  - `teaser.clarify`
  - `teaser.resumed`
  - `payment.created`
  - `payment.completed`
  - `blueprint.requested`
  - `blueprint.generated`
  - `export.generated`
- [ ] Alerts configured for:
  - webhook failures
  - worker crashloop
  - DLQ growth
  - elevated 5xx rates
  - queue lag threshold

## 9) Rollback Readiness
- [ ] Previous stable image digests recorded.
- [ ] One-command rollback documented for web and worker.
- [ ] Rollback smoke verifies:
  - teaser endpoint healthy
  - webhook accepted
  - worker consumes queue
- [ ] Incident owner and rollback approval path documented.

## 10) Go/No-Go Gate
- [ ] All sections 0-9 complete.
- [ ] No open Sev-1/Sev-2 production blockers.
- [ ] Release owner signs off.
- [ ] Product owner signs off.

## Definition of Deploy-Done
- [ ] ForgePilot production runtime is reachable and healthy.
- [ ] Payment-to-blueprint path is fail-closed, durable, and replay-safe.
- [ ] Evidence pack for current release is stored and linked from release notes.
