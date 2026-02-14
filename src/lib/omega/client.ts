import { getEnv } from '@/lib/config/env'
import {
  FORGEPILOT_TEASER_WORKFLOW_ID,
  clarityEvalSystemPrompt,
  teaserGenerateSystemPrompt,
} from '@/lib/omega/forgepilot-teaser-workflow'
import { LaunchAdvancedOptions, LaunchTeaser } from '@/lib/launch/types'

interface TeaserWorkflowInput {
  sessionId: string
  idea: string
  advanced: LaunchAdvancedOptions
  answers?: string[]
}

interface TeaserWorkflowResult {
  needs_clarification: boolean
  questions?: string[]
  teaser?: LaunchTeaser
  traceId: string
  receiptRef?: string
}

interface OmegaExecutionResult {
  traceId: string
  receiptRef: string
}

const WORKFLOW_ENDPOINTS = [
  '/api/v1/workflows/forgepilot.teaser.v1/execute',
  '/workflows/forgepilot.teaser.v1/execute',
  '/workflows/forgepilot.teaser.v1',
]

const EXECUTION_LOG_ENDPOINTS = ['/api/v1/events/launch-execution', '/events/launch-execution']

function getOmegaBaseUrl(): string {
  const base =
    getEnv('OMEGA_BASE_URL') ||
    getEnv('FASTAPI_BASE_URL') ||
    getEnv('FORGEPILOT_BACKEND_URL') ||
    getEnv('NEXT_PUBLIC_FASTAPI_BASE_URL')

  if (!base) {
    throw new Error(
      'OMEGA endpoint is not configured. Set OMEGA_BASE_URL, FASTAPI_BASE_URL, or FORGEPILOT_BACKEND_URL.'
    )
  }

  return base.replace(/\/$/, '')
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

async function postToAnyEndpoint<T>(baseUrl: string, endpoints: string[], body: unknown): Promise<T> {
  let lastError: Error | null = null

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        lastError = new Error(`OMEGA returned ${response.status}: ${await response.text()}`)
        continue
      }

      return (await response.json()) as T
    } catch (error) {
      lastError = error as Error
    }
  }

  throw lastError || new Error('Unable to reach OMEGA workflow endpoint')
}

function normalizeTeaserResult(data: unknown): TeaserWorkflowResult {
  const payload = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>

  const traceId = typeof payload.traceId === 'string' ? payload.traceId : crypto.randomUUID()
  const receiptRef = typeof payload.receiptRef === 'string' ? payload.receiptRef : undefined
  const needsClarification = Boolean(payload.needs_clarification)

  const teaserPayload = (payload.teaser && typeof payload.teaser === 'object' ? payload.teaser : {}) as Record<string, unknown>

  return {
    needs_clarification: needsClarification,
    questions: asStringArray(payload.questions).slice(0, 2),
    teaser:
      !needsClarification && teaserPayload
        ? {
            workingName: typeof teaserPayload.workingName === 'string' ? teaserPayload.workingName : '',
            positioning: typeof teaserPayload.positioning === 'string' ? teaserPayload.positioning : '',
            marketPressure: typeof teaserPayload.marketPressure === 'string' ? teaserPayload.marketPressure : '',
            colorDirection: typeof teaserPayload.colorDirection === 'string' ? teaserPayload.colorDirection : '',
          }
        : undefined,
    traceId,
    receiptRef,
  }
}

export async function runTeaserStartWorkflow(input: TeaserWorkflowInput): Promise<TeaserWorkflowResult> {
  const baseUrl = getOmegaBaseUrl()
  const correlationId = crypto.randomUUID()

  const payload = {
    workflow: FORGEPILOT_TEASER_WORKFLOW_ID,
    mode: 'start',
    correlationId,
    tenantId: 'forgepilot-default',
    anonymousSessionId: input.sessionId,
    input: {
      userIdea: input.idea,
      advancedOptions: input.advanced,
    },
    prompts: {
      clarity_eval: clarityEvalSystemPrompt,
      teaser_generate: teaserGenerateSystemPrompt,
    },
  }

  const raw = await postToAnyEndpoint<unknown>(baseUrl, WORKFLOW_ENDPOINTS, payload)
  return normalizeTeaserResult(raw)
}

export async function runTeaserAnswerWorkflow(input: TeaserWorkflowInput): Promise<TeaserWorkflowResult> {
  const baseUrl = getOmegaBaseUrl()
  const correlationId = crypto.randomUUID()

  const payload = {
    workflow: FORGEPILOT_TEASER_WORKFLOW_ID,
    mode: 'answer',
    correlationId,
    tenantId: 'forgepilot-default',
    anonymousSessionId: input.sessionId,
    input: {
      userIdea: input.idea,
      advancedOptions: input.advanced,
      answers: input.answers || [],
    },
    prompts: {
      clarity_eval: clarityEvalSystemPrompt,
      teaser_generate: teaserGenerateSystemPrompt,
    },
  }

  const raw = await postToAnyEndpoint<unknown>(baseUrl, WORKFLOW_ENDPOINTS, payload)
  return normalizeTeaserResult(raw)
}

export async function logLaunchExecutionToOmega(payload: unknown): Promise<OmegaExecutionResult> {
  const baseUrl = getOmegaBaseUrl()

  const raw = await postToAnyEndpoint<unknown>(baseUrl, EXECUTION_LOG_ENDPOINTS, {
    workflow: 'forgepilot.execution.beta.v1',
    correlationId: crypto.randomUUID(),
    payload,
  })

  const response = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const traceId = typeof response.traceId === 'string' ? response.traceId : ''
  const receiptRef = typeof response.receiptRef === 'string' ? response.receiptRef : ''

  if (!traceId || !receiptRef) {
    throw new Error('OMEGA execution logger did not return traceId and receiptRef')
  }

  return { traceId, receiptRef }
}
