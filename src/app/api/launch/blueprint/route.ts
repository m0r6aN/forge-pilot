import { NextRequest, NextResponse } from 'next/server'
import { generateCorrelationId, validateCorrelationId } from '@omega/sdk'
import { mustGetEnv } from '@/lib/config/env'
import { runGovernedWorkflow } from '@/lib/omega/runGovernedWorkflow'
import { readVerifiedEmailSession } from '@/lib/auth/verified-email-session'

const BLUEPRINT_WORKFLOW_ID = 'forgepilot.blueprint.v1'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const traceId = typeof body?.traceId === 'string' ? body.traceId.trim() : ''
    const teaser = body?.teaser || {}
    const idea = typeof body?.idea === 'string' ? body.idea.trim() : ''

    if (!idea) {
      return NextResponse.json(
        { ok: false, code: 'invalid_request', message: 'idea is required.' },
        { status: 400 }
      )
    }

    if (!traceId) {
      return NextResponse.json(
        { ok: false, code: 'invalid_request', message: 'traceId from teaser step is required.' },
        { status: 400 }
      )
    }

    const verifiedSession = readVerifiedEmailSession(req)
    if (!verifiedSession) {
      return NextResponse.json({
        ok: false,
        code: 'verification_required',
        verification_required: true,
        message: 'Email verification required to generate blueprint.',
      })
    }

    const tenantId = mustGetEnv('OMEGA_TENANT_ID')
    const actorId = `email:${verifiedSession.emailHash}`
    const correlationId = generateCorrelationId(tenantId)
    validateCorrelationId(correlationId)

    const governed = await runGovernedWorkflow({
      workflowId: BLUEPRINT_WORKFLOW_ID,
      input: {
        idea,
        teaser,
        sessionId: body?.sessionId || traceId,
        verifiedActor: {
          emailHash: verifiedSession.emailHash,
          sessionId: verifiedSession.sessionId,
        },
        advancedOptions: body?.advancedOptions || {},
        domainProfileContext: body?.domainProfileContext || null,
      },
      context: {
        tenantId,
        actorId,
        correlationId,
      },
      wait: {
        allowPaused: false,
        pollIntervalMs: 2_000,
        timeoutMs: 90_000,
      },
    })

    const completed = governed.run

    if (completed.status !== 'completed') {
      const details = completed.errorDetails ? JSON.stringify(completed.errorDetails) : completed.status
      throw new Error(`Blueprint workflow failed: ${details}`)
    }

    const output = completed.outputPayload as { blueprint?: Record<string, unknown> } | null

    if (!output?.blueprint) {
      throw new Error('Blueprint workflow returned no blueprint output')
    }

    const receiptRef = completed.workflowReceiptHash ||
      (Array.isArray(completed.receiptChain) && completed.receiptChain.length > 0
        ? completed.receiptChain[completed.receiptChain.length - 1]
        : undefined)

    return NextResponse.json({
      ok: true,
      code: 'blueprint_generated',
      blueprint: output.blueprint,
      runId: completed.runId,
      traceId: completed.correlationId || traceId,
      receiptRef,
    })
  } catch (error) {
    console.error(JSON.stringify({
      level: 'error',
      event: 'blueprint.error',
      message: error instanceof Error ? error.message : String(error),
    }))
    return NextResponse.json(
      { ok: false, code: 'BLUEPRINT_FAILED', message: 'We hit a temporary issue generating your blueprint. Please try again.' },
      { status: 200 }
    )
  }
}
