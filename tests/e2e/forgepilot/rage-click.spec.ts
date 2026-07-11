/**
 * E2E-3: Rage-Click / In-Flight Deduplication
 *
 * Scenario: User clicks submit multiple times in rapid succession.
 * Only one API request should be in-flight at a time (the button
 * disables during loading). Validates the loading guard works.
 *
 * Assertions:
 *   INV-IDEMPOTENCY  — only 1 in-flight request regardless of click count
 *   INV-TRUTHFULNESS — loading state clearly visible (button text changes)
 */

import { test, expect } from '../../fixtures/evidence-fixture.js'

test('rage clicks produce only one in-flight request', async ({ page, emitter }) => {
  let requestCount = 0
  const requestTimes: number[] = []

  await page.route('/api/launch/teaser', async (route) => {
    requestCount++
    requestTimes.push(Date.now())
    // Slow response to keep loading state active during rapid clicks
    await new Promise((res) => setTimeout(res, 800))
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true, code: 'teaser_generated',
        teaser: { oneLiner: 'Rage click test', positioning: 'p', icpSnapshot: 'i',
          monetizationAngle: 'm', strategicDifferentiator: 's', ctaHeadline: 'c', ctaUnlockValue: 'u' },
        traceId: 'rage-trace-001', receiptRef: 'rage-receipt-001', workflowVersion: 'v1',
      }),
    })
  })

  await page.goto('/launch')
  await page.getByRole('textbox').first().fill('AI tool for freelance developers to land clients faster')
  await page.locator('input[type="email"]').fill('rage@example.com')

  const submitBtn = page.getByRole('button', { name: /Build My 90-Day Launch Plan/i })
  await expect(submitBtn).toBeEnabled()

  // Rapid clicks — 5 in quick succession
  await submitBtn.click()
  await submitBtn.click({ force: true })
  await submitBtn.click({ force: true })
  await submitBtn.click({ force: true })
  await submitBtn.click({ force: true })

  // INV-TRUTHFULNESS: loading state text visible
  await expect(page.getByRole('button', { name: /Building Your Launch Plan/i })).toBeVisible()

  // Wait for brief
  await expect(page.getByText('Your Launch Plan Preview')).toBeVisible({ timeout: 15_000 })

  // INV-IDEMPOTENCY: only 1 request sent
  expect(requestCount).toBe(1)

  emitter.addAssertion({ id: 'INV-IDEMPOTENCY', status: 'pass', message: `requestCount=${requestCount}` })
  emitter.addAssertion({ id: 'INV-TRUTHFULNESS', status: 'pass', message: 'loading button text shown' })
})

test('submit button disabled while loading', async ({ page, emitter }) => {
  await page.route('/api/launch/teaser', async (route) => {
    await new Promise((res) => setTimeout(res, 500))
    route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({
        ok: true, code: 'teaser_generated',
        teaser: { oneLiner: 'T', positioning: 'p', icpSnapshot: 'i',
          monetizationAngle: 'm', strategicDifferentiator: 's', ctaHeadline: 'c', ctaUnlockValue: 'u' },
        traceId: 'btn-trace', receiptRef: 'btn-receipt', workflowVersion: 'v1',
      }),
    })
  })

  await page.goto('/launch')
  await page.getByRole('textbox').first().fill('AI tool for freelance developers to land clients faster')
  await page.locator('input[type="email"]').fill('disabled@example.com')

  const btn = page.getByRole('button', { name: /Build My 90-Day Launch Plan/i })
  await btn.click()

  // Button must be disabled (loading guard)
  await expect(page.getByRole('button', { name: /Building Your Launch Plan/i })).toBeDisabled()

  emitter.addAssertion({ id: 'INV-TRUTHFULNESS', status: 'pass', message: 'button disabled during loading' })
})

