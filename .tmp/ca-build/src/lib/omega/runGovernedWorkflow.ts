import { createHash } from 'crypto'
import type { WorkflowRunResult } from '@omega/sdk'
import { getBehavioralMode } from '@/lib/config/env'
import {
  BEHAVIORAL_POLICY_ID,
  BEHAVIORAL_POLICY_VERSION,
  BEHAVIORAL_RULESET_HASH,
} from '@tools/behavioral-linter/policy-meta'
import { waitForRunReady, type RunContext } from '@/lib/launch/omega-wait'
import { getOmegaClient } from './omegaClient'
import { enforceBehavioralPolicy } from './behavioralGate'

interface WaitOptions {
  pollIntervalMs?: number
  timeoutMs?: number
  allowPaused?: boolean
}

interface GovernedRunParams {
  workflowId: string
  input: Record<string, unknown>
  context: RunContext
  mode?: 'soft' | 'strict'
  archetype?: 'co_founder'
  wait?: WaitOptions
}

interface GovernedResumeParams {
  runId: string
  gateId: string
  decision: 'approve' | 'deny'
  input: Record<string, unknown>
  context: RunContext
  mode?: 'soft' | 'strict'
  archetype?: 'co_founder'
  wait?: WaitOptions
}

interface GovernedResult {
  run: WorkflowRunResult
  outputText: string
  behavioralScore: number
  behavioralViolations: string[]
  policyApproved: boolean
}

function resolveMode(mode?: 'soft' | 'strict'): 'soft' | 'strict' {
  return mode ?? getBehavioralMode()
}

function logBehavioralMetric(event: {
  phase: 'run' | 'resume'
  workflowId?: string
  runId: string
  mode: 'soft' | 'strict'
  policyId: string
  policyVersion: string
  ruleSetHash: string
  archetype: 'co_founder'
  initialDisposition: 'APPROVED' | 'REWRITE_REQUIRED' | 'REJECTED'
  finalDisposition: 'APPROVED' | 'REWRITE_REQUIRED' | 'REJECTED'
  behavioralScore: number
  behavioralViolations: string[]
  subject: {
    tenantId: string
    actorId: string
    correlationId: string
    workflowId?: string
    runId: string
    expressionHash: string
  }
  rewriteCount: number
}): void {
  const payload = {
    ts: new Date().toISOString(),
    ...event,
  }

  if (process.env.DEV_BEHAVIORAL_DEBUG === 'true') {
    console.debug('behavioral.gate.debug', JSON.stringify(payload))
  }

  console.info(
    'behavioral.gate',
    JSON.stringify(payload)
  )
}

function extractOutputText(output: unknown): string {
  if (typeof output === 'string') {
    return output
  }

  if (Array.isArray(output)) {
    return output.map((item) => extractOutputText(item)).filter(Boolean).join('\n')
  }

  if (!output || typeof output !== 'object') {
    return ''
  }

  const values = Object.values(output as Record<string, unknown>)
  return values.map((item) => extractOutputText(item)).filter(Boolean).join('\n')
}

function buildExpressionHash(text: string): string {
  return createHash('sha256').update(text).digest('hex')
}

async function waitForCompletion(runId: string, context: RunContext, wait?: WaitOptions): Promise<WorkflowRunResult> {
  const omega = getOmegaClient()
  const completed = await waitForRunReady(omega, runId, context, wait)
  const allowPaused = wait?.allowPaused ?? false
  if (completed.status !== 'completed' && (!allowPaused || completed.status !== 'paused')) {
    const details = completed.errorDetails ? JSON.stringify(completed.errorDetails) : completed.status
    throw new Error(`OMEGA workflow failed: ${details}`)
  }
  return completed
}

export async function runGovernedWorkflow(params: GovernedRunParams): Promise<GovernedResult> {
  const omega = getOmegaClient()
  const mode = resolveMode(params.mode)
  let rewriteAttempted = false
  const firstRun = await omega.workflows.runWorkflow(params.workflowId, params.input, params.context)
  let completed = await waitForCompletion(firstRun.runId, params.context, params.wait)
  let text = extractOutputText(completed.outputPayload)

  if (!params.archetype) {
    return {
      run: completed,
      outputText: text,
      behavioralScore: 0,
      behavioralViolations: [],
      policyApproved: true,
    }
  }

  const gate = await enforceBehavioralPolicy({
    text,
    archetype: params.archetype,
    mode,
    rewrite: async (policyHint, priorText) => {
      rewriteAttempted = true
      const repairRun = await omega.workflows.runWorkflow(
        params.workflowId,
        {
          ...params.input,
          __behavioral_policy_hint: policyHint,
          __rewrite_from: priorText,
          __rewrite_mode: 'behavioral_repair',
        },
        params.context
      )
      completed = await waitForCompletion(repairRun.runId, params.context, params.wait)
      text = extractOutputText(completed.outputPayload)
      return text
    },
  })

  if (!gate.ok && mode === 'strict') {
    logBehavioralMetric({
      phase: 'run',
      workflowId: params.workflowId,
      runId: completed.runId,
      mode,
      policyId: BEHAVIORAL_POLICY_ID,
      policyVersion: BEHAVIORAL_POLICY_VERSION,
      ruleSetHash: BEHAVIORAL_RULESET_HASH,
      archetype: params.archetype,
      initialDisposition: gate.initialDisposition,
      finalDisposition: gate.finalDisposition,
      behavioralScore: gate.score,
      behavioralViolations: gate.violations,
      subject: {
        tenantId: params.context.tenantId,
        actorId: params.context.actorId,
        correlationId: params.context.correlationId,
        workflowId: params.workflowId,
        runId: completed.runId,
        expressionHash: buildExpressionHash(gate.text),
      },
      rewriteCount: rewriteAttempted ? 1 : 0,
    })
    throw new Error(`Behavioral policy rejected output: ${gate.violations.join('; ')}`)
  }

  logBehavioralMetric({
    phase: 'run',
    workflowId: params.workflowId,
    runId: completed.runId,
    mode,
    policyId: BEHAVIORAL_POLICY_ID,
    policyVersion: BEHAVIORAL_POLICY_VERSION,
    ruleSetHash: BEHAVIORAL_RULESET_HASH,
    archetype: params.archetype,
    initialDisposition: gate.initialDisposition,
    finalDisposition: gate.finalDisposition,
    behavioralScore: gate.score,
    behavioralViolations: gate.violations,
    subject: {
      tenantId: params.context.tenantId,
      actorId: params.context.actorId,
      correlationId: params.context.correlationId,
      workflowId: params.workflowId,
      runId: completed.runId,
      expressionHash: buildExpressionHash(gate.text),
    },
    rewriteCount: rewriteAttempted ? 1 : 0,
  })

  return {
    run: completed,
    outputText: gate.text,
    behavioralScore: gate.score,
    behavioralViolations: gate.violations,
    policyApproved: gate.ok,
  }
}

export async function resumeGovernedWorkflow(params: GovernedResumeParams): Promise<GovernedResult> {
  const omega = getOmegaClient()
  const mode = resolveMode(params.mode)
  const resumed = await omega.workflows.resumeRun(
    {
      runId: params.runId,
      gateId: params.gateId,
      decision: params.decision,
      input: params.input,
    },
    params.context
  )

  const completed = await waitForCompletion(resumed.runId, params.context, params.wait)
  const text = extractOutputText(completed.outputPayload)

  if (!params.archetype) {
    return {
      run: completed,
      outputText: text,
      behavioralScore: 0,
      behavioralViolations: [],
      policyApproved: true,
    }
  }

  const gate = await enforceBehavioralPolicy({
    text,
    archetype: params.archetype,
    mode,
  })

  if (!gate.ok && mode === 'strict') {
    logBehavioralMetric({
      phase: 'resume',
      runId: completed.runId,
      mode,
      policyId: BEHAVIORAL_POLICY_ID,
      policyVersion: BEHAVIORAL_POLICY_VERSION,
      ruleSetHash: BEHAVIORAL_RULESET_HASH,
      archetype: params.archetype,
      initialDisposition: gate.initialDisposition,
      finalDisposition: gate.finalDisposition,
      behavioralScore: gate.score,
      behavioralViolations: gate.violations,
      subject: {
        tenantId: params.context.tenantId,
        actorId: params.context.actorId,
        correlationId: params.context.correlationId,
        runId: completed.runId,
        expressionHash: buildExpressionHash(gate.text),
      },
      rewriteCount: 0,
    })
    throw new Error(`Behavioral policy rejected output: ${gate.violations.join('; ')}`)
  }

  logBehavioralMetric({
    phase: 'resume',
    runId: completed.runId,
    mode,
    policyId: BEHAVIORAL_POLICY_ID,
    policyVersion: BEHAVIORAL_POLICY_VERSION,
    ruleSetHash: BEHAVIORAL_RULESET_HASH,
    archetype: params.archetype,
    initialDisposition: gate.initialDisposition,
    finalDisposition: gate.finalDisposition,
    behavioralScore: gate.score,
    behavioralViolations: gate.violations,
    subject: {
      tenantId: params.context.tenantId,
      actorId: params.context.actorId,
      correlationId: params.context.correlationId,
      runId: completed.runId,
      expressionHash: buildExpressionHash(gate.text),
    },
    rewriteCount: 0,
  })

  return {
    run: completed,
    outputText: gate.text,
    behavioralScore: gate.score,
    behavioralViolations: gate.violations,
    policyApproved: gate.ok,
  }
}
