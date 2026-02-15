import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createOmegaClient, generateCorrelationId, validateCorrelationId } from '@omega/sdk'
import { mustGetEnv } from '@/lib/config/env'
import { isValidSessionId, normalizeAdvancedOptions } from '@/lib/launch/types'
import { ForgePilotTeaserOutputSchema, enforceReceiptRules } from '@/lib/contracts/forgepilot-teaser'
import { waitForRunReady } from '@/lib/launch/omega-wait'
import {
  appendLedger,
  buildArtifactHash,
  hashJson,
  structuredInfo,
  upsertTrace,
} from '@/lib/launch/runtime-store'
import { checkRateLimit } from '@/lib/launch/security'
import { extractOmegaErrorDiagnostics } from '@/lib/launch/omega-error'

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

function payloadTeaserFromOutput(output: Extract<ReturnType<typeof ForgePilotTeaserOutputSchema.parse>, { kind: 'teaser' }>) {
  return {
    oneLiner: output.teaser.oneLiner,
    positioning: output.teaser.sections.positioning,
    icpSnapshot: output.teaser.sections.icpSnapshot,
    monetizationAngle: output.teaser.sections.monetizationAngle,
    strategicDifferentiator: output.teaser.sections.strategicDifferentiator,
    ctaHeadline: output.teaser.cta.headline,
    ctaUnlockValue: output.teaser.cta.unlockValue,
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const idea = typeof body?.idea === 'string' ? body.idea.trim() : ''
    const sessionId = typeof body?.sessionId === 'string' && body.sessionId ? body.sessionId : randomUUID()
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : undefined
    const ip = (req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown')
      .split(',')[0]
      .trim()

    if (!idea) {
      return NextResponse.json({ error: 'Idea is required' }, { status: 400 })
    }

    if (!isValidSessionId(sessionId)) {
      return NextResponse.json({ error: 'Valid sessionId is required' }, { status: 400 })
    }

    const rate = checkRateLimit(`teaser:${ip}`, 20, 15 * 60 * 1000)
    if (!rate.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded', retryAfterMs: Math.max(0, rate.resetAt - Date.now()) }, { status: 429 })
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

    const completed = await waitForRunReady(omega, run.runId, {
      tenantId,
      actorId,
      correlationId,
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
    const workflowVersion = output.version
    const artifactId = process.env.OMEGA_TEASER_ARTIFACT_ID || TEASER_WORKFLOW_ID
    const artifactHash = buildArtifactHash(artifactId, workflowVersion)
    const inputHash = hashJson({ idea, advancedOptions, email, sessionId })

    enforceReceiptRules(output, receiptRef)

    if (output.kind === 'clarify') {
      if (!completed.gateInfo?.gateId) {
        throw new Error('Fail-closed: clarify branch requires a resumable gateId')
      }

      await upsertTrace({
        traceId,
        sessionId,
        email,
        idea,
        advancedOptions,
        clarificationAnswers: {},
        workflowVersion,
        artifactId,
        artifactHash,
        inputHash,
        status: 'clarify_pending',
        runId: completed.runId,
        gateId: completed.gateInfo.gateId,
        questions: output.clarification.questions,
        resumeRecords: {},
        receipts: receiptRef
          ? [{ receiptRef, class: 'intermediate', source: 'teaser', createdAt: new Date().toISOString() }]
          : [],
        payment: {},
        exports: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      await appendLedger({
        type: 'teaser.clarify',
        traceId,
        at: new Date().toISOString(),
        code: 'FC-GATE-001',
        meta: {
          inputHash,
          artifactId,
          artifactHash,
          runId: completed.runId,
          gateId: completed.gateInfo.gateId,
        },
      })
      structuredInfo('teaser.clarify', { traceId })

      return NextResponse.json({
        needs_clarification: true,
        questions: output.clarification.questions,
        traceId,
        workflowVersion,
      })
    }

    if (!receiptRef) {
      throw new Error('Fail-closed: teaser branch missing receiptRef')
    }

    const teaser = payloadTeaserFromOutput(output)
    const nowIso = new Date().toISOString()
    await upsertTrace({
      traceId,
      sessionId,
      email,
      idea,
      advancedOptions,
      clarificationAnswers: {},
      workflowVersion,
      artifactId,
      artifactHash,
      inputHash,
      status: 'teaser_ready',
      teaser,
      successReceiptRef: receiptRef,
      resumeRecords: {},
      receipts: [{ receiptRef, class: 'success', source: 'teaser', createdAt: nowIso }],
      payment: {},
      exports: [],
      createdAt: nowIso,
      updatedAt: nowIso,
    })

    await appendLedger({
      type: 'teaser.generated',
      traceId,
      receiptRef,
      at: new Date().toISOString(),
      code: 'FC-GATE-002',
      meta: {
        inputHash,
        artifactId,
        artifactHash,
      },
    })
    structuredInfo('teaser.generated', { traceId, receiptRef })

    return NextResponse.json({
      needs_clarification: false,
      teaser,
      traceId,
      receiptRef,
      workflowVersion,
    })
  } catch (error) {
    const diagnostics = extractOmegaErrorDiagnostics(error)
    console.error('Launch teaser generation failed:', diagnostics)
    return NextResponse.json(
      {
        error: 'Failed to generate teaser via OMEGA',
        details: process.env.NODE_ENV === 'production' ? undefined : diagnostics,
      },
      { status: 502 }
    )
  }
}
