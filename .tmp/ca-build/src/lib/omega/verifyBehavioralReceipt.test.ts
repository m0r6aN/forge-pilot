import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import canonicalize from 'canonicalize'
import nacl from 'tweetnacl'
import {
  computeRuleSetHashFromPolicy,
  verifyBehavioralReceipt,
  type BehavioralReceiptV1,
} from './verifyBehavioralReceipt'

function sha256hex(value: string): string {
  return crypto.createHash('sha256').update(Buffer.from(value, 'utf8')).digest('hex')
}

function canonicalHash(value: unknown): string {
  const canonical = canonicalize(value)
  if (canonical === undefined) {
    throw new Error('Failed to canonicalize in test')
  }
  return sha256hex(canonical)
}

function buildSignedReceipt(): { receipt: BehavioralReceiptV1; publicKey: Uint8Array; emittedText: string } {
  const emittedText = "We're tightening your strategy now and we can launch this with focus."
  const expressionHash = sha256hex(emittedText)
  const policy = {
    policyId: 'keon.policy.behavioral.v1',
    policyVersion: 'v1.0.0',
    ruleSetHash: '5a1c1e0b31a4f7f3f04cb8db7d1e95f6407e0e637b9cb8aefb8f8f7e8ed1d7f2',
    archetype: 'co_founder',
  }
  const subject = {
    tenantId: 'tenant_keon_prod',
    actorId: 'forgepilot_launch_service',
    correlationId: 'corr_123',
    workflowId: 'forgepilot.teaser.v1',
    runId: 'run_123',
    expressionHash,
  }
  const evaluation = {
    mode: 'soft' as const,
    initialDisposition: 'REWRITE_REQUIRED' as const,
    finalDisposition: 'APPROVED' as const,
    rewriteCount: 1,
    score: 35,
    violations: ['Insufficient first-person framing.'],
  }

  const receiptNoSig = {
    schema: 'keon.receipt.behavioral.v1' as const,
    receiptId: 'brc_01JX9R1S4H7M2Q8Z',
    issuedAt: '2026-02-15T20:14:33.508Z',
    policy,
    subject,
    evaluation,
    bindings: {
      policyHash: canonicalHash(policy),
      subjectHash: canonicalHash(subject),
      evaluationHash: canonicalHash(evaluation),
    },
    issuer: {
      service: 'keon-judge',
      keyId: 'ed25519:judge-prod-01',
    },
  }

  const signingPayload = canonicalize(receiptNoSig)
  if (signingPayload === undefined) {
    throw new Error('Failed to canonicalize signing payload in test')
  }

  const keyPair = nacl.sign.keyPair()
  const signature = nacl.sign.detached(new Uint8Array(Buffer.from(signingPayload, 'utf8')), keyPair.secretKey)

  const receipt: BehavioralReceiptV1 = {
    ...receiptNoSig,
    signature: {
      alg: 'Ed25519',
      sig: Buffer.from(signature).toString('base64'),
    },
  }

  return { receipt, publicKey: keyPair.publicKey, emittedText }
}

test('verifyBehavioralReceipt accepts valid signed receipt', () => {
  const { receipt, publicKey, emittedText } = buildSignedReceipt()
  const result = verifyBehavioralReceipt(receipt, {
    expectedTenantId: 'tenant_keon_prod',
    expectedPolicyId: 'keon.policy.behavioral.v1',
    expectedPolicyVersion: 'v1.0.0',
    expectedArchetype: 'co_founder',
    emittedText,
    resolvePublicKey: (keyId) => (keyId === 'ed25519:judge-prod-01' ? publicKey : null),
  })

  assert.deepEqual(result, { ok: true })
})

test('verifyBehavioralReceipt rejects expression hash mismatch', () => {
  const { receipt, publicKey } = buildSignedReceipt()
  const result = verifyBehavioralReceipt(receipt, {
    emittedText: 'different expression',
    resolvePublicKey: (keyId) => (keyId === 'ed25519:judge-prod-01' ? publicKey : null),
  })

  assert.equal(result.ok, false)
  if (!result.ok) {
    assert.equal(result.reason, 'expression_hash_mismatch')
  }
})

test('computeRuleSetHashFromPolicy is deterministic', () => {
  const policy = {
    policyId: 'keon.policy.behavioral.v1',
    version: 'v1.0.0',
    type: 'behavioral',
    archetype: 'co_founder',
    rules: {
      lexical: { prohibited: ['a'], fatalistic: ['b'] },
      structural: { requireFirstPerson: true, minFirstPersonDensity: 0.05, directiveLimitPer500Words: 3 },
      agency: { preserveUserAgency: true, discourageDirectiveTone: true },
      emotional: { disallowedToneMarkers: ['dismissive'] },
    },
    enforcement: { critical: 'fail_closed', moderate: 'rewrite_required', maxRewriteAttempts: 1 },
  }

  const first = computeRuleSetHashFromPolicy(policy)
  const second = computeRuleSetHashFromPolicy({ ...policy })
  assert.equal(first, second)
  assert.match(first, /^[a-f0-9]{64}$/)
})
