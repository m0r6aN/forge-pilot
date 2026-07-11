import type { OmegaClient, WorkflowRunResult } from '@omega/sdk'

export interface RunContext {
  tenantId: string
  actorId: string
  correlationId: string
}

interface WaitForRunReadyOptions {
  pollIntervalMs?: number
  timeoutMs?: number
}

const TERMINAL = new Set(['completed', 'paused', 'failed', 'cancelled', 'canceled'])

export async function waitForRunReady(
  omega: OmegaClient,
  runId: string,
  context: RunContext,
  options: WaitForRunReadyOptions = {}
): Promise<WorkflowRunResult> {
  const pollIntervalMs = options.pollIntervalMs ?? 1_000
  const timeoutMs = options.timeoutMs ?? 120_000
  const startedAt = Date.now()
  let lastRun: WorkflowRunResult | null = null

  while (Date.now() - startedAt <= timeoutMs) {
    const run = await omega.workflows.getRun(runId, {
      tenantId: context.tenantId,
      actorId: context.actorId,
      correlationId: context.correlationId,
      includeGates: true,
    })

    lastRun = run

    if (TERMINAL.has(String(run.status))) {
      return run
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
  }

  const elapsedMs = Date.now() - startedAt
  throw new Error(
    `OMEGA run timeout: runId=${runId}, elapsedMs=${elapsedMs}, status=${lastRun?.status ?? 'unknown'}, ` +
      `currentStep=${lastRun?.currentStep ?? 'unknown'}, gateId=${lastRun?.gateInfo?.gateId ?? 'none'}`
  )
}
