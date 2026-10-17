import test from 'node:test'
import assert from 'node:assert/strict'
import {
  SETTLEMENT_POLICY,
  settle,
} from '../src/features/review-case/settlement.ts'

test('every settlement rule splits exactly 100%', () => {
  for (const [rule, { split }] of Object.entries(SETTLEMENT_POLICY))
    assert.equal(split[0] + split[1] + split[2], 100, rule)
})

test('user cancelled after start: 50 / 40 / 10', () => {
  assert.deepEqual(settle(1_500_000, 'USER_CANCELLED'), {
    gross: 1_500_000,
    refund: 750_000,
    expert: 600_000,
    platform: 150_000,
  })
})

test('odd amounts never create or lose a dong', () => {
  for (const rule of Object.keys(SETTLEMENT_POLICY)) {
    const s = settle(1_234_567, rule)
    assert.equal(s.refund + s.expert + s.platform, s.gross, rule)
  }
})
