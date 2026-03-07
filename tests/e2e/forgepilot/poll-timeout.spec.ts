/**
 * E2E-5: Slow API / Poll Timeout
 *
 * Scenario A: API takes >3s to respond — UI shows loading card "Reviewing your idea"
 * and the submit button shows loading text. No success shown prematurely.
 *
 * Scenario B: API returns verification_required — modal appears with check-email message.
 *
 * Assertions:
 *   INV-TRUTHFULNESS  — loading state explicit, no false "Success" messaging
 *   INV-RESILIENCE    — verification modal shown correctly
 *   INV-OBSERVABILITY — loading card appears and disappears correctly
 */

import { test, expect } from '../../fixtures/evidence-fixture.js'

test('slow API shows loading card and loading button text', async ({ page, emitter }) => {
  await page.route('/api/launch/teaser', async (route) => {
    await new Promise((res) => setTimeout(res, 2000))
    route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({
        ok: true, code: 'teaser_generated',
        teaser: { oneLiner: 'Slow test', positioning: 'p', icpSnapshot: 'i',
          monetizationAngle: 'm', strategicDifferentiator: 's', ctaHeadline: 'c', ctaUnlockValue: 'u' },
        traceId: 'slow-trace', receiptRef: 'slow-receipt', workflowVersion: 'v1',
      }),
    })
  })

  await page.goto('/launch')
  await page.getByRole('textbox').first().fill('AI tool for freelance developers to land clients faster')
  await page.locator('input[type="email"]').fill('slow@example.com')
  await page.getByRole('button', { name: /Build My 90-Day Launch Plan/i }).click()

  // INV-TRUTHFULNESS: loading text visible immediately
  await expect(page.getByRole('button', { name: /Building Your Launch Plan/i })).toBeVisible({ timeout: 2_000 })

  // INV-OBSERVABILITY: loading card appears (blue border card with "Reviewing your idea")
  await expect(page.getByText('Reviewing your idea')).toBeVisible({ timeout: 3_000 })

  // INV-TRUTHFULNESS: "Your Launch Plan Preview" NOT visible yet
  await expect(page.getByText('Your Launch Plan Preview')).not.toBeVisible()

  // Wait for completion
  await expect(page.getByText('Your Launch Plan Preview')).toBeVisible({ timeout: 8_000 })

  // Loading card gone after brief arrives
  await expect(page.getByText('Reviewing your idea')).not.toBeVisible()

  emitter.addAssertion({ id: 'INV-TRUTHFULNESS', status: 'pass', message: 'loading shown; brief only after API returns' })
  emitter.addAssertion({ id: 'INV-OBSERVABILITY', status: 'pass', message: 'loading card visible during API call' })
})

test('verification_required response shows verification modal', async ({ page, emitter }) => {
  await page.route('/api/launch/teaser', (route) => {
    route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({
        verification_required: true,
        message: 'We sent a secure link to your email. Open it to continue.',
      }),
    })
  })

  await page.goto('/launch')
  await page.getByRole('textbox').first().fill('AI tool for freelance developers to land clients faster')
  await page.locator('input[type="email"]').fill('verify@example.com')
  await page.getByRole('button', { name: /Build My 90-Day Launch Plan/i }).click()

  // Verification modal should appear
  await expect(page.getByText(/Check your email to continue/i)).toBeVisible({ timeout: 8_000 })
  await expect(page.getByText(/secure link/i)).toBeVisible()

  // INV-TRUTHFULNESS: no "Your Launch Plan Preview" shown — verification gate active
  await expect(page.getByText('Your Launch Plan Preview')).not.toBeVisible()

  emitter.addAssertion({ id: 'INV-TRUTHFULNESS', status: 'pass', message: 'verification modal gating brief display' })
  emitter.addAssertion({ id: 'INV-RESILIENCE', status: 'pass', message: 'verification_required handled gracefully' })
})

test('clarification flow visible and answerable', async ({ page, emitter }) => {
  await page.route('/api/launch/teaser', (route) => {
    route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({
        ok: true, needs_clarification: true,
        questions: ['Who is your primary customer?', 'What is your revenue model?'],
        traceId: 'poll-trace-001',
      }),
    })
  })

  await page.route('/api/launch/teaser/answer', (route) => {
    route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({
        ok: true, code: 'teaser_generated',
        teaser: { oneLiner: 'Clarify test', positioning: 'p', icpSnapshot: 'i',
          monetizationAngle: 'm', strategicDifferentiator: 's', ctaHeadline: 'c', ctaUnlockValue: 'u' },
        traceId: 'poll-trace-001', receiptRef: 'poll-receipt-001', workflowVersion: 'v1',
      }),
    })
  })

  await page.goto('/launch')
  await page.getByRole('textbox').first().fill('AI tool for freelance developers to land clients faster')
  await page.locator('input[type="email"]').fill('clarify@example.com')
  await page.getByRole('button', { name: /Build My 90-Day Launch Plan/i }).click()

  // Clarify step appears
  await expect(page.getByText('Two quick questions')).toBeVisible({ timeout: 10_000 })
  const textareas = page.locator('textarea')
  await textareas.nth(0).fill('Small business owners')
  await textareas.nth(1).fill('Subscription SaaS')

  await page.getByRole('button', { name: /Generate Launch Plan Preview/i }).click()
  await expect(page.getByText('Your Launch Plan Preview')).toBeVisible({ timeout: 10_000 })

  emitter.addAssertion({ id: 'INV-CONTRACT', status: 'pass', message: 'clarification flow contract fulfilled' })
  emitter.addAssertion({ id: 'INV-TRUTHFULNESS', status: 'pass' })
})

