import { createHash, randomUUID } from 'crypto'
import { z } from 'zod'

// New canonical names (Streams)
export const BLUEPRINT_REQUESTED_STREAM = 'omega.forgepilot.blueprint.requested.v1'
export const BLUEPRINT_COMPLETED_STREAM = 'omega.forgepilot.blueprint.completed.v1'
export const BLUEPRINT_DLQ_STREAM       = 'omega.forgepilot.blueprint.dlq.v1'

const ProducerSchema = z.object({
  service: z.string().min(2),
  env: z.string().min(2),
  host: z.string().optional(),
})

const EnvelopeBaseSchema = z.object({
  specVersion: z.literal('1.0'),
  eventType: z.string().min(3),
  eventVersion: z.literal('1'),
  eventId: z.string().uuid(),
  time: z.string().datetime(),
  traceId: z.string().min(12),
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  idempotencyKey: z.string().regex(/^[a-f0-9]{64}$/),
  producer: ProducerSchema,
})

export const BlueprintRequestedEventSchema = EnvelopeBaseSchema.extend({
  eventType: z.literal('forgepilot.blueprint.requested'),
  payload: z.object({
    email: z.string().email(),
    workflowId: z.literal('forgepilot.blueprint.v1'),
    workflowVersion: z.literal('1.0.0'),
    trigger: z.object({
      paymentProvider: z.literal('stripe'),
      paymentEventId: z.string().min(1),
      checkoutSessionId: z.string().min(1),
      teaserReceiptRef: z.string().min(1),
    }),
  }),
})

export const BlueprintCompletedEventSchema = EnvelopeBaseSchema.extend({
  eventType: z.literal('forgepilot.blueprint.completed'),
  payload: z.object({
    status: z.enum(['success', 'failed']),
    receiptRef: z.string().optional(),
    artifactKey: z.string().optional(),
    workflowId: z.literal('forgepilot.blueprint.v1'),
    workflowVersion: z.literal('1.0.0'),
    errorCode: z.string().optional(),
    errorMessage: z.string().optional(),
  }),
})

export type BlueprintRequestedEvent = z.infer<typeof BlueprintRequestedEventSchema>
export type BlueprintCompletedEvent = z.infer<typeof BlueprintCompletedEventSchema>

export function buildBlueprintIdempotencyKey(traceId: string): string {
  return createHash('sha256').update(`${traceId}:blueprint:v1`).digest('hex')
}

export function buildBlueprintRequestedEvent(input: {
  traceId: string
  tenantId: string
  correlationId: string
  email: string
  paymentEventId: string
  checkoutSessionId: string
  teaserReceiptRef: string
  service: string
}): BlueprintRequestedEvent {
  return BlueprintRequestedEventSchema.parse({
    specVersion: '1.0',
    eventType: 'forgepilot.blueprint.requested',
    eventVersion: '1',
    eventId: randomUUID(),
    time: new Date().toISOString(),
    traceId: input.traceId,
    tenantId: input.tenantId,
    correlationId: input.correlationId,
    idempotencyKey: buildBlueprintIdempotencyKey(input.traceId),
    producer: {
      service: input.service,
      env: process.env.NODE_ENV || 'development',
      host: process.env.HOSTNAME,
    },
    payload: {
      email: input.email,
      workflowId: 'forgepilot.blueprint.v1',
      workflowVersion: '1.0.0',
      trigger: {
        paymentProvider: 'stripe',
        paymentEventId: input.paymentEventId,
        checkoutSessionId: input.checkoutSessionId,
        teaserReceiptRef: input.teaserReceiptRef,
      },
    },
  })
}

