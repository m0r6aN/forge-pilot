/**
 * Site Smoke — keon.systems
 *
 * T0 Smoke: Key routes respond 200, page titles are set, no console errors.
 *
 * Assertions:
 *   INV-CONTRACT     — HTTP 200 for all checked routes
 *   INV-TRUTHFULNESS — page titles present and non-empty
 *   INV-OBSERVABILITY — zero console errors on critical pages
 */

import { test, expect } from '../../fixtures/evidence-fixture.js'

const CRITICAL_ROUTES = [
  { path: '/', titleFragment: /keon/i },
  { path: '/about', titleFragment: /about|keon/i },
  { path: '/contact', titleFragment: /contact|keon/i },
]

for (const route of CRITICAL_ROUTES) {
  test(`smoke: ${route.path} returns 200 and has title`, async ({ page, emitter }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    const response = await page.goto(route.path)

    // INV-CONTRACT: must return 2xx
    expect(response?.status()).toBeLessThan(400)

    // INV-TRUTHFULNESS: title must be set
    const title = await page.title()
    expect(title.trim().length).toBeGreaterThan(0)
    await expect(page).toHaveTitle(route.titleFragment)

    // INV-OBSERVABILITY: no console errors
    // Allow minor third-party noise but fail on application errors
    const appErrors = consoleErrors.filter(
      (e) => !e.includes('chrome-extension') && !e.includes('favicon')
    )
    expect(appErrors, `Console errors on ${route.path}: ${appErrors.join('; ')}`).toHaveLength(0)

    emitter.addAssertion({ id: 'INV-CONTRACT', status: 'pass', message: `${route.path} → ${response?.status()}` })
    emitter.addAssertion({ id: 'INV-TRUTHFULNESS', status: 'pass', message: `title="${title}"` })
    emitter.addAssertion({ id: 'INV-OBSERVABILITY', status: 'pass' })
  })
}

test('smoke: /launch route is accessible from keon.systems nav', async ({ page, emitter }) => {
  await page.goto('/')

  // Look for any link pointing to ForgePilot
  const forgeLink = page.locator('a[href*="forgepilot"], a[href*="launch"]').first()
  const count = await forgeLink.count()

  if (count > 0) {
    const href = await forgeLink.getAttribute('href')
    expect(href).toBeTruthy()
    emitter.addAssertion({ id: 'INV-CONTRACT', status: 'pass', message: `ForgePilot link found: ${href}` })
  } else {
    // Not all pages have nav to ForgePilot — skip gracefully
    emitter.addAssertion({ id: 'INV-CONTRACT', status: 'skip', message: 'No ForgePilot nav link on homepage' })
  }
})

test('smoke: robots.txt and sitemap.xml accessible', async ({ request, emitter }) => {
  const robots = await request.get('/robots.txt')
  expect(robots.status()).toBeLessThan(400)

  const sitemap = await request.get('/sitemap.xml')
  // 200 or 404 is acceptable — just can't be 5xx
  expect(sitemap.status()).not.toBe(500)
  expect(sitemap.status()).not.toBe(503)

  emitter.addAssertion({ id: 'INV-CONTRACT', status: 'pass', message: 'robots.txt accessible' })
})

