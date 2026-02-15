export type ColorMode = 'none' | 'hex' | 'vibe'
export type BudgetLevel = 'small' | 'medium' | 'aggressive' | null

export interface LaunchAdvancedOptions {
  colorMode: ColorMode
  hexColors: string[]
  colorVibe: string | null
  tone: string | null
  budget: BudgetLevel
}

export interface LaunchTeaser {
  oneLiner: string
  positioning: string
  icpSnapshot: string
  monetizationAngle: string
  strategicDifferentiator: string
  ctaHeadline: string
  ctaUnlockValue: string
}

export interface LaunchTeaserRequest {
  idea: string
  advanced: LaunchAdvancedOptions
  sessionId: string
}

export interface LaunchTeaserAnswerRequest {
  traceId: string
  answers: Record<string, string>
}

export interface ClarificationResponse {
  needs_clarification: true
  questions: string[]
  traceId: string
  workflowVersion: string
}

export interface TeaserResponse {
  needs_clarification: false
  teaser: LaunchTeaser
  traceId: string
  receiptRef: string
  workflowVersion: string
}

export type LaunchTeaserApiResponse = ClarificationResponse | TeaserResponse

const HEX_PATTERN = /^#(?:[0-9a-fA-F]{3}){1,2}$/

export function normalizeAdvancedOptions(input: unknown): LaunchAdvancedOptions {
  const source = (input && typeof input === 'object' ? input : {}) as Partial<LaunchAdvancedOptions>

  const colorMode = source.colorMode === 'hex' || source.colorMode === 'vibe' ? source.colorMode : 'none'
  const hexColors = Array.isArray(source.hexColors)
    ? source.hexColors.filter((value): value is string => typeof value === 'string' && HEX_PATTERN.test(value)).slice(0, 3)
    : []

  return {
    colorMode,
    hexColors,
    colorVibe: typeof source.colorVibe === 'string' && source.colorVibe.trim() ? source.colorVibe.trim() : null,
    tone: typeof source.tone === 'string' && source.tone.trim() ? source.tone.trim() : null,
    budget:
      source.budget === 'small' || source.budget === 'medium' || source.budget === 'aggressive'
        ? source.budget
        : null,
  }
}

export function isValidSessionId(sessionId: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId)
}
