/**
 * Tests for domain profile hydration from omega-core registry.
 *
 * Uses the Node.js built-in test runner (node:test) with node:assert/strict,
 * consistent with the existing test suite pattern in this project.
 *
 * Global fetch is mocked by replacing globalThis.fetch with a stub in each
 * test block, then restored via afterEach cleanup.
 */

import test, { describe, it, beforeEach, afterEach, mock } from 'node:test'
import assert from 'node:assert/strict'
import { hydrateDomainProfile, type HydratedDomainProfile } from './hydrateDomainProfile'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type FetchStubReturn = {
  ok: boolean
  status: number
  json: () => Promise<unknown>
}

/**
 * Replace globalThis.fetch with a stub that returns the given value once,
 * and return a cleanup function to restore the original.
 */
function stubFetch(returnValue: FetchStubReturn): { calls: Array<{ url: string; init: RequestInit }>; restore: () => void } {
  const calls: Array<{ url: string; init: RequestInit }> = []
  const original = globalThis.fetch

  globalThis.fetch = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    calls.push({ url: url.toString(), init: init ?? {} })
    return returnValue as unknown as Response
  }

  return {
    calls,
    restore: () => { globalThis.fetch = original },
  }
}

/**
 * Replace globalThis.fetch with a stub that throws on invocation.
 */
function stubFetchThrows(error: Error): { restore: () => void } {
  const original = globalThis.fetch

  globalThis.fetch = async (): Promise<Response> => {
    throw error
  }

  return {
    restore: () => { globalThis.fetch = original },
  }
}

// ---------------------------------------------------------------------------
// Environment helpers
// ---------------------------------------------------------------------------

function setOmegaEnv(overrides: Partial<{
  OMEGA_FEDERATION_URL: string
  OMEGA_API_KEY: string
  OMEGA_TENANT_ID: string
}> = {}) {
  const base = {
    OMEGA_FEDERATION_URL: 'http://localhost:9405',
    OMEGA_API_KEY: 'test-api-key',
    OMEGA_TENANT_ID: 'test-tenant',
    ...overrides,
  }
  for (const [k, v] of Object.entries(base)) {
    process.env[k] = v
  }
}

function clearOmegaEnv() {
  delete process.env.OMEGA_FEDERATION_URL
  delete process.env.OMEGA_API_KEY
  delete process.env.OMEGA_TENANT_ID
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('hydrateDomainProfile', () => {
  // Always clear env after each test to prevent leakage.
  afterEach(() => {
    clearOmegaEnv()
  })

  // ── Graceful degradation: missing env vars ─────────────────────────────

  it('returns null when OMEGA_FEDERATION_URL is not set', async () => {
    clearOmegaEnv()  // No env set at all.

    // Fetch must never be called.
    const { calls, restore } = stubFetch({ ok: false, status: 404, json: async () => ({}) })
    try {
      const result = await hydrateDomainProfile('landscaping', 'domain.schema.v1')
      assert.equal(result, null)
      assert.equal(calls.length, 0)
    } finally {
      restore()
    }
  })

  it('returns null when OMEGA_API_KEY is not set', async () => {
    setOmegaEnv({ OMEGA_API_KEY: '' })
    delete process.env.OMEGA_API_KEY

    const { calls, restore } = stubFetch({ ok: false, status: 404, json: async () => ({}) })
    try {
      const result = await hydrateDomainProfile('landscaping', 'domain.schema.v1')
      assert.equal(result, null)
      assert.equal(calls.length, 0)
    } finally {
      restore()
    }
  })

  it('returns null when OMEGA_TENANT_ID is not set', async () => {
    setOmegaEnv({ OMEGA_TENANT_ID: '' })
    delete process.env.OMEGA_TENANT_ID

    const { calls, restore } = stubFetch({ ok: false, status: 404, json: async () => ({}) })
    try {
      const result = await hydrateDomainProfile('landscaping', 'domain.schema.v1')
      assert.equal(result, null)
      assert.equal(calls.length, 0)
    } finally {
      restore()
    }
  })

  // ── HTTP 404: domain not in registry ──────────────────────────────────

  it('returns null when omega-core returns 404', async () => {
    setOmegaEnv()

    const { calls, restore } = stubFetch({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Not found' }),
    })
    try {
      const result = await hydrateDomainProfile('unknown_domain', 'domain.schema.v1')
      assert.equal(result, null)
      assert.equal(calls.length, 1)
    } finally {
      restore()
    }
  })

  // ── HTTP non-404 error: graceful degradation ──────────────────────────

  it('returns null for non-404 HTTP error responses (graceful degradation)', async () => {
    setOmegaEnv()

    const { restore } = stubFetch({
      ok: false,
      status: 503,
      json: async () => ({ error: 'Service Unavailable' }),
    })
    try {
      const result = await hydrateDomainProfile('landscaping', 'domain.schema.v1')
      assert.equal(result, null)
    } finally {
      restore()
    }
  })

  // ── Successful retrieval ───────────────────────────────────────────────

  it('returns a HydratedDomainProfile when omega-core returns 200', async () => {
    setOmegaEnv()

    const mockProfile = {
      domain_key: 'landscaping',
      schema_id: 'domain.schema.v1',
      version: '1.0.0',
      source: 'omega-registry',
      payload_hash: 'abc123def456',
      payload: {
        industry: 'Landscaping',
        pricing_models: ['per_visit'],
      },
    }

    const { restore } = stubFetch({
      ok: true,
      status: 200,
      json: async () => mockProfile,
    })
    try {
      const result = await hydrateDomainProfile('landscaping', 'domain.schema.v1')

      assert.notEqual(result, null)
      const profile = result as HydratedDomainProfile
      assert.equal(profile.schemaId, 'domain.schema.v1')
      assert.equal(profile.profileVersion, '1.0.0')
      assert.equal(profile.source, 'omega-registry')
      assert.deepEqual(profile.payload, { industry: 'Landscaping', pricing_models: ['per_visit'] })
    } finally {
      restore()
    }
  })

  it('uses payload_hash from response when provided', async () => {
    setOmegaEnv()

    const mockProfile = {
      schema_id: 'domain.schema.v1',
      version: '1.0.0',
      source: 'omega-registry',
      payload_hash: 'server-computed-hash-abc',
      payload: { industry: 'Test' },
    }

    const { restore } = stubFetch({ ok: true, status: 200, json: async () => mockProfile })
    try {
      const result = await hydrateDomainProfile('landscaping', 'domain.schema.v1')
      assert.notEqual(result, null)
      assert.equal(result!.payloadHash, 'server-computed-hash-abc')
    } finally {
      restore()
    }
  })

  it('falls back to SHA-256 of payload when payload_hash not in response', async () => {
    setOmegaEnv()

    const payload = { industry: 'Test', note: 'no hash in response' }
    const mockProfile = {
      schema_id: 'domain.schema.v1',
      version: '1.0.0',
      // payload_hash intentionally omitted
      payload,
    }

    const { restore } = stubFetch({ ok: true, status: 200, json: async () => mockProfile })
    try {
      const result = await hydrateDomainProfile('landscaping', 'domain.schema.v1')
      assert.notEqual(result, null)
      // Hash should be a 64-char hex string (SHA-256).
      assert.match(result!.payloadHash, /^[0-9a-f]{64}$/)
    } finally {
      restore()
    }
  })

  it('returns null when response body has no payload field', async () => {
    setOmegaEnv()

    const mockProfile = { schema_id: 'domain.schema.v1', version: '1.0.0' }  // No payload key.

    const { restore } = stubFetch({ ok: true, status: 200, json: async () => mockProfile })
    try {
      const result = await hydrateDomainProfile('landscaping', 'domain.schema.v1')
      assert.equal(result, null)
    } finally {
      restore()
    }
  })

  // ── Network failures: graceful degradation ────────────────────────────

  it('returns null gracefully when fetch throws a network error', async () => {
    setOmegaEnv()

    const { restore } = stubFetchThrows(new Error('Network error'))
    try {
      const result = await hydrateDomainProfile('landscaping', 'domain.schema.v1')
      assert.equal(result, null)
    } finally {
      restore()
    }
  })

  it('returns null gracefully when fetch throws an AbortError (timeout)', async () => {
    setOmegaEnv()

    const abortError = new Error('The operation was aborted')
    abortError.name = 'AbortError'
    const { restore } = stubFetchThrows(abortError)
    try {
      const result = await hydrateDomainProfile('landscaping', 'domain.schema.v1')
      assert.equal(result, null)
    } finally {
      restore()
    }
  })

  // ── URL construction ──────────────────────────────────────────────────

  it('calls the correct omega-core registry URL', async () => {
    setOmegaEnv()

    const { calls, restore } = stubFetch({
      ok: false,
      status: 404,
      json: async () => ({}),
    })
    try {
      await hydrateDomainProfile('landscaping', 'domain.schema.v1')
      assert.equal(calls.length, 1)
      assert.match(
        calls[0].url,
        /\/api\/fc\/registry\/domain-profiles\/landscaping/
      )
      assert.match(calls[0].url, /schema_id=domain\.schema\.v1/)
    } finally {
      restore()
    }
  })

  it('includes Authorization and X-Tenant-Id headers in the request', async () => {
    setOmegaEnv({
      OMEGA_API_KEY: 'my-secret-key',
      OMEGA_TENANT_ID: 'my-tenant-id',
    })

    const { calls, restore } = stubFetch({
      ok: false,
      status: 404,
      json: async () => ({}),
    })
    try {
      await hydrateDomainProfile('landscaping', 'domain.schema.v1')
      assert.equal(calls.length, 1)
      const headers = calls[0].init.headers as Record<string, string>
      assert.equal(headers['Authorization'], 'Bearer my-secret-key')
      assert.equal(headers['X-Tenant-Id'], 'my-tenant-id')
    } finally {
      restore()
    }
  })

  it('URL-encodes the domainKey when it contains special characters', async () => {
    setOmegaEnv()

    const { calls, restore } = stubFetch({
      ok: false,
      status: 404,
      json: async () => ({}),
    })
    try {
      await hydrateDomainProfile('lawn & garden', 'domain.schema.v1')
      assert.equal(calls.length, 1)
      // The slash-separated domain key segment must be URL-encoded.
      assert.ok(
        !calls[0].url.includes('lawn & garden'),
        'Raw unencoded space and & must not appear in URL'
      )
    } finally {
      restore()
    }
  })
})
