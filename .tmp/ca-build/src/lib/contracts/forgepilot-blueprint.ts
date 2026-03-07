import { z } from 'zod'

const shortText = (min: number, max: number) => z.string().min(min).max(max)

export const BlueprintSchema = z.object({
  title: shortText(8, 200),
  executiveThesis: shortText(60, 1800),
  offerArchitecture: shortText(120, 3200),
  monetizationModel: shortText(120, 2200),
  distributionStrategy: shortText(120, 2200),
  ninetyDayPlan: z.object({
    weeks1to3: shortText(120, 2200),
    weeks4to8: shortText(120, 2200),
    weeks9to12: shortText(120, 2200),
  }),
  riskMitigation: shortText(80, 1800),
  firstFiveActions: z.array(shortText(12, 260)).length(5),
})

export const ForgePilotBlueprintOutputSchema = z
  .object({
    blueprint: BlueprintSchema,
  })
  .strict()

export type ForgePilotBlueprintOutput = z.infer<typeof ForgePilotBlueprintOutputSchema>

