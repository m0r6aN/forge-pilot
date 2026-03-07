import test from 'node:test'
import assert from 'node:assert/strict'
import { enforceBehavioralPolicy } from './behavioralGate'

test('runs one rewrite attempt then passes in soft mode', async () => {
  let rewrites = 0
  const result = await enforceBehavioralPolicy({
    text: 'This is impossible. It will fail. No chance.',
    archetype: 'co_founder',
    mode: 'soft',
    rewrite: async () => {
      rewrites += 1
      return "We're taking a practical path and I can get this moving."
    },
  })

  assert.equal(rewrites, 1)
  assert.equal(result.ok, true)
})

test('soft mode returns best effort if still imperfect', async () => {
  const result = await enforceBehavioralPolicy({
    text: 'Never. Impossible. Will fail.',
    archetype: 'co_founder',
    mode: 'soft',
  })

  assert.equal(result.ok, true)
})

test('strict mode blocks unresolved drift', async () => {
  const result = await enforceBehavioralPolicy({
    text: 'Never. Impossible. Will fail.',
    archetype: 'co_founder',
    mode: 'strict',
  })

  assert.equal(result.ok, false)
})
