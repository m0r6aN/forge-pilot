# ForgePilot Launch Readiness Checklist

Date: 2026-02-13

Scope:
- v1 offer only: Launch Blueprint ($69)
- Stripe-only billing
- Evidence + Federation execution path enabled
- Blueprint worker queue enabled

## 1) Stripe Price ID for $69
- Status: `REQUIRES ENV VERIFICATION`
- Code wiring:
  - `src/app/api/payments/create_checkout/route.ts`
  - Uses `STRIPE_LAUNCH_BLUEPRINT_PRICE_ID` (fallback: `STRIPE_STARTER_PRICE_ID`)
- Verify:
  1. Ensure `STRIPE_SECRET_KEY` and `STRIPE_LAUNCH_BLUEPRINT_PRICE_ID` are set in production.
  2. In Stripe dashboard/API, confirm the referenced recurring price amount is exactly `$69.00`.

## 2) Webhook Verification
- Status: `PASS (code path)`, `REQUIRES RUNTIME TEST`
- Code wiring:
  - `src/app/api/webhooks/stripe/route.ts`
  - Uses `stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET)`
- Verify:
  1. Ensure `STRIPE_WEBHOOK_SECRET` is set in production.
  2. Send test webhook from Stripe CLI/dashboard and confirm `200` response.
  3. Confirm `checkout.session.completed` updates user plan and triggers email API call.

## 3) Evidence Route Works Publicly
- Status: `PASS (route access model)`
- Route:
  - `src/app/evidence/[pack_hash]/page.tsx`
- Notes:
  - Middleware protected routes do not include `/evidence`.
  - See `src/middleware.ts`.
- Verify:
  1. Open `/evidence/<known_pack_hash>` in an incognito window.
  2. Confirm page renders without auth redirect.

## 4) Federation URL Env Wired
- Status: `PASS (code path)`, `REQUIRES ENV SET`
- Code wiring:
  - `src/app/api/launch/execute/route.ts`
  - Uses `FEDERATION_CORE_URL` for MarketOps manifest submission.
- Verify:
  1. Set `FEDERATION_CORE_URL`.
  2. Trigger Beta execution from blueprint page.
  3. Confirm response shows `"federation": { "submitted": true }`.

## 5) JWT Works in Production
- Status: `PASS (hardened)`
- Code wiring:
  - `src/app/api/auth/login/route.ts`
  - `src/app/api/auth/me/route.ts`
  - `src/lib/auth/jwt.ts` (now fails when `JWT_SECRET` missing)
- Verify:
  1. Ensure `JWT_SECRET` is set.
  2. Login should set `auth-token` + `refresh-token` cookies.
  3. `GET /api/auth/me` should return user and refresh access token when expired.

## 6) Email Receipt After Purchase Works
- Status: `PASS (code path)`, `REQUIRES RUNTIME TEST`
- Code wiring:
  - `src/app/api/webhooks/stripe/route.ts` calls `/api/email/send` with template `subscription-confirmed`
  - Templates: `src/lib/email/templates.ts`
  - Sender service: `src/lib/email/email-service.ts`
- Verify:
  1. Ensure `RESEND_API_KEY` and `EMAIL_FROM` are set.
  2. Complete test checkout in Stripe test mode.
  3. Confirm receipt email is delivered with `subscription-confirmed` template.

## 7) Blueprint Worker Queue + Completion
- Status: `PASS (code path)`, `REQUIRES RUNTIME TEST`
- Code wiring:
  - Webhook publish: `src/app/api/webhooks/stripe/route.ts`
  - Worker runner: `scripts/blueprint-worker.ts`
  - Worker logic: `src/lib/launch/blueprint-worker.ts`
- Verify:
  1. Ensure `REDIS_URL` is set and worker process is running (`npm run omega:blueprint-worker`).
  2. Complete test checkout in Stripe test mode.
  3. Confirm ledger shows `blueprint.requested` then `blueprint.generated`.
  4. Confirm trace now includes `blueprint`, `blueprintReceiptRef`, and `blueprintGeneratedAt`.

## Launch Gate
- Do not launch until every item above is runtime-verified in production-like environment.
