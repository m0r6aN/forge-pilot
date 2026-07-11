// forgepilot/src/lib/launch/redis-pubsub.ts
import os from 'node:os'
import { createClient, type RedisClientType } from 'redis'
import {
  BLUEPRINT_COMPLETED_STREAM,
  BLUEPRINT_DLQ_STREAM,
  BLUEPRINT_REQUESTED_STREAM,
  type BlueprintCompletedEvent,
  type BlueprintRequestedEvent,
} from './blueprint-events'

let sharedClient: RedisClientType | null = null

function mustRedisUrl(): string {
  const value = process.env.REDIS_URL || process.env.FORGEPILOT_REDIS_URL
  if (!value) {
    throw new Error('Missing REDIS_URL (or FORGEPILOT_REDIS_URL) for blueprint worker queue')
  }
  return value
}

function streamGroup(): string {
  return process.env.BLUEPRINT_STREAM_GROUP || 'forgepilot-blueprint-workers'
}

function consumerName(): string {
  return (
    process.env.BLUEPRINT_STREAM_CONSUMER ||
    `worker-${os.hostname()}-${process.pid}`
  )
}

async function getClient(): Promise<RedisClientType> {
  if (sharedClient && sharedClient.isOpen) return sharedClient

  sharedClient = createClient({ url: mustRedisUrl() })
  sharedClient.on('error', (error) => console.error('Redis client error:', error))
  await sharedClient.connect()
  return sharedClient
}

/**
 * Creates the consumer group if missing. Safe to call repeatedly.
 */
async function ensureGroup(client: RedisClientType, streamKey: string): Promise<void> {
  const group = streamGroup()
  try {
    // Create group at "$" so only new messages are delivered.
    // MKSTREAM creates the stream if it doesn't exist yet.
    await client.xGroupCreate(streamKey, group, '$', { MKSTREAM: true })
  } catch (err: any) {
    // BUSYGROUP means it already exists
    const msg = String(err?.message || err)
    if (!msg.includes('BUSYGROUP')) throw err
  }
}

type StopFn = () => Promise<void>

type StreamConsumerOptions = {
  blockMs?: number
  readCount?: number
  maxRetries?: number
  claimIdleMs?: number
  claimBatchSize?: number
}

/**
 * Writes an event to a Redis Stream.
 * We store the JSON payload in the "event" field, plus trace/idempotency for debugging.
 */
async function xaddEvent(
  client: RedisClientType,
  streamKey: string,
  event: any
): Promise<string> {
  const traceId = event?.traceId ?? ''
  const idempotencyKey = event?.idempotencyKey ?? ''
  return client.xAdd(streamKey, '*', {
    event: JSON.stringify(event),
    traceId,
    idempotencyKey,
  })
}

/**
 * Public API: enqueue requested/completed/DLQ events.
 * These used to publish to channels; now they XADD to streams.
 */
export async function publishBlueprintRequested(event: BlueprintRequestedEvent): Promise<void> {
  const client = await getClient()
  await ensureGroup(client, BLUEPRINT_REQUESTED_STREAM)
  await xaddEvent(client, BLUEPRINT_REQUESTED_STREAM, event)
}

export async function publishBlueprintCompleted(event: BlueprintCompletedEvent): Promise<void> {
  const client = await getClient()
  // completed stream is optional, but keep it for observability
  await ensureGroup(client, BLUEPRINT_COMPLETED_STREAM)
  await xaddEvent(client, BLUEPRINT_COMPLETED_STREAM, event)
}

export async function publishBlueprintDlq(payload: Record<string, unknown>): Promise<void> {
  const client = await getClient()
  await ensureGroup(client, BLUEPRINT_DLQ_STREAM)
  await client.xAdd(BLUEPRINT_DLQ_STREAM, '*', {
    event: JSON.stringify(payload),
  })
}

/**
 * Streams-based consumer loop (replaces Pub/Sub subscribe).
 *
 * - Uses XREADGROUP for new messages
 * - Uses XAUTOCLAIM to recover pending messages (crash-safe)
 * - Retries with a side-key counter; after max retries → DLQ + ACK
 */
export async function subscribeBlueprintRequested(
  handler: (eventJson: string) => Promise<void>,
  options?: StreamConsumerOptions
): Promise<StopFn> {
  const client = await getClient()
  const streamKey = BLUEPRINT_REQUESTED_STREAM
  const group = streamGroup()
  const consumer = consumerName()

  const blockMs = options?.blockMs ?? 5000
  const readCount = options?.readCount ?? 10
  const maxRetries = options?.maxRetries ?? 5
  const claimIdleMs = options?.claimIdleMs ?? 60_000
  const claimBatchSize = options?.claimBatchSize ?? 25

  await ensureGroup(client, streamKey)

  let running = true

  async function processMessage(messageId: string, fields: Record<string, string>) {
    const eventJson = fields.event
    if (!eventJson) {
      // malformed message: DLQ + ACK (fail closed)
      await publishBlueprintDlq({
        errorCode: 'MALFORMED_STREAM_MESSAGE',
        stream: streamKey,
        messageId,
        fields,
      })
      await client.xAck(streamKey, group, messageId)
      return
    }

    // Retry counter (durable-ish) using side key
    const retryKey = `forgepilot:blueprint:retry:${messageId}`
    const attempts = Number(await client.incr(retryKey))
    if (attempts === 1) {
      // expire after a day to avoid key pileup
      await client.expire(retryKey, 86_400)
    }

    try {
      await handler(eventJson)
      // success → ACK
      await client.xAck(streamKey, group, messageId)
    } catch (err: any) {
      const errorMessage = String(err?.message || err)

      if (attempts >= maxRetries) {
        // move to DLQ and ACK to prevent poison-pill thrash
        await publishBlueprintDlq({
          errorCode: 'BLUEPRINT_PROCESSING_FAILED_MAX_RETRIES',
          stream: streamKey,
          group,
          consumer,
          messageId,
          attempts,
          errorMessage,
          event: safeJson(eventJson),
        })
        await client.xAck(streamKey, group, messageId)
        return
      }

      // leave unacked → stays pending → will be reclaimed by XAUTOCLAIM later
      console.error(
        `Blueprint worker error (attempt ${attempts}/${maxRetries}) msg=${messageId}:`,
        errorMessage
      )
    }
  }

  async function readNew() {
    // Read only new messages (">")
    const res = await client.xReadGroup(
      group,
      consumer,
      [{ key: streamKey, id: '>' }],
      { COUNT: readCount, BLOCK: blockMs }
    )

    if (!res) return

    for (const stream of res) {
      for (const msg of stream.messages) {
        if (!running) return
        await processMessage(msg.id, msg.message as Record<string, string>)
      }
    }
  }

  async function reclaimPending() {
    // Recover messages stuck in pending list longer than claimIdleMs
    // Node-redis: xAutoClaim(key, group, consumer, minIdleTime, start, options)
    const startId = '0-0'

    const res = await client.xAutoClaim(
      streamKey,
      group,
      consumer,
      claimIdleMs,
      startId,
      { COUNT: claimBatchSize }
    )

    // res can be [nextId, messages, deletedIds] depending on client version
    // node-redis v4 returns: { nextId, messages, deletedMessages }
    const messages = (res as any)?.messages ?? (Array.isArray(res) ? res[1] : [])
    if (!messages || messages.length === 0) return

    for (const msg of messages) {
      if (!running) return
      await processMessage(msg.id, msg.message as Record<string, string>)
    }
  }

  // Main loop: interleave reading new and reclaiming pending
  ;(async () => {
    console.log(
      `Blueprint stream worker active: stream=${streamKey} group=${group} consumer=${consumer}`
    )
    while (running) {
      try {
        await reclaimPending()
        await readNew()
      } catch (err) {
        console.error('Blueprint stream worker loop error:', err)
        // tiny backoff
        await sleep(1000)
      }
    }
  })().catch((err) => console.error('Blueprint stream worker died:', err))

  return async () => {
    running = false
  }
}

export async function closeRedisPubSub(): Promise<void> {
  if (!sharedClient) return
  if (sharedClient.isOpen) await sharedClient.quit()
  sharedClient = null
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function safeJson(str: string) {
  try {
    return JSON.parse(str)
  } catch {
    return str
  }
}
