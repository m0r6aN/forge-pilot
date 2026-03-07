import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateBehavior } from './evaluate'

test('rejects prohibited system-speak', () => {
  const result = evaluateBehavior('The system is processing your request.', { archetype: 'co_founder' })
  assert.equal(result.result, 'REJECTED')
})

test('rejects processing phrasing', () => {
  const result = evaluateBehavior('Processing...', { archetype: 'co_founder' })
  assert.equal(result.result, 'REJECTED')
})

test('requires rewrite for unreframed fatalism', () => {
  const text = 'This is impossible. It will fail. No chance in this market.'
  const result = evaluateBehavior(text, { archetype: 'co_founder' })
  assert.equal(result.result, 'REWRITE_REQUIRED')
})

test('requires rewrite when first-person density is too low', () => {
  const text = 'Market demand is weak. Competition is high. Execution risk is significant.'
  const result = evaluateBehavior(text, { archetype: 'co_founder' })
  assert.equal(result.result, 'REWRITE_REQUIRED')
})
