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

export function enforceReceiptRules(output: ForgePilotTeaserOutput, receiptRef?: string): void {
  if (output.kind === 'teaser' && !receiptRef) {
    throw new Error('Fail-closed: teaser branch requires receiptRef but none was provided')
  }
}
