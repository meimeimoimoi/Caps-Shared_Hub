import test from 'node:test'
import assert from 'node:assert/strict'
import {
  releaseSplit,
  toEscrow,
} from '../src/features/disputes-escrow/api/escrowMappers.ts'

const dto = (status) => ({
  id: 'esc-1',
  reviewCaseId: 'case-1',
  userId: 'user-1',
  amount: 1_000_001,
  status,
  createdAt: '2026-11-06T01:00:00Z',
  updatedAt: '2026-11-06T02:00:00Z',
})

test('billing states map to the escrow page states', () => {
  assert.equal(toEscrow(dto('HELD')).status, 'HELD')
  assert.equal(toEscrow(dto('RELEASED')).status, 'PAYOUT_SCHEDULED')
  assert.equal(toEscrow(dto('REFUNDED')).status, 'REFUNDED')
  // An unknown state must not offer release or refund
  assert.notEqual(toEscrow(dto('SOMETHING_NEW')).status, 'HELD')
  const e = toEscrow(dto('HELD'))
  assert.equal(e.caseId, 'case-1')
  assert.equal(e.paidAt, '2026-11-06T01:00:00Z')
})

test('the release split rounds the fee down like billing', () => {
  assert.deepEqual(releaseSplit(1_000_001, 20), {
    fee: 200_000,
    expert: 800_001,
  })
  assert.deepEqual(releaseSplit(500_000, 0), { fee: 0, expert: 500_000 })
  assert.deepEqual(releaseSplit(500_000, 100), { fee: 500_000, expert: 0 })
})
