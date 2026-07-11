import { createHash } from 'crypto'
import { archetypes } from './archetypes'
import { FAIL_PATTERNS, WARN_PATTERNS } from './rules'

export const BEHAVIORAL_POLICY_ID = 'keon.policy.behavioral.v1'
export const BEHAVIORAL_POLICY_VERSION = 'v1.0.0'

// Keep this signature in sync with scoring and rewrite thresholds in evaluate.ts and runtime gate.
const EVALUATOR_SIGNATURE = {
  fatalisticWeight: 20,
  firstPersonWeight: 50,
  directiveWeight: 15,
  rewriteThreshold: 50,
  rejectScore: 100,
  maxRewriteAttempts: 1,
}

function serializeRegex(regex: RegExp): string {
  return `/${regex.source}/${regex.flags}`
}

function buildRuleSetCanonical(): string {
  const payload = {
    policyId: BEHAVIORAL_POLICY_ID,
    policyVersion: BEHAVIORAL_POLICY_VERSION,
    evaluator: EVALUATOR_SIGNATURE,
    failPatterns: FAIL_PATTERNS.map(serializeRegex),
    warnPatterns: WARN_PATTERNS.map(serializeRegex),
    archetypes: Object.fromEntries(
      Object.entries(archetypes).map(([name, profile]) => [
        name,
        {
          prohibitedLexical: profile.prohibitedLexical.map(serializeRegex),
          fatalisticLexical: profile.fatalisticLexical.map(serializeRegex),
          requiredFirstPerson: profile.requiredFirstPerson,
          minFirstPersonDensity: profile.minFirstPersonDensity,
          directiveLimitPer500Words: profile.directiveLimitPer500Words,
        },
      ])
    ),
  }

  return JSON.stringify(payload)
}

export const BEHAVIORAL_RULESET_HASH = createHash('sha256').update(buildRuleSetCanonical()).digest('hex')

