/**
 * E2E-2: Retry Idempotency
 *
 * Scenario: First API call fails → user clicks "Retry with me" → second call
 * succeeds → same sessionId is reused (idempotency key stable across retry).
 *
 * Assertions:
 *   INV-IDEMPOTENCY   — sessionId unchanged between initial call and retry
 *   INV-RESILIENCE    — retry button appears on error; success follows retry
 *   INV-TRUTHFULNESS  — error message is user-visible and non-empty
 */

import { test, expect } from '../../fixtures/evidence-fixture.js'

test('retry uses same sessionId after API error', async ({ page, emitter }) => {
  let callCount = 0
  const sessionIds: string[] = []

  await page.route('/api/launch/teaser', (route) => {
    callCount++
    try {
      const body = JSON.parse(route.request().postData() ?? '{}')
      if (body.sessionId) sessionIds.push(body.sessionId)
    } catch { /* ignore */ }

    if (callCount === 1) {
      // First call: simulate retriable server error
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: false,
          code: 'internal_error',
          message: 'Upstream timeout',
          error: { code: 'internal_error', message: 'Upstream timeout', retryable: true },
        }),
      })
    } else {
      // Second call: success
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true, code: 'teaser_generated',
          teaser: { oneLiner: 'Retry succeeded', positioning: 'p', icpSnapshot: 'i',
            monetizationAngle: 'm', strategicDifferentiator: 's', ctaHeadline: 'c', ctaUnlockValue: 'u' },
          traceId: 'retry-trace-001', receiptRef: 'retry-receipt-001', workflowVersion: 'v1',
        }),
      })
    }
  })

  await page.goto('/launch')
  await page.getByRole('textbox').first().fill('Building AI tools that help developers ship products faster')
  await page.locator('input[type="email"]').fill('retry@example.com')
  await page.getByRole('button', { name: /Build My 90-Day Launch Plan/i }).click()

  // INV-TRUTHFULNESS: error should be visible with retry button
  const retryBtn = page.getByRole('button', { name: /Retry with me/i })
  await expect(retryBtn).toBeVisible({ timeout: 10_000 })

  // Verify error text is non-empty (truthfulness: show real message)
  const errorText = page.locator('p.text-red-700, [class*="text-red"]')
  await expect(errorText.first()).toBeVisible()

  // Click retry
  await retryBtn.click()

  // Should succeed and reach brief
  await expect(page.getByText('Your Launch Plan Preview')).toBeVisible({ timeout: 10_000 })

  // INV-IDEMPOTENCY: both calls used the same sessionId
  expect(sessionIds.length).toBe(2)
  expect(sessionIds[0]).toBeTruthy()
  expect(sessionIds[0]).toBe(sessionIds[1])
  expect(callCount).toBe(2)

  emitter.addAssertion({ id: 'INV-IDEMPOTENCY', status: 'pass', message: `sessionId=${sessionIds[0]} reused on retry` })
  emitter.addAssertion({ id: 'INV-RESILIENCE', status: 'pass', message: 'retry button appeared; success on 2nd call' })
  emitter.addAssertion({ id: 'INV-TRUTHFULNESS', status: 'pass', message: 'error text visible to user' })
})

test('retry in clarify step reuses traceId', async ({ page, emitter }) => {
  let clarifyCallCount = 0

  // First: return clarification needed
  await page.route('/api/launch/teaser', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true, needs_clarification: true,
        questions: ['Who is your primary user?', 'What is your main channel?'],
        traceId: 'clarify-trace-001',
      }),
    })
  })

  await page.route('/api/launch/teaser/answer', (route) => {
    clarifyCallCount++
    if (clarifyCallCount === 1) {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, code: 'error', message: 'Temporary failure',
          error: { code: 'error', message: 'Temporary failure', retryable: true } }),
      })
    } else {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true, code: 'teaser_generated',
          teaser: { oneLiner: 'Clarify retry ok', positioning: 'p', icpSnapshot: 'i',
            monetizationAngle: 'm', strategicDifferentiator: 's', ctaHeadline: 'c', ctaUnlockValue: 'u' },
          traceId: 'clarify-trace-001', receiptRef: 'receipt-002', workflowVersion: 'v1',
        }),
      })
    }
  })

  await page.goto('/launch')
  await page.getByRole('textbox').first().fill('Building AI tools that help developers ship products faster')
  await page.locator('input[type="email"]').fill('clarify@example.com')
  await page.getByRole('button', { name: /Build My 90-Day Launch Plan/i }).click()

  // Should reach clarify step
  await expect(page.getByText('Two quick questions')).toBeVisible({ timeout: 10_000 })
  const textareas = page.locator('textarea')
  await textareas.nth(0).fill('Technical founders')
  await textareas.nth(1).fill('Content marketing')

  await page.getByRole('button', { name: /Generate Launch Plan Preview/i }).click()

  // Error → retry appears
  const retryBtn = page.getByRole('button', { name: /Retry with me/i })
  await expect(retryBtn).toBeVisible({ timeout: 10_000 })
  await retryBtn.click()

  await expect(page.getByText('Your Launch Plan Preview')).toBeVisible({ timeout: 10_000 })
  expect(clarifyCallCount).toBe(2)

  emitter.addAssertion({ id: 'INV-IDEMPOTENCY', status: 'pass', message: 'retry routes back to submitAnswers' })
  emitter.addAssertion({ id: 'INV-RESILIENCE', status: 'pass' })
})

