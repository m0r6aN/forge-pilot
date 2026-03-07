import { evaluateBehavior } from '@tools/behavioral-linter/runtime'

export type BehavioralDisposition = 'APPROVED' | 'REWRITE_REQUIRED' | 'REJECTED'

type GateResult =
  | {
      ok: true
      text: string
      score: number
      violations: string[]
      initialDisposition: BehavioralDisposition
      finalDisposition: BehavioralDisposition
    }
  | {
      ok: false
      text: string
      score: number
      violations: string[]
      initialDisposition: BehavioralDisposition
      finalDisposition: BehavioralDisposition
    }

const MAX_REWRITE_ATTEMPTS = 1

export async function enforceBehavioralPolicy(opts: {
  text: string
  archetype: 'co_founder'
  mode: 'soft' | 'strict'
  rewrite?: (policyHint: string, currentText: string) => Promise<string>
}): Promise<GateResult> {
  let text = opts.text
  let initialDisposition: BehavioralDisposition | null = null

  for (let attempt = 0; attempt <= MAX_REWRITE_ATTEMPTS; attempt += 1) {
    const evalResult = evaluateBehavior(text, { archetype: opts.archetype })
    if (!initialDisposition) {
      initialDisposition = evalResult.result
    }

    if (evalResult.result === 'APPROVED') {
      return {
        ok: true,
        text,
        score: evalResult.score,
        violations: evalResult.violations,
        initialDisposition,
        finalDisposition: evalResult.result,
      }
    }

    if (evalResult.result === 'REWRITE_REQUIRED' && attempt < MAX_REWRITE_ATTEMPTS && opts.rewrite) {
      text = await opts.rewrite(evalResult.policyHint, text)
      continue
    }

    if (opts.mode === 'strict') {
      return {
        ok: false,
        text,
        score: evalResult.score,
        violations: evalResult.violations,
        initialDisposition,
        finalDisposition: evalResult.result,
      }
    }

    return {
      ok: true,
      text,
      score: evalResult.score,
      violations: evalResult.violations,
      initialDisposition,
      finalDisposition: evalResult.result,
    }
  }

  return {
    ok: true,
    text,
    score: 0,
    violations: [],
    initialDisposition: 'APPROVED',
    finalDisposition: 'APPROVED',
  }
}
