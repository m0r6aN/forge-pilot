import { z } from 'zod'

const isoDateTime = z.string().datetime()

const hash64 = z.string().regex(/^[a-f0-9]{64}$/)

const sessionId = z.string().min(12).max(128)

const shortText = (min: number, max: number) => z.string().min(min).max(max)

export const ClaritySchema = z.object({
  requiresQuestions: z.boolean(),
  reasoning: shortText(10, 2000),
  confidence: z.number().min(0).max(1),
  riskFlags: z
    .array(
      z.enum([
        'unclear_target_user',
        'unclear_market',
        'unclear_value_prop',
        'unclear_distribution',
        'unclear_pricing',
        'conflicting_details',
      ])
    )
    .max(6)
    .optional(),
})

export const ClarificationSchema = z.object({
  questions: z.array(shortText(8, 220)).min(1).max(2),
})

export const TeaserSectionsSchema = z.object({
  positioning: shortText(30, 700),
  icpSnapshot: shortText(30, 700),
  monetizationAngle: shortText(30, 700),
  strategicDifferentiator: shortText(30, 700),
})

export const TeaserSchema = z.object({
  oneLiner: shortText(10, 180),
  sections: TeaserSectionsSchema,
  cta: z.object({
    headline: shortText(6, 120),
    unlockValue: shortText(10, 220),
  }),
})

const WorkflowMetaSchema = z.object({
  version: z.literal('1.0.0'),
  generatedAt: isoDateTime,
  sessionId,
  inputEcho: z
    .object({
      ideaHash: hash64,
      hasAdvancedOptions: z.boolean(),
    })
    .optional(),
  memory: z
    .object({
      stored: z.boolean(),
      key: z.string().min(3).max(256),
    })
    .optional(),
  diagnostics: z
    .object({
      model: z.string().optional(),
      tokens: z
        .object({
          prompt: z.number().int().nonnegative(),
          completion: z.number().int().nonnegative(),
          total: z.number().int().nonnegative(),
        })
        .optional(),
    })
    .optional(),
  _meta: z
    .object({
      domainProfileUsed: z
        .object({
          schemaId: z.string().min(3).max(128),
          domainKey: z.string().min(2).max(128),
          profileVersion: z.string().min(1).max(64),
          profileId: z.number().int().nonnegative(),
          source: z.string().min(1).max(64),
        })
        .optional(),
    })
    .optional(),
})

export const ForgePilotClarifySchema = WorkflowMetaSchema.extend({
  kind: z.literal('clarify'),
  clarity: ClaritySchema,
  clarification: ClarificationSchema,
}).strict()

export const ForgePilotTeaserSchema = WorkflowMetaSchema.extend({
  kind: z.literal('teaser'),
  clarity: ClaritySchema,
  teaser: TeaserSchema,
}).strict()

export const ForgePilotTeaserOutputSchema = z.discriminatedUnion('kind', [
  ForgePilotClarifySchema,
  ForgePilotTeaserSchema,
])

export type ForgePilotTeaserOutput = z.infer<typeof ForgePilotTeaserOutputSchema>

interface NormalizationResult {
  payload: unknown
  adjustedFields: string[]
}

function clampString(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return ''
  }

  return trimmed.length > max ? trimmed.slice(0, max).trimEnd() : trimmed
}

export function normalizeForgePilotTeaserOutputPayload(input: unknown): NormalizationResult {
  if (!input || typeof input !== 'object') {
    return { payload: input, adjustedFields: [] }
  }

  const payload = structuredClone(input as Record<string, unknown>)
  const adjustedFields: string[] = []

  const kind = payload.kind
  if (kind === 'teaser' && payload.teaser && typeof payload.teaser === 'object') {
    const teaser = payload.teaser as Record<string, unknown>

    const oneLiner = clampString(teaser.oneLiner, 180)
    if (oneLiner !== undefined && oneLiner !== teaser.oneLiner) {
      teaser.oneLiner = oneLiner
      adjustedFields.push('teaser.oneLiner')
    }

    if (teaser.sections && typeof teaser.sections === 'object') {
      const sections = teaser.sections as Record<string, unknown>
      const sectionLimits: Record<string, number> = {
        positioning: 700,
        icpSnapshot: 700,
        monetizationAngle: 700,
        strategicDifferentiator: 700,
      }

      for (const [key, max] of Object.entries(sectionLimits)) {
        const next = clampString(sections[key], max)
        if (next !== undefined && next !== sections[key]) {
          sections[key] = next
          adjustedFields.push(`teaser.sections.${key}`)
        }
      }
    }

    if (teaser.cta && typeof teaser.cta === 'object') {
      const cta = teaser.cta as Record<string, unknown>

      const headline = clampString(cta.headline, 120)
      if (headline !== undefined && headline !== cta.headline) {
        cta.headline = headline
        adjustedFields.push('teaser.cta.headline')
      }

      const unlockValue = clampString(cta.unlockValue, 220)
      if (unlockValue !== undefined && unlockValue !== cta.unlockValue) {
        cta.unlockValue = unlockValue
        adjustedFields.push('teaser.cta.unlockValue')
      }
    }
  }

  if (kind === 'clarify' && payload.clarification && typeof payload.clarification === 'object') {
    const clarification = payload.clarification as Record<string, unknown>
    if (Array.isArray(clarification.questions)) {
      clarification.questions = clarification.questions.map((value, index) => {
        const next = clampString(value, 220)
        if (next !== undefined && next !== value) {
          adjustedFields.push(`clarification.questions[${index}]`)
          return next
        }
        return value
      })
    }
  }

  return { payload, adjustedFields }
}

export function enforceReceiptRules(output: ForgePilotTeaserOutput, receiptRef?: string): void {
  if (output.kind === 'teaser' && !receiptRef) {
    throw new Error('Fail-closed: teaser branch requires receiptRef but none was provided')
  }
}
