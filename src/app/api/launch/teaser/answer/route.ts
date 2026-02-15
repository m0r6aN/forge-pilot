import { NextRequest, NextResponse } from 'next/server'
import { createOmegaClient, generateCorrelationId, validateCorrelationId } from '@omega/sdk'
import { mustGetEnv } from '@/lib/config/env'
import { ForgePilotTeaserOutputSchema, enforceReceiptRules } from '@/lib/contracts/forgepilot-teaser'
import {
  appendLedger,
  buildResumeAnswerHash,
  getTrace,
  hashJson,
  structuredInfo,
  upsertTrace,
} from '@/lib/launch/runtime-store'
import { checkRateLimit } from '@/lib/launch/security'
import { waitForRunReady } from '@/lib/launch/omega-wait'
import { extractOmegaErrorDiagnostics } from '@/lib/launch/omega-error'

function createClient() {
  return createOmegaClient({
    federationUrl: mustGetEnv('OMEGA_FEDERATION_URL'),
    apiKey: mustGetEnv('OMEGA_API_KEY'),
    tenantId: mustGetEnv('OMEGA_TENANT_ID'),
    actorId: mustGetEnv('OMEGA_ACTOR_ID'),
    timeoutMs: Number(process.env.OMEGA_TIMEOUT_MS ?? 120_000),
    maxRetries: Number(process.env.OMEGA_MAX_RETRIES ?? 3),
  })
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

    if (!traceId) {
      return NextResponse.json({ error: 'traceId is required' }, { status: 400 })
    }

    if (!Object.keys(answers).length) {
      return NextResponse.json({ error: 'At least one answer field is required' }, { status: 400 })
    }

    const rate = checkRateLimit(`teaser-answer:${ip}:${traceId}`, 20, 15 * 60 * 1000)
    if (!rate.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded', retryAfterMs: Math.max(0, rate.resetAt - Date.now()) }, { status: 429 })
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
      return NextResponse.json(replay.response)
    }

    const tenantId = mustGetEnv('OMEGA_TENANT_ID')
    const actorId = mustGetEnv('OMEGA_ACTOR_ID')
    const correlationId = generateCorrelationId(tenantId)
    validateCorrelationId(correlationId)

    const omega = createClient()

    const resumed = await omega.workflows.resumeRun(
      {
        runId: trace.runId,
        gateId: trace.gateId,
        decision: 'approve',
        input: { answers: toOmegaAnswers(answers) },
      },
      {
        tenantId,
        actorId,
        correlationId,
      }
    )

    const completed = await waitForRunReady(omega, resumed.runId, {
      tenantId,
      actorId,
      correlationId,
    })

    const completedTraceId = completed.correlationId
    if (!completedTraceId || completedTraceId !== traceId) {
      throw new Error('Fail-closed: resumed workflow returned mismatched traceId')
    }

    if (completed.status !== 'completed') {
      const details = completed.errorDetails ? JSON.stringify(completed.errorDetails) : completed.status
      throw new Error(`OMEGA workflow did not complete successfully: ${details}`)
    }

    const output = ForgePilotTeaserOutputSchema.parse(completed.outputPayload ?? {})
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
        inputHash: hashJson({ traceId, answers }),
      },
    })
    structuredInfo('teaser.resumed', { traceId, receiptRef })

    return NextResponse.json(responsePayload)
  } catch (error) {
    const diagnostics = extractOmegaErrorDiagnostics(error)
    console.error('Launch teaser answer processing failed:', diagnostics)
    return NextResponse.json(
      {
        error: 'Failed to complete teaser via OMEGA',
        details: process.env.NODE_ENV === 'production' ? undefined : diagnostics,
      },
      { status: 502 }
    )
  }
}
