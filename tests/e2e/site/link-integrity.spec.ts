/**
 * Site Link Integrity — keon.systems
 *
 * Crawls internal links from the homepage and verifies 0 broken links (< 400).
 * External links are checked for non-5xx only (timeout-tolerant).
 *
 * Assertions:
 *   INV-CONTRACT  — 0 broken internal links
 *   INV-CONTRACT  — 0 server-error external links
 */

import { test, expect } from '../../fixtures/evidence-fixture.js'

const MAX_LINKS_TO_CHECK = 50
const REQUEST_TIMEOUT = 10_000

test('zero broken internal links from homepage', async ({ page, request, emitter }) => {
  await page.goto('/')

  // Collect all anchor href values
  const hrefs = await page.$$eval('a[href]', (anchors) =>
    anchors
      .map((a) => a.getAttribute('href') ?? '')
      .filter(Boolean)
  )

  const baseUrl = page.url().replace(/\/$/, '').split('/').slice(0, 3).join('/')

  const internalLinks = hrefs
    .filter((h) => h.startsWith('/') || h.startsWith(baseUrl))
    .map((h) => (h.startsWith('/') ? `${baseUrl}${h}` : h))
    .map((h) => h.split('#')[0]) // strip anchors
    .filter((h, i, arr) => arr.indexOf(h) === i) // dedupe
    .slice(0, MAX_LINKS_TO_CHECK)

  const brokenLinks: string[] = []

  for (const link of internalLinks) {
    try {
      const res = await request.get(link, { timeout: REQUEST_TIMEOUT })
      if (res.status() >= 400) {
        brokenLinks.push(`${link} → ${res.status()}`)
      }
    } catch (err) {
      brokenLinks.push(`${link} → NETWORK_ERROR`)
    }
  }

  expect(
    brokenLinks,
    `Broken internal links:\n${brokenLinks.join('\n')}`
  ).toHaveLength(0)

  emitter.addAssertion({
    id: 'INV-CONTRACT',
    status: brokenLinks.length === 0 ? 'pass' : 'fail',
    message: `Checked ${internalLinks.length} internal links, ${brokenLinks.length} broken`,
  })
})

test('external links do not return 5xx errors', async ({ page, request, emitter }) => {
  await page.goto('/')

  const hrefs = await page.$$eval('a[href]', (anchors) =>
    anchors.map((a) => a.getAttribute('href') ?? '').filter(Boolean)
  )

  const baseUrl = page.url().replace(/\/$/, '').split('/').slice(0, 3).join('/')

  const externalLinks = hrefs
    .filter((h) => h.startsWith('http') && !h.startsWith(baseUrl))
    .filter((h, i, arr) => arr.indexOf(h) === i)
    .slice(0, 20)

  const serverErrors: string[] = []

  for (const link of externalLinks) {
    try {
      const res = await request.get(link, { timeout: REQUEST_TIMEOUT })
      if (res.status() >= 500) {
        serverErrors.push(`${link} → ${res.status()}`)
      }
    } catch {
      // External links may refuse HEAD/GET — not a failure
    }
  }

  expect(
    serverErrors,
    `External links returning 5xx:\n${serverErrors.join('\n')}`
  ).toHaveLength(0)

  emitter.addAssertion({
    id: 'INV-CONTRACT',
    status: serverErrors.length === 0 ? 'pass' : 'fail',
    message: `Checked ${externalLinks.length} external links`,
  })
})

