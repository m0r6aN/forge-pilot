/**
 * Playwright fixture — wraps EvidenceEmitter so every test auto-emits
 * a run_manifest.json + artifacts.json on completion.
 *
 * Usage:
 *   import { test, expect } from '../fixtures/evidence-fixture.js'
 *   test('my scenario', async ({ page, emitter }) => { ... })
 */

import { test as base, type TestInfo } from '@playwright/test'
import { EvidenceEmitter } from '../helpers/evidence-emitter.js'
import type { RunEnv, RunSuite, Assertion } from '../helpers/manifest.types.js'

export type EvidenceFixtures = {
  emitter: EvidenceFixture
}

/** Fixture object exposed to tests */
export interface EvidenceFixture {
  readonly runId: string
  addAssertion(assertion: Assertion): void
  addArtifact(absolutePath: string): void
}

function resolveEnv(): RunEnv {
  if (process.env['CI']) return 'ci'
  if (process.env['TEST_ENV']) return process.env['TEST_ENV'] as RunEnv
  return 'local'
}

function resolveLayer(testInfo: TestInfo): string {
  if (testInfo.file.includes('e2e/forgepilot')) return 'forgepilot.ai'
  if (testInfo.file.includes('e2e/site')) return 'keon.systems'
  if (testInfo.file.includes('component')) return 'forgepilot.ai/component'
  return 'forgepilot.ai'
}

function resolveSuite(testInfo: TestInfo): RunSuite {
  if (testInfo.file.includes('smoke')) return 'smoke'
  if (testInfo.file.includes('link-integrity')) return 'smoke'
  if (testInfo.file.includes('component') || testInfo.file.includes('validation')) return 'unit'
  if (testInfo.file.includes('obs')) return 'obs'
  return 'e2e'
}

function toScenarioId(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'unnamed'
}

export const test = base.extend<EvidenceFixtures>({
  emitter: async ({}, use, testInfo) => {
    const backend = new EvidenceEmitter({
      azureConnectionString: process.env['AZURE_STORAGE_CONNECTION_STRING'],
      commitSha: process.env['GIT_COMMIT'],
      branch: process.env['GIT_BRANCH'],
      ciUrl: process.env['CI_RUN_URL'],
    })

    const assertions: Assertion[] = []
    const artifactPaths: string[] = []

    const fixture: EvidenceFixture = {
      get runId() { return backend.id },
      addAssertion(a) { assertions.push(a) },
      addArtifact(p) { artifactPaths.push(p) },
    }

    await use(fixture)

    // Auto-collect Playwright trace/screenshot paths
    if (testInfo.attachments) {
      for (const att of testInfo.attachments) {
        if (att.path) artifactPaths.push(att.path)
      }
    }

    const status = testInfo.status === 'passed' ? 'pass'
      : testInfo.status === 'failed' ? 'fail'
      : testInfo.status === 'skipped' ? 'skip'
      : 'abort'

    await backend.emit({
      env: resolveEnv(),
      layer: resolveLayer(testInfo),
      suite: resolveSuite(testInfo),
      scenarioId: toScenarioId(testInfo.title),
      status,
      source: { file: testInfo.file.replace(/\\/g, '/') },
      assertions,
      artifactPaths,
      tags: testInfo.tags as string[],
    })
  },
})

export { expect } from '@playwright/test'

