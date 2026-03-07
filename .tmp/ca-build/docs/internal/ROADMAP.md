# ForgePilot Internal Roadmap

Baseline:
- v1.0.0 Revenue Path SEALED
- Teaser + Paid Blueprint functional
- Fail-closed export enforced
- Durable worker with idempotency + DLQ
- OMEGA SDK integration complete
- FC inline runner (dev-only bridge)

---

# Phase 0 — Stabilize & Observe (Now → First Traction)

Goal: Validate real-world usage patterns before expanding surface area.

Trigger to move forward:
- 50+ paid blueprints
- <5% support issues
- No revenue path regressions

## Hardening

- [ ] Dedicated Federation Runner (replace inline bridge)
- [ ] Stripe webhook strict idempotency enforcement
- [ ] Negative tenant-boundary tests
- [ ] Export authorization audit tests
- [ ] Basic metrics dashboard (conversion + failure rate)

Why:
We don’t expand before execution is production-safe.



---

# Phase 1 — Structured Refinement (After 100 Paid Blueprints)

Trigger:
- 100 paid blueprints
- ≥20% return user rate
- Clear evidence users want iteration

## 1. Multi-Round Teaser Refinement
- Allow iterative refinement cycles
- Persist version history per trace
- Receipt chain per revision
- Diff view between blueprint versions

## 2. Blueprint Versioning
- v1, v2, v3 per trace
- Paid regeneration under same trace
- Immutable historical receipt snapshots

## 3. Advanced Positioning Controls
- Tone presets
- Market sophistication tiering
- Budget-aware blueprint tracks

Goal:
Increase depth without breaking governance.

---

# Phase 2 — Vertical Intelligence (After $5k–$10k MRR)

Trigger:
- Consistent weekly blueprint volume
- Evidence of repeatable patterns by industry

## 4. Vertical Launch Tracks
- SaaS blueprint template
- Services/consulting track
- AI tool / automation product track
- Marketplace model track

Each:
- Still governed workflow
- Still receipt-bound
- Modular blueprint composition

## 5. Market Validation Add-Ons
- Early ICP validation prompts
- Pre-built outreach scripts
- Pricing hypothesis generator

Goal:
Shift from generic co-founder to structured domain acceleration.

---

# Phase 3 — Execution Layer Integration (After $15k MRR)

Trigger:
- Users asking “what next?”
- Blueprint-to-action gap observed

## 6. Blueprint → MarketOps Execution
- Optional workflow to generate:
  - Landing page outline
  - Email campaign sequence
  - Social content scaffolding
- Governed execution via OMEGA

## 7. Launch Kit Bundle
- Brand positioning summary
- 90-day execution dashboard
- Traction tracker template

Goal:
Bridge strategy → execution.

---

# Phase 4 — Monetization Expansion (After Stable Funnel)

Trigger:
- ≥25% blueprint purchase rate
- ≥10% repeat buyers

## 8. Tiered Plans
- $69 Basic
- $149 Advanced (includes refinement loops)
- Team plan (multi-seat, shared blueprint)

## 9. Regeneration Credits
- Pay-per-update blueprint refresh
- Track delta receipts

Goal:
Increase LTV without compromising simplicity.

---

# Phase 5 — Governance & Proof Mode (Optional, Strategic)

Trigger:
- Enterprise or investor interest
- Legal/compliance use cases

## 10. Public Receipt Verification
- Verify blueprint receipt hash publicly
- Validate non-tampering

## 11. Audit-Grade Export Mode
- Immutable blueprint pack
- Trace + receipt bundle

Goal:
Position ForgePilot as “provable AI co-founder.”

---

# Phase 6 — Platformization (Long-Term)

Trigger:
- Multi-product ecosystem (ForgePilot + MarketOps + others)
- ≥$50k MRR

## 12. Cross-Workflow Composition
- Blueprint → Execution → Campaign → Report chain
- Unified trace graph

## 13. SDK Public Exposure
- Allow 3rd-party apps to trigger governed workflows
- Tenant-scoped developer keys

Goal:
Transition from product → platform.

---

# Ideas Outside Timeline (Exploratory / High Ambition)

These are valuable but not justified yet.

- AI-assisted brand identity generation
- Competitive landscape crawler
- Investor pitch deck automation
- Live founder coaching chat mode
- Autonomous experiment execution
- Revenue forecasting engine
- Marketplace for blueprint templates
- Public blueprint marketplace
- Partner ecosystem

These require:
- Significant traction
- Strong data foundation
- Expanded compute budget
- Clear monetization validation

They remain vision-layer items until revenue gates justify them.

---

# Metrics Dashboard (Guides Timeline Decisions)

Core signals:
- Conversion rate (teaser → blueprint)
- Return user rate
- Blueprint regeneration frequency
- Payment webhook error rate
- Worker failure rate
- Queue lag

Thresholds:
- 50 paid users → stabilization complete
- 100 paid users → refinement justified
- $10k MRR → verticalization justified
- $25k MRR → monetization tiers justified
- $50k MRR → platformization justified

---

# Non-Negotiables

- Fail-closed money boundaries
- Idempotent execution
- Receipt integrity
- Tenant isolation
- No silent fallback logic
- No production execution inside FC API process
