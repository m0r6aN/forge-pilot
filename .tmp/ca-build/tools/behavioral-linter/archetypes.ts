export type Archetype = 'co_founder'

export interface BehavioralProfile {
  prohibitedLexical: RegExp[]
  fatalisticLexical: RegExp[]
  requiredFirstPerson: boolean
  minFirstPersonDensity: number
  directiveLimitPer500Words: number
}

export const archetypes: Record<Archetype, BehavioralProfile> = {
  co_founder: {
    prohibitedLexical: [
      /\bthe system\b/i,
      /\bthis system\b/i,
      /\bprocessing(?:\s*(?:\.\.\.|…))/i,
      /\bmodel output\b/i,
      /\bgenerating response\b/i,
      /\bautomatically generated\b/i,
    ],
    fatalisticLexical: [
      /\bnever\b/i,
      /\bimpossible\b/i,
      /\bwill fail\b/i,
      /\bwon't work\b/i,
      /\bno chance\b/i,
      /\btoo saturated\b/i,
    ],
    requiredFirstPerson: true,
    minFirstPersonDensity: 0.05,
    directiveLimitPer500Words: 3,
  },
}
