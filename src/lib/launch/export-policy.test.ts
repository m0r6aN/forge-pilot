import test from 'node:test'
import assert from 'node:assert/strict'
import type { LaunchTraceState } from './runtime-store'
import { enforceBlueprintExportPolicy } from './export-policy'

function buildTrace(overrides: Partial<LaunchTraceState> = {}): LaunchTraceState {
  return {
    traceId: 't:morgan-findings|c:test-trace-001',
    sessionId: '11111111-1111-4111-8111-111111111111',
    email: 'smoke-runner@example.com',
    idea: 'Test idea',
    advancedOptions: {
      colorMode: 'none',
      hexColors: [],
      colorVibe: null,
      tone: null,
      budget: null,
    },
    clarificationAnswers: {},
    workflowVersion: '1.0.0',
    artifactId: 'forgepilot.teaser.v1',
    artifactHash: 'hash',
    inputHash: 'input-hash',
    status: 'teaser_ready',
    teaser: {
      oneLiner: 'One liner',
      positioning: 'Positioning',
      icpSnapshot: 'ICP',
      monetizationAngle: 'Monetization',
      strategicDifferentiator: 'Differentiator',
      ctaHeadline: 'CTA',
      ctaUnlockValue: 'Unlock value',
    },
    resumeRecords: {},
    receipts: [
      {
        receiptRef: 'teaser-receipt',
        class: 'success',
        source: 'teaser',
        createdAt: new Date().toISOString(),
      },
    ],
    payment: {},
    exports: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

test('locked trace fails with TRACE_LOCKED (402)', () => {
  const trace = buildTrace({ status: 'teaser_ready' })
  const result = enforceBlueprintExportPolicy(trace, 'teaser-receipt')
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.equal(result.status, 402)
  assert.equal(result.code, 'TRACE_LOCKED')
})

test('unlocked trace without blueprint fails with BLUEPRINT_NOT_READY (409)', () => {
  const trace = buildTrace({ status: 'unlocked', blueprint: undefined, blueprintReceiptRef: undefined })
  const result = enforceBlueprintExportPolicy(trace, 'teaser-receipt')
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.equal(result.status, 409)
  assert.equal(result.code, 'BLUEPRINT_NOT_READY')
})

test('unlocked trace with blueprint requires blueprint receipt', () => {
  const trace = buildTrace({
    status: 'unlocked',
    blueprint: {
      title: 'Blueprint',
      executiveThesis: 'Thesis',
      offerArchitecture: 'Offer',
      monetizationModel: 'Model',
      distributionStrategy: 'Dist',
      ninetyDayPlan: {
        weeks1to3: 'W1-3',
        weeks4to8: 'W4-8',
        weeks9to12: 'W9-12',
      },
      riskMitigation: 'Risk',
      firstFiveActions: ['A1', 'A2', 'A3', 'A4', 'A5'],
    },
    blueprintReceiptRef: 'blueprint-receipt',
  })
  const result = enforceBlueprintExportPolicy(trace, 'teaser-receipt')
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.equal(result.status, 409)
  assert.equal(result.code, 'BLUEPRINT_RECEIPT_REQUIRED')
})

test('unlocked trace with blueprint and correct receipt passes', () => {
  const trace = buildTrace({
    status: 'unlocked',
    blueprint: {
      title: 'Blueprint',
      executiveThesis: 'Thesis',
      offerArchitecture: 'Offer',
      monetizationModel: 'Model',
      distributionStrategy: 'Dist',
      ninetyDayPlan: {
        weeks1to3: 'W1-3',
        weeks4to8: 'W4-8',
        weeks9to12: 'W9-12',
      },
      riskMitigation: 'Risk',
      firstFiveActions: ['A1', 'A2', 'A3', 'A4', 'A5'],
    },
    blueprintReceiptRef: 'blueprint-receipt',
  })
  const result = enforceBlueprintExportPolicy(trace, 'blueprint-receipt')
  assert.deepEqual(result, { ok: true })
})
