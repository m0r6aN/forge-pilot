import { createHash, randomUUID } from 'crypto'
import { createOmegaClient, validateCorrelationId } from '@omega/sdk'
import { mustGetEnv } from '@/lib/config/env'
import { ForgePilotBlueprintOutputSchema } from '@/lib/contracts/forgepilot-blueprint'
import type { LaunchTraceState } from '@/lib/launch/runtime-store'
import {
  BlueprintCompletedEventSchema,
  BlueprintRequestedEventSchema,
  buildBlueprintIdempotencyKey,
} from './blueprint-events'
import { publishBlueprintCompleted, publishBlueprintDlq } from './redis-pubsub'
import { appendLedger, getTrace, hashJson, structuredInfo, upsertTrace } from './runtime-store'

const BLUEPRINT_WORKFLOW_ID = 'forgepilot.blueprint.v1'
const BLUEPRINT_WORKFLOW_VERSION = '1.0.0'

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

function toTeaserBlueprintInput(trace: LaunchTraceState) {
  const teaser = trace.teaser
  if (!teaser) {
    throw new Error('fail-closed: trace missing teaser payload')
  }

  const advancedOptions = trace.advancedOptions
  const colorMode = advancedOptions?.colorMode || 'none'
  const colorVibe = advancedOptions?.colorVibe || ''
  const hexColors = Array.isArray(advancedOptions?.hexColors)
    ? advancedOptions.hexColors.filter((value): value is string => typeof value === 'string')
    : []

  let colorDirection = colorVibe || colorMode
  if (hexColors.length > 0) {
    colorDirection = `hex:${hexColors.join(',')}`
  }

  const workingName = teaser.oneLiner.split(/\s+/).slice(0, 7).join(' ')

  return {
    workingName: workingName || `Trace ${trace.traceId.slice(0, 8)}`,
    positioning: teaser.positioning,
    marketPressure: teaser.strategicDifferentiator,
    colorDirection,
  }
}

function buildArtifactHash(workflowId: string, workflowVersion: string): string {
  return createHash('sha256').update(`${workflowId}:${workflowVersion}`).digest('hex')
}

function buildCompletedBase(event: ReturnType<typeof BlueprintRequestedEventSchema.parse>) {
  return {
    specVersion: '1.0' as const,
    eventType: 'forgepilot.blueprint.completed' as const,
    eventVersion: '1' as const,
    eventId: randomUUID(),
    time: new Date().toISOString(),
    traceId: event.traceId,
    tenantId: event.tenantId,
    correlationId: event.correlationId,
    idempotencyKey: event.idempotencyKey,
    producer: {
      service: 'forgepilot-blueprint-worker',
      env: process.env.NODE_ENV || 'development',
      host: process.env.HOSTNAME,
    },
  }
}

async function publishSuccess(event: ReturnType<typeof BlueprintRequestedEventSchema.parse>, receiptRef: string): Promise<void> {
  const completed = BlueprintCompletedEventSchema.parse({
    ...buildCompletedBase(event),
    payload: {
      status: 'success',
      receiptRef,
      artifactKey: `forgepilot:trace:${event.traceId}:blueprint:v1`,
      workflowId: BLUEPRINT_WORKFLOW_ID,
      workflowVersion: BLUEPRINT_WORKFLOW_VERSION,
    },
  })
  await publishBlueprintCompleted(completed)
}

async function publishFailure(
  event: ReturnType<typeof BlueprintRequestedEventSchema.parse>,
  errorCode: string,
  errorMessage: string
): Promise<void> {
  const completed = BlueprintCompletedEventSchema.parse({
    ...buildCompletedBase(event),
    payload: {
      status: 'failed',
      errorCode,
      errorMessage,
      workflowId: BLUEPRINT_WORKFLOW_ID,
      workflowVersion: BLUEPRINT_WORKFLOW_VERSION,
    },
  })
  await publishBlueprintCompleted(completed)
}

export async function processBlueprintRequested(rawEvent: string): Promise<void> {
  let event: ReturnType<typeof BlueprintRequestedEventSchema.parse>

  try {
    event = BlueprintRequestedEventSchema.parse(JSON.parse(rawEvent))
  } catch (error) {
    await publishBlueprintDlq({
      reason: 'invalid_event',
      rawEvent,
      error: error instanceof Error ? error.message : 'unknown',
      at: new Date().toISOString(),
    })
    return
  }

  try {
    const trace = await getTrace(event.traceId)
    if (!trace) {
      await publishFailure(event, 'TRACE_NOT_FOUND', 'Trace not found')
      return
    }

    if (trace.email?.toLowerCase() !== event.payload.email.toLowerCase()) {
      await publishFailure(event, 'EMAIL_MISMATCH', 'Trace email does not match event email')
      return
    }

    if (trace.status !== 'unlocked') {
      await publishFailure(event, 'TRACE_NOT_UNLOCKED', 'Trace must be unlocked before blueprint generation')
      return
    }

    if (!trace.teaser) {
      await publishFailure(event, 'MISSING_TEASER', 'Trace missing teaser payload')
      return
    }

    if (trace.blueprint && trace.blueprintReceiptRef) {
      await publishSuccess(event, trace.blueprintReceiptRef)
      return
    }

    const traceHasTriggerReceipt = trace.receipts.some(
      (item) => item.receiptRef === event.payload.trigger.teaserReceiptRef && item.class === 'success'
    )
    if (!traceHasTriggerReceipt) {
      await publishFailure(event, 'RECEIPT_BINDING_FAILED', 'Trigger receipt does not belong to trace success receipts')
      return
    }

    const canonicalKey = buildBlueprintIdempotencyKey(event.traceId)
    if (event.idempotencyKey !== canonicalKey) {
      await publishFailure(event, 'IDEMPOTENCY_KEY_INVALID', 'Event idempotency key is invalid')
      return
    }

    const tenantId = mustGetEnv('OMEGA_TENANT_ID')
    const actorId = mustGetEnv('OMEGA_ACTOR_ID')
    const correlationId = trace.traceId
    validateCorrelationId(correlationId)

    const inputPayload = {
      traceId: trace.traceId,
      tenantId,
      email: trace.email || event.payload.email,
      teaser: toTeaserBlueprintInput(trace),
      advancedOptions: trace.advancedOptions ?? {},
      clarificationAnswers: trace.clarificationAnswers ?? {},
      trigger: {
        paymentProvider: event.payload.trigger.paymentProvider,
        paymentEventId: event.payload.trigger.paymentEventId,
        checkoutSessionId: event.payload.trigger.checkoutSessionId,
        teaserReceiptRef: event.payload.trigger.teaserReceiptRef,
      },
    }

    try {
      const omega = createClient()
    const run = await omega.workflows.runWorkflow(BLUEPRINT_WORKFLOW_ID, inputPayload, {
      tenantId,
      actorId,
      correlationId,
    })

    const completed = await omega.workflows.waitForCompletion(run.runId, {
      tenantId,
      actorId,
      correlationId,
      pollIntervalMs: 1_000,
      timeoutMs: 120_000,
    })

    const traceId = completed.correlationId
    if (!traceId) {
      throw new Error('fail-closed: missing correlationId')
    }
    if (completed.status !== 'completed') {
      const details = completed.errorDetails ? JSON.stringify(completed.errorDetails) : completed.status
      throw new Error(`workflow did not complete: ${details}`)
    }

    const output = ForgePilotBlueprintOutputSchema.parse(completed.outputPayload ?? {})
    const receiptRef = resolveReceiptRef(completed.workflowReceiptHash, completed.receiptChain)
    if (!receiptRef) {
      throw new Error('fail-closed: blueprint completed without receiptRef')
    }

    const nowIso = new Date().toISOString()
    const artifactId = process.env.OMEGA_BLUEPRINT_ARTIFACT_ID || BLUEPRINT_WORKFLOW_ID
    const artifactHash = buildArtifactHash(artifactId, BLUEPRINT_WORKFLOW_VERSION)
    const blueprintInputHash = hashJson(inputPayload)

    const existing = await getTrace(trace.traceId)
    if (!existing) {
      throw new Error('trace disappeared during blueprint generation')
    }

    const receipts = [...existing.receipts]
    if (!receipts.find((item) => item.receiptRef === receiptRef)) {
      receipts.push({
        receiptRef,
        class: 'success',
        source: 'webhook',
        createdAt: nowIso,
      })
    }

    await upsertTrace({
      ...existing,
      blueprint: output.blueprint,
      blueprintGeneratedAt: nowIso,
      blueprintReceiptRef: receiptRef,
      blueprintWorkflowVersion: BLUEPRINT_WORKFLOW_VERSION,
      blueprintArtifactId: artifactId,
      blueprintArtifactHash: artifactHash,
      blueprintInputHash,
      receipts,
      updatedAt: nowIso,
    })

    await appendLedger({
      type: 'blueprint.generated',
      traceId: trace.traceId,
      receiptRef,
      at: nowIso,
      meta: {
        workflowId: BLUEPRINT_WORKFLOW_ID,
        workflowVersion: BLUEPRINT_WORKFLOW_VERSION,
        artifactId,
        artifactHash,
        inputHash: blueprintInputHash,
        runId: completed.runId,
      },
    })
    structuredInfo('blueprint.generated', { traceId: trace.traceId, receiptRef })

    await publishSuccess(event, receiptRef)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown'
      await appendLedger({
        type: 'blueprint.failed',
        traceId: trace.traceId,
        at: new Date().toISOString(),
        detail: message,
        meta: {
          workflowId: BLUEPRINT_WORKFLOW_ID,
          workflowVersion: BLUEPRINT_WORKFLOW_VERSION,
        },
      })
      structuredInfo('blueprint.failed', { traceId: trace.traceId, error: message })
      await publishFailure(event, 'WORKFLOW_RUN_FAILED', message)
    }
  } catch (error) {
    await publishBlueprintDlq({
      reason: 'processing_error',
      event,
      error: error instanceof Error ? error.message : 'unknown',
      at: new Date().toISOString(),
    })
  }
}
