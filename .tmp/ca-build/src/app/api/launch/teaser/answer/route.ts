import { NextRequest, NextResponse } from 'next/server'
import { generateCorrelationId, validateCorrelationId } from '@omega/sdk'
import { mustGetEnv } from '@/lib/config/env'
import {
  ForgePilotTeaserOutputSchema,
  enforceReceiptRules,
  normalizeForgePilotTeaserOutputPayload,
} from '@/lib/contracts/forgepilot-teaser'
import {
  appendLedger,
  buildResumeAnswerHash,
  getTrace,
  hashJson,
  structuredInfo,
  upsertTrace,
} from '@/lib/launch/runtime-store'
import { checkRateLimit } from '@/lib/launch/security'
import { extractOmegaErrorDiagnostics } from '@/lib/launch/omega-error'
import { resumeGovernedWorkflow } from '@/lib/omega/runGovernedWorkflow'
import { readVerifiedEmailSession } from '@/lib/auth/verified-email-session'

const TEMPORARY_TEASER_ERROR = "We hit a temporary issue generating your strategy preview. Let's try again."
const REQUIRED_OMEGA_ENV_KEYS = [
  'OMEGA_FEDERATION_URL',
  'OMEGA_API_KEY',
  'OMEGA_TENANT_ID',
  'OMEGA_ACTOR_ID',
] as const

function missingOmegaEnvKeys(): string[] {
  return REQUIRED_OMEGA_ENV_KEYS.filter((key) => !process.env[key])
}

function structuredFailurePayload(code: string, diagnostics: Record<string, unknown>) {
  return {
    ok: false as const,
    code,
    message: TEMPORARY_TEASER_ERROR,
    error: {
      code,
      message: TEMPORARY_TEASER_ERROR,
      retryable: true,
    },
    details: process.env.NODE_ENV === 'production' ? undefined : diagnostics,
  }
}

function resolveReceiptRef(receiptHash?: string, receiptChain?: string[]): string | undefined {
  if (receiptHash) {
    return receiptHash
  }

  if (Array.isArray(receiptChain) && receiptChain.length > 0) {
    return receiptChain[receiptChain.length - 1]
  }

  return undefined
}

function parseAnswers(input: unknown): Record<string, string> {
  if (!input || typeof input !== 'object') {
    return {}
  }

  const entries = Object.entries(input as Record<string, unknown>)
  const filtered = entries.filter(([, value]) => typeof value === 'string' && value.trim().length > 0)

  return Object.fromEntries(filtered.map(([key, value]) => [key, (value as string).trim()]))
}

function toOmegaAnswers(answers: Record<string, string>): string[] {
  return Object.keys(answers)
    .sort()
    .map((key) => `${key}: ${answers[key]}`)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const traceId = typeof body?.traceId === 'string' ? body.traceId.trim() : ''
    const answers = parseAnswers(body?.answers)
    const ip = (req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown')
      .split(',')[0]
      .trim()
    const verifiedSession = readVerifiedEmailSession(req)
    if (!verifiedSession) {
      structuredInfo('teaser.verification_required', { traceId: traceId || null, reason: 'answer_requires_verification' })
      return NextResponse.json(
        {
          ok: true,
          code: 'verification_required',
          verification_required: true,
          message: 'Confirm your email to continue.',
          next: { action: 'check_email', href: '/continue?returnTo=/launch' },
        },
        { status: 200 }
      )
    }

    if (!traceId) {
      return NextResponse.json({ ok: false, code: 'invalid_request', message: 'traceId is required.' }, { status: 400 })
    }

    if (!Object.keys(answers).length) {
      return NextResponse.json(
        { ok: false, code: 'invalid_request', message: 'At least one answer field is required.' },
        { status: 400 }
      )
    }

    const rate = checkRateLimit(`teaser-answer:${ip}:${verifiedSession.sessionId}`, 20, 15 * 60 * 1000)
    if (!rate.allowed) {
      return NextResponse.json(
        {
          ok: false,
          code: 'rate_limited',
          message: 'Too many requests. Please wait before retrying.',
          retryAfterMs: Math.max(0, rate.resetAt - Date.now()),
        },
        { status: 429 }
      )
    }

    const trace = await getTrace(traceId)
    if (!trace) {
      return NextResponse.json({ error: 'Unknown traceId' }, { status: 400 })
    }

    if (trace.status === 'unlocked') {
      return NextResponse.json({ error: 'Trace already finalized' }, { status: 409 })
    }

    if (!trace.runId || !trace.gateId) {
      return NextResponse.json({ error: 'Trace is not waiting for clarification' }, { status: 409 })
    }

    const answerHash = buildResumeAnswerHash(answers)
    const replay = trace.resumeRecords[answerHash]
    if (replay) {
      structuredInfo('teaser.resumed', { traceId, replay: true, receiptRef: replay.response.receiptRef })
      return NextResponse.json({ ok: true, code: 'teaser_generated', ...replay.response })
    }

    const missingEnvKeys = missingOmegaEnvKeys()
    if (missingEnvKeys.length) {
      throw new Error(`Missing required env var(s): ${missingEnvKeys.join(',')}`)
    }

    structuredInfo('teaser.answer.request.received', {
      traceId,
      answerCount: Object.keys(answers).length,
      ip,
    })

    const tenantId = mustGetEnv('OMEGA_TENANT_ID')
    const actorId = `email:${verifiedSession.emailHash}`
    const correlationId = generateCorrelationId(tenantId)
    validateCorrelationId(correlationId)

    structuredInfo('teaser.answer.omega.invoke', {
      traceId,
      runId: trace.runId,
      gateId: trace.gateId,
      correlationId,
      tenantId,
      actorId,
    })
    structuredInfo('teaser.run.started', {
      traceId,
      sessionId: verifiedSession.sessionId,
      emailHash: verifiedSession.emailHash,
      actorId,
      workflowId: 'forgepilot.teaser.v1.resume',
    })

    const governed = await resumeGovernedWorkflow({
      runId: trace.runId,
      gateId: trace.gateId,
      decision: 'approve',
      input: { answers: toOmegaAnswers(answers) },
      context: {
        tenantId,
        actorId,
        correlationId,
      },
      archetype: 'co_founder',
      wait: {
        allowPaused: false,
      },
    })

    const completed = governed.run
    structuredInfo('teaser.answer.omega.completed', {
      traceId,
      runId: completed.runId,
      status: completed.status,
      correlationId: completed.correlationId,
    })
    const completedTraceId = completed.correlationId
    if (!completedTraceId || completedTraceId !== traceId) {
      throw new Error('Fail-closed: resumed workflow returned mismatched traceId')
    }

    const normalized = normalizeForgePilotTeaserOutputPayload(completed.outputPayload ?? {})
    if (normalized.adjustedFields.length) {
      structuredInfo('teaser.answer.output.normalized', {
        runId: completed.runId,
        traceId: completed.correlationId,
        adjustedFields: normalized.adjustedFields,
      })
    }
    const output = ForgePilotTeaserOutputSchema.parse(normalized.payload)
    const receiptRef = resolveReceiptRef(completed.workflowReceiptHash, completed.receiptChain)

    enforceReceiptRules(output, receiptRef)

    if (output.kind !== 'teaser') {
      return NextResponse.json(
        { error: 'OMEGA requested another clarification round, which is not allowed in v1.' },
        { status: 502 }
      )
    }

    if (!receiptRef) {
      throw new Error('Fail-closed: teaser branch missing receiptRef')
    }

    const teaser = {
      oneLiner: output.teaser.oneLiner,
      positioning: output.teaser.sections.positioning,
      icpSnapshot: output.teaser.sections.icpSnapshot,
      monetizationAngle: output.teaser.sections.monetizationAngle,
      strategicDifferentiator: output.teaser.sections.strategicDifferentiator,
      ctaHeadline: output.teaser.cta.headline,
      ctaUnlockValue: output.teaser.cta.unlockValue,
    }

    const responsePayload = {
      needs_clarification: false as const,
      teaser,
      traceId,
      receiptRef,
      workflowVersion: output.version,
    }

    const updatedReceipts = [...trace.receipts]
    if (!updatedReceipts.find((item) => item.receiptRef === receiptRef)) {
      updatedReceipts.push({
        receiptRef,
        class: 'success',
        source: 'resume',
        createdAt: new Date().toISOString(),
      })
    }

    trace.resumeRecords[answerHash] = {
      answerHash,
      response: responsePayload,
      createdAt: new Date().toISOString(),
    }

    await upsertTrace({
      ...trace,
      workflowVersion: output.version,
      status: 'teaser_ready',
      successReceiptRef: receiptRef,
      teaser,
      clarificationAnswers: answers,
      runId: undefined,
      gateId: undefined,
      questions: undefined,
      receipts: updatedReceipts,
      inputHash: hashJson({ traceId, answers }),
      updatedAt: new Date().toISOString(),
    })

    await appendLedger({
      type: 'teaser.resumed',
      traceId,
      receiptRef,
      code: 'FC-GATE-003',
      at: new Date().toISOString(),
      meta: {
        email_hash: verifiedSession.emailHash,
        session_id: verifiedSession.sessionId,
        domain_profile_binding: trace.domainProfileBinding ?? null,
        inputHash: hashJson({ traceId, answers }),
        behavioralScore: governed.behavioralScore,
      },
    })
    structuredInfo('teaser.resumed', { traceId, receiptRef })

    return NextResponse.json({ ok: true, code: 'teaser_generated', ...responsePayload })
  } catch (error) {
    const diagnostics = extractOmegaErrorDiagnostics(error)
    const code =
      typeof diagnostics.message === 'string' && diagnostics.message.includes('Missing required env var')
        ? 'OMEGA_ENV_MISSING'
        : 'OMEGA_TEASER_RESUME_FAILED'
    console.error(
      JSON.stringify({
        level: 'error',
        event: 'teaser.answer.error',
        code,
        diagnostics,
      })
    )
    return NextResponse.json(structuredFailurePayload(code, diagnostics), { status: 200 })
  }
}
