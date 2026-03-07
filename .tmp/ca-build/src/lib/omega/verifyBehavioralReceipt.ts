import crypto from 'node:crypto'
import canonicalize from 'canonicalize'
import nacl from 'tweetnacl'

export type BehavioralDisposition = 'APPROVED' | 'REWRITE_REQUIRED' | 'REJECTED'

export type BehavioralReceiptV1 = {
  schema: 'keon.receipt.behavioral.v1'
  receiptId: string
  issuedAt: string
  policy: {
    policyId: string
    policyVersion: string
    ruleSetHash: string
    archetype: string
  }
  subject: {
    tenantId: string
    actorId: string
    correlationId: string
    workflowId: string
    runId: string
    expressionHash: string
  }
  evaluation: {
    mode: 'soft' | 'strict'
    initialDisposition: BehavioralDisposition
    finalDisposition: BehavioralDisposition
    rewriteCount: number
    score: number
    violations: string[]
  }
  bindings: {
    policyHash: string
    subjectHash: string
    evaluationHash: string
  }
  issuer: {
    service: string
    keyId: string
  }
  signature: {
    alg: 'Ed25519'
    sig: string
  }
}

export type VerifyContext = {
  expectedTenantId?: string
  expectedPolicyId?: string
  expectedPolicyVersion?: string
  expectedRuleSetHash?: string
  expectedArchetype?: string
  emittedText?: string
  resolvePublicKey: (keyId: string) => Uint8Array | null
}

export type VerifyResult = { ok: true } | { ok: false; reason: string; detail?: Record<string, unknown> }

function sha256hexFromUtf8(value: string): string {
  return crypto.createHash('sha256').update(Buffer.from(value, 'utf8')).digest('hex')
}

function sha256hexFromCanonicalJson(value: unknown): string {
  const canonical = canonicalize(value)
  if (canonical === undefined) {
    throw new Error('Failed to canonicalize object')
  }
  return crypto.createHash('sha256').update(Buffer.from(canonical, 'utf8')).digest('hex')
}

function base64ToUint8(value: string): Uint8Array {
  return new Uint8Array(Buffer.from(value, 'base64'))
}

function canonicalReceiptPayloadForSigning(receipt: BehavioralReceiptV1): string {
  const { signature, ...payload } = receipt
  const canonical = canonicalize(payload)
  if (canonical === undefined) {
    throw new Error('Failed to canonicalize signing payload')
  }
  return canonical
}

function isSha256Hex(value: string): boolean {
  return /^[a-f0-9]{64}$/.test(value)
}

export function computeRuleSetHashFromPolicy(policyArtifact: unknown): string {
  return sha256hexFromCanonicalJson(policyArtifact)
}

export function verifyBehavioralReceipt(receipt: BehavioralReceiptV1, ctx: VerifyContext): VerifyResult {
  try {
    if (receipt.schema !== 'keon.receipt.behavioral.v1') {
      return { ok: false, reason: 'schema_mismatch', detail: { schema: receipt.schema } }
    }
    if (receipt.signature?.alg !== 'Ed25519') {
      return { ok: false, reason: 'unsupported_signature_alg', detail: { alg: receipt.signature?.alg } }
    }

    if (ctx.expectedTenantId && receipt.subject.tenantId !== ctx.expectedTenantId) {
      return {
        ok: false,
        reason: 'tenant_mismatch',
        detail: { expected: ctx.expectedTenantId, got: receipt.subject.tenantId },
      }
    }
    if (ctx.expectedPolicyId && receipt.policy.policyId !== ctx.expectedPolicyId) {
      return {
        ok: false,
        reason: 'policy_id_mismatch',
        detail: { expected: ctx.expectedPolicyId, got: receipt.policy.policyId },
      }
    }
    if (ctx.expectedPolicyVersion && receipt.policy.policyVersion !== ctx.expectedPolicyVersion) {
      return {
        ok: false,
        reason: 'policy_version_mismatch',
        detail: { expected: ctx.expectedPolicyVersion, got: receipt.policy.policyVersion },
      }
    }
    if (ctx.expectedRuleSetHash && receipt.policy.ruleSetHash !== ctx.expectedRuleSetHash) {
      return {
        ok: false,
        reason: 'ruleset_hash_mismatch',
        detail: { expected: ctx.expectedRuleSetHash, got: receipt.policy.ruleSetHash },
      }
    }
    if (ctx.expectedArchetype && receipt.policy.archetype !== ctx.expectedArchetype) {
      return {
        ok: false,
        reason: 'archetype_mismatch',
        detail: { expected: ctx.expectedArchetype, got: receipt.policy.archetype },
      }
    }

    const hexFields: Array<[string, string]> = [
      ['policy.ruleSetHash', receipt.policy.ruleSetHash],
      ['subject.expressionHash', receipt.subject.expressionHash],
      ['bindings.policyHash', receipt.bindings.policyHash],
      ['bindings.subjectHash', receipt.bindings.subjectHash],
      ['bindings.evaluationHash', receipt.bindings.evaluationHash],
    ]

    for (const [field, val] of hexFields) {
      if (!isSha256Hex(val)) {
        return { ok: false, reason: 'invalid_sha256_hex', detail: { field, val } }
      }
    }

    const computedPolicyHash = sha256hexFromCanonicalJson(receipt.policy)
    if (computedPolicyHash !== receipt.bindings.policyHash) {
      return {
        ok: false,
        reason: 'policy_hash_mismatch',
        detail: { computed: computedPolicyHash, got: receipt.bindings.policyHash },
      }
    }

    const computedSubjectHash = sha256hexFromCanonicalJson(receipt.subject)
    if (computedSubjectHash !== receipt.bindings.subjectHash) {
      return {
        ok: false,
        reason: 'subject_hash_mismatch',
        detail: { computed: computedSubjectHash, got: receipt.bindings.subjectHash },
      }
    }

    const computedEvaluationHash = sha256hexFromCanonicalJson(receipt.evaluation)
    if (computedEvaluationHash !== receipt.bindings.evaluationHash) {
      return {
        ok: false,
        reason: 'evaluation_hash_mismatch',
        detail: { computed: computedEvaluationHash, got: receipt.bindings.evaluationHash },
      }
    }

    if (typeof ctx.emittedText === 'string') {
      const computedExprHash = sha256hexFromUtf8(ctx.emittedText)
      if (computedExprHash !== receipt.subject.expressionHash) {
        return {
          ok: false,
          reason: 'expression_hash_mismatch',
          detail: { computed: computedExprHash, got: receipt.subject.expressionHash },
        }
      }
    }

    const pubKey = ctx.resolvePublicKey(receipt.issuer.keyId)
    if (!pubKey) {
      return { ok: false, reason: 'unknown_issuer_key', detail: { keyId: receipt.issuer.keyId } }
    }
    if (pubKey.length !== 32) {
      return {
        ok: false,
        reason: 'invalid_public_key_length',
        detail: { keyId: receipt.issuer.keyId, len: pubKey.length },
      }
    }

    const payload = canonicalReceiptPayloadForSigning(receipt)
    const sigBytes = base64ToUint8(receipt.signature.sig)
    const msgBytes = new Uint8Array(Buffer.from(payload, 'utf8'))

    const valid = nacl.sign.detached.verify(msgBytes, sigBytes, pubKey)
    if (!valid) {
      return { ok: false, reason: 'signature_invalid' }
    }

    if (receipt.evaluation.rewriteCount < 0) {
      return { ok: false, reason: 'invalid_rewrite_count' }
    }
    if (receipt.evaluation.score < 0 || receipt.evaluation.score > 100) {
      return { ok: false, reason: 'invalid_score' }
    }

    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      reason: 'verification_error',
      detail: { message: error instanceof Error ? error.message : String(error) },
    }
  }
}
