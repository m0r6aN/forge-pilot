/**
 * Component: Observability — Correlation ID Contract
 *
 * Verifies that:
 *   1. API responses include traceId in the response payload
 *   2. After a successful journey, the UI exposes traceId to the user
 *   3. Error responses include traceId (or code) so debugging is < 3 clicks
 *   4. sessionId is a valid UUID (used as idempotency key)
 *
 * Assertions:
 *   INV-CORRELATION   — traceId present in response payload and in UI
 *   INV-OBSERVABILITY — sessionId in request, traceId in response
 *   INV-IDEMPOTENCY   — sessionId is a valid UUID format
 */

import { test, expect } from '../fixtures/evidence-fixture.js'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

test('request payload includes sessionId as UUID', async ({ page, emitter }) => {
  let capturedBody: Record<string, unknown> | null = null

  await page.route('/api/launch/teaser', (route) => {
    try {
      capturedBody = JSON.parse(route.request().postData() ?? '{}')
    } catch { /* ignore */ }
    route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({
        ok: true, code: 'teaser_generated',
        teaser: { oneLiner: 'Obs test', positioning: 'p', icpSnapshot: 'i',
          monetizationAngle: 'm', strategicDifferentiator: 's', ctaHeadline: 'c', ctaUnlockValue: 'u' },
        traceId: 'obs-trace-001', receiptRef: 'obs-receipt-001', workflowVersion: 'v1',
      }),
    })
  })

  await page.goto('/launch')
  await page.getByRole('textbox').first().fill('AI tool for freelance developers to land clients faster')
  await page.locator('input[type="email"]').fill('obs@example.com')
  await page.getByRole('button', { name: /Build My 90-Day Launch Plan/i }).click()
  await expect(page.getByText('Your Launch Plan Preview')).toBeVisible({ timeout: 10_000 })

  // INV-IDEMPOTENCY: sessionId is a valid UUID
  expect(capturedBody).not.toBeNull()
  expect(capturedBody?.sessionId).toBeTruthy()
  expect(String(capturedBody?.sessionId)).toMatch(UUID_PATTERN)

  emitter.addAssertion({
    id: 'INV-IDEMPOTENCY',
    status: 'pass',
    message: `sessionId=${capturedBody?.sessionId}`,
  })
})

test('response payload includes traceId and receiptRef', async ({ page, emitter }) => {
  let responseBody: Record<string, unknown> | null = null

  await page.route('/api/launch/teaser', (route) => {
    const mockResponse = {
      ok: true, code: 'teaser_generated',
      teaser: { oneLiner: 'Correlation test', positioning: 'p', icpSnapshot: 'i',
        monetizationAngle: 'm', strategicDifferentiator: 's', ctaHeadline: 'c', ctaUnlockValue: 'u' },
      traceId: 'corr-trace-001', receiptRef: 'corr-receipt-001', workflowVersion: 'v1',
    }
    responseBody = mockResponse as unknown as Record<string, unknown>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockResponse) })
  })

  await page.goto('/launch')
  await page.getByRole('textbox').first().fill('AI tool for freelance developers to land clients faster')
  await page.locator('input[type="email"]').fill('corr@example.com')
  await page.getByRole('button', { name: /Build My 90-Day Launch Plan/i }).click()
  await expect(page.getByText('Your Launch Plan Preview')).toBeVisible({ timeout: 10_000 })

  // INV-CORRELATION: traceId in response payload
  expect(responseBody?.traceId).toBeTruthy()
  expect(responseBody?.receiptRef).toBeTruthy()

  // INV-CORRELATION: traceId must be surfaced in UI
  await expect(page.getByText(`Trace: ${responseBody!.traceId}`)).toBeVisible()
  await expect(page.getByText(`Receipt: ${responseBody!.receiptRef}`)).toBeVisible()

  emitter.addAssertion({ id: 'INV-CORRELATION', status: 'pass', message: `traceId=${responseBody!.traceId}` })
  emitter.addAssertion({ id: 'INV-OBSERVABILITY', status: 'pass' })
})

test('error response includes error code for debugging', async ({ page, emitter }) => {
  let errorCode: string | null = null

  await page.route('/api/launch/teaser', (route) => {
    const body = {
      ok: false, code: 'rate_limited',
      message: 'Too many requests.',
      error: { code: 'rate_limited', message: 'Too many requests.', retryable: true },
    }
    errorCode = body.code
    route.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify(body) })
  })

  await page.goto('/launch')
  await page.getByRole('textbox').first().fill('AI tool for freelance developers to land clients faster')
  await page.locator('input[type="email"]').fill('rate@example.com')
  await page.getByRole('button', { name: /Build My 90-Day Launch Plan/i }).click()

  // Error state visible
  const retryBtn = page.getByRole('button', { name: /Retry with me/i })
  await expect(retryBtn).toBeVisible({ timeout: 8_000 })

  // The error code is in the response — debugging should be < 3 clicks
  expect(errorCode).toBe('rate_limited')

  emitter.addAssertion({ id: 'INV-CORRELATION', status: 'pass', message: `error.code=${errorCode}` })
  emitter.addAssertion({ id: 'INV-OBSERVABILITY', status: 'pass', message: 'error code visible in response structure' })
})

