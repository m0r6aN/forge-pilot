// forgepilot/scripts/blueprint-worker.ts
import { processBlueprintRequested } from '../src/lib/launch/blueprint-worker'
import { closeRedisPubSub, subscribeBlueprintRequested } from '../src/lib/launch/redis-pubsub'

let stop: (() => Promise<void>) | null = null

async function main() {
  stop = await subscribeBlueprintRequested(async (eventJson) => {
    await processBlueprintRequested(eventJson)
  })

  console.log('ForgePilot blueprint worker started (Redis Streams + Consumer Group)')
}

async function shutdown(signal: string) {
  console.log(`Received ${signal}. Shutting down blueprint worker...`)
  if (stop) {
    await stop()
  }
  await closeRedisPubSub()
  process.exit(0)
}

void main().catch(async (error) => {
  console.error('Blueprint worker failed to start:', error)
  await closeRedisPubSub()
  process.exit(1)
})

process.on('SIGINT', () => void shutdown('SIGINT'))
process.on('SIGTERM', () => void shutdown('SIGTERM'))
