import { archetypes, type Archetype } from './archetypes'

export type EvaluationResult =
  | { result: 'APPROVED'; score: number; violations: string[] }
  | { result: 'REWRITE_REQUIRED'; score: number; violations: string[]; policyHint: string }
  | { result: 'REJECTED'; score: number; violations: string[] }

function sentenceCount(text: string): number {
  const matches = text.match(/[^.!?]+[.!?]?/g)
  return matches?.filter((item) => item.trim().length > 0).length ?? 0
}

function wordCount(text: string): number {
  const matches = text.match(/\b[\w']+\b/g)
  return matches?.length ?? 0
}

function countWithGlobal(text: string, pattern: RegExp): number {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`
  const matches = text.match(new RegExp(pattern.source, flags))
  return matches?.length ?? 0
}

export function evaluateBehavior(text: string, options: { archetype: Archetype }): EvaluationResult {
  const profile = archetypes[options.archetype]
  const violations: string[] = []
  let driftScore = 0

  for (const pattern of profile.prohibitedLexical) {
    if (pattern.test(text)) {
      violations.push(`Prohibited phrase detected: ${pattern.source}`)
      return { result: 'REJECTED', score: 100, violations }
    }
  }

  for (const pattern of profile.fatalisticLexical) {
    if (pattern.test(text)) {
      violations.push(`Fatalistic tone detected: ${pattern.source}`)
      driftScore += 20
    }
  }

  if (profile.requiredFirstPerson) {
    const firstPersonMatches = text.match(/\b(i|i'm|i'll|we|we're|we'll|let's|let us)\b/gi) ?? []
    const sentences = sentenceCount(text)
    const density = sentences > 0 ? firstPersonMatches.length / sentences : 0
    if (density < profile.minFirstPersonDensity) {
      violations.push('Insufficient first-person framing.')
      driftScore += 50
    }
  }

  const directiveMatches = text.match(/\byou (must|need to|should)\b/gi) ?? []
  const words = Math.max(1, wordCount(text))
  const directiveLimit = Math.ceil((words / 500) * profile.directiveLimitPer500Words)
  if (directiveMatches.length > directiveLimit) {
    violations.push('Excessive directive tone.')
    driftScore += 15
  }

  if (driftScore >= 50) {
    return {
      result: 'REWRITE_REQUIRED',
      score: driftScore,
      violations,
      policyHint:
        'Use first-person framing, avoid fatalistic language, preserve founder agency, and reduce directive phrasing.',
    }
  }

  return { result: 'APPROVED', score: driftScore, violations }
}
