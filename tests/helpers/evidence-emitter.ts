/**
 * EvidenceEmitter — Canonical Test Doctrine v1.0.0
 *
 * Emits run_manifest.json + artifacts.json to .evidence/{scenarioId}/{runId}/
 * Optionally uploads to Azure Blob Storage (forgepilot-receipts container)
 * when AZURE_STORAGE_CONNECTION_STRING is set and @azure/storage-blob is available.
 *
 * Blob path: forgepilot-receipts/{env}/forgepilot.ai/{suite}/{scenarioId}/{runId}/
 */

import { createHash, randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import type {
  ArtifactsManifest,
  ArtifactEntry,
  EmitterOptions,
  RunEnv,
  RunManifest,
  RunStatus,
  RunSuite,
  Assertion,
} from './manifest.types.js'

const REPO_ROOT = resolve(new URL('.', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'), '../..')
const DEFAULT_SPOOL_ROOT = join(REPO_ROOT, '.evidence')

export class EvidenceEmitter {
  private readonly runId: string
  private readonly startedAt: number
  private readonly opts: Required<Pick<EmitterOptions, 'spoolRoot'>> & EmitterOptions

  constructor(opts: EmitterOptions = {}) {
    this.runId = randomUUID()
    this.startedAt = Date.now()
    this.opts = { spoolRoot: opts.spoolRoot ?? DEFAULT_SPOOL_ROOT, ...opts }
  }

  get id(): string {
    return this.runId
  }

  /** Emit run_manifest.json and artifacts.json for a completed test run. */
  async emit(params: {
    env: RunEnv
    layer: string
    suite: RunSuite
    scenarioId: string
    status: RunStatus
    source: { file: string; line?: number }
    assertions?: Assertion[]
    artifactPaths?: string[]
    tags?: string[]
    meta?: Record<string, string>
  }): Promise<{ spoolDir: string; blobPrefix?: string }> {
    const { env, layer, suite, scenarioId, status, source, assertions, artifactPaths, tags, meta } = params
    const durationMs = Date.now() - this.startedAt
    const timestamp = new Date(this.startedAt).toISOString()

    const spoolDir = join(this.opts.spoolRoot, scenarioId, this.runId)
    mkdirSync(spoolDir, { recursive: true })

    const blobPrefix = `forgepilot-receipts/${env}/forgepilot.ai/${suite}/${scenarioId}/${this.runId}/`

    const evidencePayload: RunManifest['evidence'] = { spoolDir }
    if (this.opts.azureConnectionString) {
      evidencePayload.blobPrefix = blobPrefix
    }

    const manifest: RunManifest = {
      schemaVersion: '1.0.0',
      runId: this.runId,
      timestamp,
      env,
      layer,
      suite,
      scenarioId,
      status,
      durationMs,
      source: {
        file: source.file,
        line: source.line,
        commit: this.opts.commitSha ?? process.env['GIT_COMMIT'] ?? undefined,
        branch: this.opts.branch ?? process.env['GIT_BRANCH'] ?? undefined,
        ci: this.opts.ciUrl ?? process.env['CI_RUN_URL'] ?? undefined,
      },
      assertions,
      evidence: evidencePayload,
      tags,
      meta,
    }

    writeFileSync(join(spoolDir, 'run_manifest.json'), JSON.stringify(manifest, null, 2))

    // Build artifacts.json
    const artifactEntries: ArtifactEntry[] = []
    for (const p of artifactPaths ?? []) {
      if (!existsSync(p)) continue
      const bytes = readFileSync(p)
      const sha256 = createHash('sha256').update(bytes).digest('hex')
      artifactEntries.push({ name: p.split(/[\\/]/).pop()!, path: p, sha256, sizeBytes: bytes.length })
    }
    const artifactsDoc: ArtifactsManifest = {
      runId: this.runId,
      generatedAt: new Date().toISOString(),
      artifacts: artifactEntries,
    }
    writeFileSync(join(spoolDir, 'artifacts.json'), JSON.stringify(artifactsDoc, null, 2))

    // Optional Azure upload (deferred — storage-blob SDK not installed by default)
    if (this.opts.azureConnectionString) {
      await this.#tryUploadToBlob(spoolDir, blobPrefix)
    }

    return { spoolDir, blobPrefix: evidencePayload.blobPrefix }
  }

  /** Attempt Azure Blob upload; silently skips if SDK unavailable. */
  async #tryUploadToBlob(spoolDir: string, blobPrefix: string): Promise<void> {
    try {
      const { BlobServiceClient } = await import('@azure/storage-blob')
      const client = BlobServiceClient.fromConnectionString(this.opts.azureConnectionString!)
      const container = client.getContainerClient('forgepilot-receipts')
      for (const filename of ['run_manifest.json', 'artifacts.json']) {
        const bytes = readFileSync(join(spoolDir, filename))
        const blockBlob = container.getBlockBlobClient(`${blobPrefix}${filename}`)
        await blockBlob.upload(bytes, bytes.length, { blobHTTPHeaders: { blobContentType: 'application/json' } })
      }
    } catch {
      // SDK not installed or upload failed — local spool is the source of truth
    }
  }
}

