/**
 * TypeScript types mirroring run_manifest.schema.json (v1.0.0).
 * These are the canonical doctrine types used by the evidence emitter
 * and all test fixtures across the ForgePilot test suite.
 */

export type RunEnv = 'local' | 'ci' | 'staging' | 'production'
export type RunSuite = 'smoke' | 'unit' | 'contract' | 'integration' | 'e2e' | 'chaos' | 'perf' | 'obs'
export type RunStatus = 'pass' | 'fail' | 'skip' | 'abort'

export type AssertionId =
  | 'INV-IDEMPOTENCY'
  | 'INV-DETERMINISM'
  | 'INV-ISOLATION'
  | 'INV-TRUTHFULNESS'
  | 'INV-OBSERVABILITY'
  | 'INV-RESILIENCE'
  | 'INV-CONTRACT'
  | 'INV-CORRELATION'

export interface Assertion {
  id: AssertionId
  status: 'pass' | 'fail' | 'skip'
  message?: string
}

export interface RunSource {
  file: string
  line?: number
  commit?: string
  branch?: string
  ci?: string
}

export interface RunEvidence {
  spoolDir: string
  blobPrefix?: string
  traceUrl?: string
  screenshotUrls?: string[]
}

export interface RunManifest {
  schemaVersion: '1.0.0'
  runId: string
  timestamp: string          // ISO-8601 UTC
  env: RunEnv
  layer: string
  suite: RunSuite
  scenarioId: string         // slug: ^[a-z0-9][a-z0-9-]*[a-z0-9]$
  status: RunStatus
  durationMs?: number
  source: RunSource
  assertions?: Assertion[]
  evidence: RunEvidence
  tags?: string[]
  meta?: Record<string, string>
}

export interface ArtifactEntry {
  name: string
  path: string
  sha256: string
  sizeBytes: number
  mimeType?: string
  blobUrl?: string
}

export interface ArtifactsManifest {
  runId: string
  generatedAt: string        // ISO-8601 UTC
  artifacts: ArtifactEntry[]
}

/** Options supplied to EvidenceEmitter at construction time. */
export interface EmitterOptions {
  /** Azure Blob connection string (optional). Falls back to local spool only. */
  azureConnectionString?: string
  /** Override the spool root (default: .evidence at repo root). */
  spoolRoot?: string
  /** Git commit SHA injected at build time or read from env. */
  commitSha?: string
  /** Git branch name. */
  branch?: string
  /** CI run URL or job ID. */
  ciUrl?: string
}

