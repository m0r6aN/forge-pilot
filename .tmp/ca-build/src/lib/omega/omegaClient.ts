import { createOmegaClient, type OmegaClient } from '@omega/sdk'
import { mustGetEnv } from '@/lib/config/env'

let cachedClient: OmegaClient | null = null

export function getOmegaClient(): OmegaClient {
  if (cachedClient) {
    return cachedClient
  }

  cachedClient = createOmegaClient({
    federationUrl: mustGetEnv('OMEGA_FEDERATION_URL'),
    apiKey: mustGetEnv('OMEGA_API_KEY'),
    tenantId: mustGetEnv('OMEGA_TENANT_ID'),
    actorId: mustGetEnv('OMEGA_ACTOR_ID'),
    timeoutMs: Number(process.env.OMEGA_TIMEOUT_MS ?? 120_000),
    maxRetries: Number(process.env.OMEGA_MAX_RETRIES ?? 3),
  })

  return cachedClient
}
