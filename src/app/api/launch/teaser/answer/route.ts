import { NextRequest, NextResponse } from 'next/server'
import { createOmegaClient, generateCorrelationId, validateCorrelationId } from '@omega/sdk'
import { mustGetEnv } from '@/lib/config/env'
import { ForgePilotTeaserOutputSchema, enforceReceiptRules } from '@/lib/contracts/forgepilot-teaser'

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const runId = typeof body?.runId === 'string' ? body.runId.trim() : ''
    const gateId = typeof body?.gateId === 'string' ? body.gateId.trim() : ''
    const answers = Array.isArray(body?.answers)
      ? body.answers.filter((value: unknown): value is string => typeof value === 'string' && value.trim().length > 0)
      : []

    if (!runId) {
      return NextResponse.json({ error: 'runId is required' }, { status: 400 })
    }

    if (!gateId) {
      return NextResponse.json({ error: 'gateId is required' }, { status: 400 })
    }

    if (!answers.length) {
      return NextResponse.json({ error: 'At least one answer is required' }, { status: 400 })
    }

    const tenantId = mustGetEnv('OMEGA_TENANT_ID')
    const actorId = mustGetEnv('OMEGA_ACTOR_ID')
    const correlationId = generateCorrelationId(tenantId)
    validateCorrelationId(correlationId)

    const omega = createClient()

    const resumed = await omega.workflows.resumeRun(
      {
        runId,
        gateId,
        decision: 'approve',
        input: { answers },
      },
      {
        tenantId,
        actorId,
        correlationId,
      }
    )

    const completed = await omega.workflows.waitForCompletion(resumed.runId, {
      tenantId,
      actorId,
      correlationId,
      pollIntervalMs: 1_000,
      timeoutMs: 120_000,
    })

    const traceId = completed.correlationId
    if (!traceId) {
      throw new Error('Fail-closed: OMEGA workflow response missing traceId')
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

    return NextResponse.json({
      needs_clarification: false,
      teaser: {
        oneLiner: output.teaser.oneLiner,
        positioning: output.teaser.sections.positioning,
        icpSnapshot: output.teaser.sections.icpSnapshot,
        monetizationAngle: output.teaser.sections.monetizationAngle,
        strategicDifferentiator: output.teaser.sections.strategicDifferentiator,
        ctaHeadline: output.teaser.cta.headline,
        ctaUnlockValue: output.teaser.cta.unlockValue,
      },
      traceId,
      receiptRef,
    })
  } catch (error) {
    console.error('Launch teaser answer processing failed:', error)
    return NextResponse.json(
      {
        error: 'Failed to complete teaser via OMEGA',
        details: process.env.NODE_ENV === 'production' ? undefined : (error as Error)?.message,
      },
      { status: 502 }
    )
  }
}
