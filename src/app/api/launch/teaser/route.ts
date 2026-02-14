import { NextRequest, NextResponse } from 'next/server'
import { createOmegaClient, generateCorrelationId, validateCorrelationId } from '@omega/sdk'
import { mustGetEnv } from '@/lib/config/env'
import { isValidSessionId, normalizeAdvancedOptions } from '@/lib/launch/types'
import { ForgePilotTeaserOutputSchema, enforceReceiptRules } from '@/lib/contracts/forgepilot-teaser'

const TEASER_WORKFLOW_ID = 'forgepilot.teaser.v1'

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
    const idea = typeof body?.idea === 'string' ? body.idea.trim() : ''
    const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : ''
    const email = typeof body?.email === 'string' ? body.email.trim() : undefined

    if (!idea) {
      return NextResponse.json({ error: 'Idea is required' }, { status: 400 })
    }

    if (!sessionId || !isValidSessionId(sessionId)) {
      return NextResponse.json({ error: 'Valid sessionId is required' }, { status: 400 })
    }

    const advancedOptions = normalizeAdvancedOptions(body?.advanced)
    const tenantId = mustGetEnv('OMEGA_TENANT_ID')
    const actorId = mustGetEnv('OMEGA_ACTOR_ID')
    const correlationId = generateCorrelationId(tenantId)
    validateCorrelationId(correlationId)

    const omega = createClient()
    const run = await omega.workflows.runWorkflow(
      TEASER_WORKFLOW_ID,
      {
        idea,
        advancedOptions,
        email,
        sessionId,
      },
      {
        tenantId,
        actorId,
        correlationId,
      }
    )

    const completed = await omega.workflows.waitForCompletion(run.runId, {
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

    if (completed.status !== 'completed' && completed.status !== 'paused') {
      const details = completed.errorDetails ? JSON.stringify(completed.errorDetails) : completed.status
      throw new Error(`OMEGA workflow failed: ${details}`)
    }

    const output = ForgePilotTeaserOutputSchema.parse(completed.outputPayload ?? {})
    const receiptRef = resolveReceiptRef(completed.workflowReceiptHash, completed.receiptChain)

    enforceReceiptRules(output, receiptRef)

    if (output.kind === 'clarify') {
      if (!completed.gateInfo?.gateId) {
        throw new Error('Fail-closed: clarify branch requires a resumable gateId')
      }

      return NextResponse.json({
        needs_clarification: true,
        questions: output.clarification.questions,
        traceId,
        receiptRef,
        runId: completed.runId,
        gateId: completed.gateInfo.gateId,
      })
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
    console.error('Launch teaser generation failed:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate teaser via OMEGA',
        details: process.env.NODE_ENV === 'production' ? undefined : (error as Error)?.message,
      },
      { status: 502 }
    )
  }
}
