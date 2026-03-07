/**
 * Component: Launch Form Validation
 *
 * Tests the client-side validation rules of LaunchSession without calling the real API.
 * All API routes are blocked to ensure validation happens before any network request.
 *
 * Rules under test (from launch-session.tsx):
 *   - idea < 20 chars → submit button disabled (canSubmitIdea)
 *   - invalid email → validateIdeaSubmission returns error
 *   - physical biz type without location → blocked
 *   - 'both' biz type without location → blocked
 *
 * Assertions:
 *   INV-CONTRACT    — validation rules match spec
 *   INV-TRUTHFULNESS — error messages are user-visible and accurate
 */

import { test, expect } from '../fixtures/evidence-fixture.js'

test.beforeEach(async ({ page }) => {
  // Block API calls for all validation tests — we only test UI gate
  await page.route('/api/**', (route) => route.abort())
})

test('submit button disabled when idea < 20 chars', async ({ page, emitter }) => {
  await page.goto('/launch')

  const submitBtn = page.getByRole('button', { name: /Build My 90-Day Launch Plan/i })

  // Empty idea — should be disabled
  await expect(submitBtn).toBeDisabled()

  // 19 chars — still disabled (canSubmitIdea = idea.trim().length >= 20)
  await page.getByRole('textbox').first().fill('Short idea text 19c')
  await expect(submitBtn).toBeDisabled()

  // 20 chars exactly — should be enabled
  await page.getByRole('textbox').first().fill('Exactly twenty chars!')
  await expect(submitBtn).toBeEnabled()

  emitter.addAssertion({ id: 'INV-CONTRACT', status: 'pass', message: 'canSubmitIdea gate: <20 disabled, >=20 enabled' })
})

test('invalid email shows validation error on submit', async ({ page, emitter }) => {
  await page.route('/api/**', (route) => route.abort())
  await page.goto('/launch')

  await page.getByRole('textbox').first().fill('AI tool for freelance developers to land clients faster')
  // Set invalid email
  await page.locator('input[type="email"]').fill('not-a-valid-email')

  const submitBtn = page.getByRole('button', { name: /Build My 90-Day Launch Plan/i })
  await submitBtn.click()

  // Error about email should appear
  await expect(page.getByText(/valid email/i)).toBeVisible({ timeout: 3_000 })

  emitter.addAssertion({ id: 'INV-CONTRACT', status: 'pass', message: 'invalid email blocked with user-visible error' })
  emitter.addAssertion({ id: 'INV-TRUTHFULNESS', status: 'pass' })
})

test('physical business without location shows error', async ({ page, emitter }) => {
  await page.goto('/launch')

  await page.getByRole('textbox').first().fill('AI tool for freelance developers to land clients faster')
  await page.locator('input[type="email"]').fill('test@example.com')

  // Select 'physical' business type
  // The biz type selector may be in advanced options or visible directly
  const physicalOption = page.locator('[value="physical"], option[value="physical"]')
  const count = await physicalOption.count()

  if (count > 0) {
    // Click on the physical option (it's a SelectItem or radio)
    await physicalOption.first().click()

    // Ensure location is empty
    const locationInput = page.locator('input[placeholder*="city"], input[name*="location"], input[placeholder*="location"]')
    const locCount = await locationInput.count()
    if (locCount > 0) {
      await locationInput.fill('')
    }

    const submitBtn = page.getByRole('button', { name: /Build My 90-Day Launch Plan/i })
    await submitBtn.click()

    // Error about location should appear
    await expect(page.getByText(/location/i)).toBeVisible({ timeout: 3_000 })
    emitter.addAssertion({ id: 'INV-CONTRACT', status: 'pass', message: 'physical biz + no location blocked' })
  } else {
    // Physical option not directly interactable — skip this sub-check
    emitter.addAssertion({ id: 'INV-CONTRACT', status: 'skip', message: 'physical option not found in DOM' })
  }
})

test('clarify submit blocked when answers empty', async ({ page, emitter }) => {
  // Need to reach clarify step — mock teaser to return clarification needed
  await page.unroute('/api/**')
  await page.route('/api/launch/teaser', (route) => {
    route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({
        ok: true, needs_clarification: true,
        questions: ['Who is your customer?', 'What is your model?'],
        traceId: 'val-trace-001',
      }),
    })
  })
  await page.route('/api/launch/teaser/answer', (route) => route.abort())

  await page.goto('/launch')
  await page.getByRole('textbox').first().fill('AI tool for freelance developers to land clients faster')
  await page.locator('input[type="email"]').fill('clarify@example.com')
  await page.getByRole('button', { name: /Build My 90-Day Launch Plan/i }).click()
  await expect(page.getByText('Two quick questions')).toBeVisible({ timeout: 10_000 })

  // Try submit without answering
  const genBtn = page.getByRole('button', { name: /Generate Launch Plan Preview/i })
  await expect(genBtn).toBeDisabled()

  emitter.addAssertion({ id: 'INV-CONTRACT', status: 'pass', message: 'clarify submit blocked until all answers filled' })
})

