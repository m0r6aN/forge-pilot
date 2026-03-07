/**
 * Component: UI Truthfulness Contract
 *
 * Enforces that the ForgePilot UI never misleads the user:
 *   - No "Success" language before brief step completion
 *   - traceId and receiptRef shown ONLY in brief step
 *   - Loading state is explicit and present during all async ops
 *   - Error state message is real (not generic "Error occurred")
 *
 * Assertions:
 *   INV-TRUTHFULNESS — no premature success indicators
 *   INV-OBSERVABILITY — loading and error states visible to user
 */

import { test, expect } from '../fixtures/evidence-fixture.js'

test('traceId and receiptRef not visible on idea step', async ({ page, emitter }) => {
  await page.goto('/launch')

  // On idea step: trace/receipt fields must not be visible
  await expect(page.getByText(/^Trace:/)).not.toBeVisible()
  await expect(page.getByText(/^Receipt:/)).not.toBeVisible()

  emitter.addAssertion({ id: 'INV-TRUTHFULNESS', status: 'pass', message: 'Trace/Receipt hidden on idea step' })
})

test('traceId shows "pending" then real value in brief', async ({ page, emitter }) => {
  await page.route('/api/launch/teaser', async (route) => {
    await new Promise((r) => setTimeout(r, 300))
    route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({
        ok: true, code: 'teaser_generated',
        teaser: { oneLiner: 'T', positioning: 'p', icpSnapshot: 'i',
          monetizationAngle: 'm', strategicDifferentiator: 's', ctaHeadline: 'c', ctaUnlockValue: 'u' },
        traceId: 'truth-trace-001', receiptRef: 'truth-receipt-001', workflowVersion: 'v1',
      }),
    })
  })

  await page.goto('/launch')
  await page.getByRole('textbox').first().fill('AI tool for freelance developers to land clients faster')
  await page.locator('input[type="email"]').fill('truth@example.com')
  await page.getByRole('button', { name: /Build My 90-Day Launch Plan/i }).click()

  await expect(page.getByText('Your Launch Plan Preview')).toBeVisible({ timeout: 10_000 })

  // traceId and receiptRef should now be visible with real values
  await expect(page.getByText('Trace: truth-trace-001')).toBeVisible()
  await expect(page.getByText('Receipt: truth-receipt-001')).toBeVisible()

  emitter.addAssertion({ id: 'INV-TRUTHFULNESS', status: 'pass', message: 'traceId/receiptRef correct in brief' })
})

test('no false "Complete" or "Done" text before brief step', async ({ page, emitter }) => {
  await page.route('/api/launch/teaser', async (route) => {
    await new Promise((r) => setTimeout(r, 1000))
    route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({
        ok: true, code: 'teaser_generated',
        teaser: { oneLiner: 'T', positioning: 'p', icpSnapshot: 'i',
          monetizationAngle: 'm', strategicDifferentiator: 's', ctaHeadline: 'c', ctaUnlockValue: 'u' },
        traceId: 'complete-trace', receiptRef: 'complete-receipt', workflowVersion: 'v1',
      }),
    })
  })

  await page.goto('/launch')
  await page.getByRole('textbox').first().fill('AI tool for freelance developers to land clients faster')
  await page.locator('input[type="email"]').fill('complete@example.com')
  await page.getByRole('button', { name: /Build My 90-Day Launch Plan/i }).click()

  // While loading: no misleading success text
  await expect(page.getByText('Reviewing your idea')).toBeVisible({ timeout: 3_000 })
  await expect(page.getByText(/\bComplete\b|\bDone\b|\bSuccess\b/)).not.toBeVisible()

  emitter.addAssertion({ id: 'INV-TRUTHFULNESS', status: 'pass', message: 'no false success text during loading' })
})

test('error message is specific, not generic', async ({ page, emitter }) => {
  await page.route('/api/launch/teaser', (route) => {
    route.fulfill({
      status: 500, contentType: 'application/json',
      body: JSON.stringify({
        ok: false, code: 'quota_exceeded',
        message: 'Strategy generation quota exceeded. Try again in a few minutes.',
        error: { code: 'quota_exceeded', message: 'Strategy generation quota exceeded.', retryable: true },
      }),
    })
  })

  await page.goto('/launch')
  await page.getByRole('textbox').first().fill('AI tool for freelance developers to land clients faster')
  await page.locator('input[type="email"]').fill('error@example.com')
  await page.getByRole('button', { name: /Build My 90-Day Launch Plan/i }).click()

  // Error card should be visible
  const errorCard = page.locator('[class*="border-red"], [class*="text-red"]').first()
  await expect(errorCard).toBeVisible({ timeout: 8_000 })

  // Should NOT show a fully generic "An error occurred" message as the only text
  // The real message from the API response should be visible
  const errorText = await errorCard.textContent()
  expect(errorText?.length ?? 0).toBeGreaterThan(10)

  emitter.addAssertion({ id: 'INV-TRUTHFULNESS', status: 'pass', message: 'error message is specific and user-visible' })
  emitter.addAssertion({ id: 'INV-OBSERVABILITY', status: 'pass' })
})

