import { createHash } from 'crypto'
import { mkdir, readFile, writeFile, appendFile } from 'fs/promises'
import path from 'path'
import type { LaunchAdvancedOptions } from './types'

export type ReceiptClass = 'success' | 'intermediate'
export type TraceStatus = 'clarify_pending' | 'teaser_ready' | 'unlocked' | 'revoked'

export interface TeaserPayload {
  oneLiner: string
  positioning: string
  icpSnapshot: string
  monetizationAngle: string
  strategicDifferentiator: string
  ctaHeadline: string
  ctaUnlockValue: string
}

export interface BlueprintPayload {
  title: string
  executiveThesis: string
  offerArchitecture: string
  monetizationModel: string
  distributionStrategy: string
  ninetyDayPlan: {
    weeks1to3: string
    weeks4to8: string
    weeks9to12: string
  }
  riskMitigation: string
  firstFiveActions: string[]
}

interface ReceiptRecord {
  receiptRef: string
  class: ReceiptClass
  source: 'teaser' | 'resume' | 'payment' | 'webhook'
  createdAt: string
}

interface ResumeRecord {
  answerHash: string
  response: {
    needs_clarification: false
    teaser: TeaserPayload
    traceId: string
    receiptRef: string
    workflowVersion: string
  }
  createdAt: string
}

interface ExportRecord {
  receiptRef: string
  pdfSha256: string
  format: 'teaser' | 'blueprint'
  createdAt: string
}

export interface LaunchTraceState {
  traceId: string
  sessionId: string
  email?: string
  idea?: string
  advancedOptions?: LaunchAdvancedOptions
  clarificationAnswers?: Record<string, string>
  workflowVersion: string
  artifactId: string
  artifactHash: string
  inputHash: string
  status: TraceStatus
  runId?: string
  gateId?: string
  questions?: string[]
  teaser?: TeaserPayload
  blueprint?: BlueprintPayload
  blueprintGeneratedAt?: string
  blueprintReceiptRef?: string
  blueprintWorkflowVersion?: string
  blueprintArtifactId?: string
  blueprintArtifactHash?: string
  blueprintInputHash?: string
  blueprintRequestedAt?: string
  blueprintRequestEventId?: string
  blueprintRequestKey?: string
  successReceiptRef?: string
  resumeRecords: Record<string, ResumeRecord>
  receipts: ReceiptRecord[]
  payment: {
    checkoutSessionId?: string
    checkoutCreatedAt?: string
    completedAt?: string
    unlockedAt?: string
  }
  exports: ExportRecord[]
  createdAt: string
  updatedAt: string
}

interface RuntimeDb {
  traces: Record<string, LaunchTraceState>
}

export interface LedgerEntry {
  type:
    | 'teaser.generated'
    | 'teaser.clarify'
    | 'teaser.resumed'
    | 'blueprint.requested'
    | 'blueprint.generated'
    | 'blueprint.failed'
    | 'payment.created'
    | 'payment.completed'
    | 'payment.ignored'
    | 'export.generated'
    | 'attack.rejected'
  traceId: string
  receiptRef?: string
  code?: string
  detail?: string
  at: string
  meta?: Record<string, unknown>
}

const TMP_DIR = path.join(process.cwd(), '.tmp')
const DB_FILE = path.join(TMP_DIR, 'forgepilot-launch-runtime.json')
const LEDGER_FILE = path.join(TMP_DIR, 'forgepilot-launch-ledger.jsonl')

async function ensureTmpDir() {
  await mkdir(TMP_DIR, { recursive: true })
}

async function loadDb(): Promise<RuntimeDb> {
  await ensureTmpDir()

  try {
    const raw = await readFile(DB_FILE, 'utf8')
    return JSON.parse(raw) as RuntimeDb
  } catch {
    return { traces: {} }
  }
}

async function saveDb(db: RuntimeDb) {
  await ensureTmpDir()
  await writeFile(DB_FILE, JSON.stringify(db, null, 2), 'utf8')
}

export function hashJson(value: unknown): string {
  const serialized = canonicalizeJson(value)
  return createHash('sha256').update(serialized).digest('hex')
}

function canonicalizeJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value)
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalizeJson(item)).join(',')}]`
  }

  const obj = value as Record<string, unknown>
  const keys = Object.keys(obj).sort()
  const entries = keys.map((key) => `${JSON.stringify(key)}:${canonicalizeJson(obj[key])}`)
  return `{${entries.join(',')}}`
}

export function buildArtifactHash(workflowId: string, workflowVersion: string): string {
  return createHash('sha256').update(`${workflowId}:${workflowVersion}`).digest('hex')
}

export async function getTrace(traceId: string): Promise<LaunchTraceState | null> {
  const db = await loadDb()
  return db.traces[traceId] ?? null
}

export async function upsertTrace(trace: LaunchTraceState): Promise<void> {
  const db = await loadDb()
  db.traces[trace.traceId] = trace
  await saveDb(db)
}

export async function appendLedger(entry: LedgerEntry): Promise<void> {
  await ensureTmpDir()
  await appendFile(LEDGER_FILE, `${JSON.stringify(entry)}\n`, 'utf8')
}

export function getLedgerFilePath(): string {
  return LEDGER_FILE
}

export function getRuntimeDbPath(): string {
  return DB_FILE
}

export function buildResumeAnswerHash(answers: Record<string, string>): string {
  const normalized = Object.keys(answers)
    .sort()
    .map((key) => [key, (answers[key] || '').trim()])
  return hashJson(normalized)
}

export async function verifyTraceReceiptBinding(
  traceId: string,
  receiptRef: string,
  options?: { requireSuccess?: boolean; rejectRevoked?: boolean }
): Promise<{ ok: true; trace: LaunchTraceState } | { ok: false; reason: string; status: number }> {
  const trace = await getTrace(traceId)
  if (!trace) {
    return { ok: false, reason: 'Unknown traceId', status: 400 }
  }

  const receipt = trace.receipts.find((item) => item.receiptRef === receiptRef)
  if (!receipt) {
    return { ok: false, reason: 'receiptRef does not belong to traceId', status: 400 }
  }

  if (options?.requireSuccess && receipt.class !== 'success') {
    return { ok: false, reason: 'receiptRef is not success-class', status: 400 }
  }

  if (options?.rejectRevoked && trace.status === 'revoked') {
    return { ok: false, reason: 'trace is revoked', status: 409 }
  }

  return { ok: true, trace }
}

export function structuredInfo(event: string, payload: Record<string, unknown>) {
  console.info(JSON.stringify({ level: 'info', event, ...payload }))
}
