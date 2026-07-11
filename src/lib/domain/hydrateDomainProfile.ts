import { createHash } from 'crypto'

export interface HydratedDomainProfile {
  profileId: number
  schemaId: string
  profileVersion: string
  source: string
  payloadHash: string
  payload: Record<string, unknown>
}

function getOmegaRegistryUrl(): string | null {
  return process.env.OMEGA_FEDERATION_URL || null
}

export async function hydrateDomainProfile(
  domainKey: string,
  schemaId: string
): Promise<HydratedDomainProfile | null> {
  const baseUrl = getOmegaRegistryUrl()
  if (!baseUrl) {
    return null  // Gracefully degrade if omega URL not set
  }

  const apiKey = process.env.OMEGA_API_KEY
  const tenantId = process.env.OMEGA_TENANT_ID
  if (!apiKey || !tenantId) {
    return null  // Gracefully degrade if auth not configured
  }

  try {
    const url = `${baseUrl}/api/fc/registry/domain-profiles/${encodeURIComponent(domainKey)}?schema_id=${encodeURIComponent(schemaId)}`
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-Tenant-Id': tenantId,
        'X-Actor-Id': 'forgepilot-teaser',
        'Content-Type': 'application/json',
      },
      // Short timeout - domain profile is enrichment, not blocking
      signal: AbortSignal.timeout(5000),
    })

    if (response.status === 404) {
      return null  // No profile for this domain key
    }

    if (!response.ok) {
      console.warn(`Domain profile fetch failed for ${domainKey}: ${response.status}`)
      return null  // Graceful degradation
    }

    const data = await response.json()

    if (!data || !data.payload) {
      return null
    }

    const payloadStr = JSON.stringify(data.payload)
    const payloadHash = data.payload_hash || createHash('sha256').update(payloadStr).digest('hex')

    return {
      profileId: data.profile_id || 0,
      schemaId: data.schema_id || schemaId,
      profileVersion: data.version || '1.0.0',
      source: data.source || 'omega-registry',
      payloadHash,
      payload: data.payload,
    }
  } catch (error) {
    // Graceful degradation - domain profile is enrichment, not blocking
    console.warn(`Domain profile hydration failed for ${domainKey}:`, error)
    return null
  }
}
