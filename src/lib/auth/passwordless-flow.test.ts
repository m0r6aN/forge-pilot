import test from 'node:test'
import assert from 'node:assert/strict'
import { NextRequest } from 'next/server'
import { issueMagicLinkToken, __resetSecurityStoresForTests } from '@/lib/launch/security'
import { signVerifiedEmailSession, VERIFIED_EMAIL_SESSION_COOKIE } from '@/lib/auth/verified-email-session'
import { GET as verifyMagicLink } from '@/app/api/auth/verify/route'
import { GET as authMe } from '@/app/api/auth/me/route'
import { POST as teaser } from '@/app/api/launch/teaser/route'

const TEST_JWT_SECRET = 'test-jwt-secret-for-passwordless-flow'

function jsonRequest(url: string, body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

test.beforeEach(() => {
  process.env.JWT_SECRET = TEST_JWT_SECRET
  delete process.env.OMEGA_FEDERATION_URL
  delete process.env.OMEGA_API_KEY
  delete process.env.OMEGA_TENANT_ID
  __resetSecurityStoresForTests()
})

test('token created -> verify consumes -> cookie set', async () => {
  const state = 'state-123'
  const token = issueMagicLinkToken({
    email: 'founder@example.com',
    returnTo: '/launch',
    state,
    ttlMs: 15 * 60 * 1000,
    ip: '127.0.0.1',
    userAgent: 'test-agent',
  })

  const response = await verifyMagicLink(
    new NextRequest(`http://localhost:3000/api/auth/verify?token=${token}&state=${state}&returnTo=/launch`)
  )

  assert.equal(response.status, 307)
  assert.match(response.headers.get('location') || '', /\/continue\?verified=1/)
  assert.match(response.headers.get('set-cookie') || '', /forgepilot-email-session=/)
})

test('verify replay fails', async () => {
  const state = 'state-456'
  const token = issueMagicLinkToken({
    email: 'founder@example.com',
    returnTo: '/launch',
    state,
    ttlMs: 15 * 60 * 1000,
    ip: '127.0.0.1',
    userAgent: 'test-agent',
  })
  const url = `http://localhost:3000/api/auth/verify?token=${token}&state=${state}&returnTo=/launch`

  await verifyMagicLink(new NextRequest(url))
  const replay = await verifyMagicLink(new NextRequest(url))

  assert.equal(replay.status, 307)
  assert.match(replay.headers.get('location') || '', /\/continue\?status=invalid/)
})

test('expired token fails', async () => {
  const state = 'state-789'
  const token = issueMagicLinkToken({
    email: 'founder@example.com',
    returnTo: '/launch',
    state,
    ttlMs: 5,
    ip: '127.0.0.1',
    userAgent: 'test-agent',
  })
  await new Promise((resolve) => setTimeout(resolve, 20))

  const response = await verifyMagicLink(
    new NextRequest(`http://localhost:3000/api/auth/verify?token=${token}&state=${state}&returnTo=/launch`)
  )
  assert.equal(response.status, 307)
  assert.match(response.headers.get('location') || '', /\/continue\?status=invalid/)
})

test('teaser without session returns verification_required', async () => {
  const response = await teaser(
    jsonRequest('http://localhost:3000/api/launch/teaser', {
      idea: 'Local non-SaaS business concept for neighborhood services and referrals.',
      sessionId: '11111111-1111-4111-8111-111111111111',
    })
  )
  const payload = await response.json()

  assert.equal(response.status, 200)
  assert.equal(payload.ok, true)
  assert.equal(payload.code, 'verification_required')
})

test('teaser with session proceeds beyond verification gate', async () => {
  const token = signVerifiedEmailSession({
    email: 'founder@example.com',
    sessionId: '22222222-2222-4222-8222-222222222222',
  })

  const response = await teaser(
    jsonRequest(
      'http://localhost:3000/api/launch/teaser',
      {
        idea: 'Offline service business focused on local operator workflows and retention.',
        sessionId: '22222222-2222-4222-8222-222222222222',
      },
      { cookie: `${VERIFIED_EMAIL_SESSION_COOKIE}=${token}` }
    )
  )
  const payload = await response.json()

  assert.equal(response.status, 200)
  assert.notEqual(payload.code, 'verification_required')
})

test('/api/auth/me returns unauthenticated false with 200', async () => {
  const response = await authMe(new NextRequest('http://localhost:3000/api/auth/me'))
  const payload = await response.json()

  assert.equal(response.status, 200)
  assert.equal(payload.authenticated, false)
  assert.equal(payload.code, 'unauthenticated')
})
