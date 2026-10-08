import test from 'node:test'
import assert from 'node:assert/strict'
import {
  businessDate,
  changePricing,
  validatePricing,
} from '../src/features/expert-pricing/model.ts'
import {
  getDemoPricing,
  updateDemoPricing,
} from '../src/features/expert-pricing/demoRepository.ts'
const now = new Date('2026-10-08T10:00:00Z')
const input = {
  amount: '650000',
  effectiveFrom: '2026-10-10',
  reason: 'Updated fee for new bookings',
}
const options = {
  qualified: true,
  expectedRevision: 0,
  submit: false,
  actor: 'demo-expert',
  now,
}
const approved = {
  ...input,
  id: 'PR-002',
  sequence: 2,
  amount: '500000',
  effectiveFrom: '2026-09-01',
  effectiveTo: null,
  status: 'APPROVED',
  createdAt: '2026-08-01T00:00:00Z',
  updatedAt: '2026-08-02T00:00:00Z',
  reviewNote: null,
}
const initial = () => ({
  revision: 0,
  versions: [structuredClone(approved)],
  audit: [],
})
test('rejects invalid money including fractions, scientific notation, zero and unsafe integers', () => {
  for (const amount of [
    '',
    '0',
    '-1',
    '12.5',
    '1e6',
    '500,000',
    '9007199254740992',
  ])
    assert.equal(
      validatePricing({ ...input, amount }, true, '2026-10-08').amount,
      'amountInvalid'
    )
  assert.deepEqual(validatePricing(input, true, '2026-10-08'), {})
})
test('validates calendar date, business timezone and submission reason', () => {
  assert.equal(businessDate(new Date('2026-10-07T18:00:00Z')), '2026-10-08')
  assert.equal(
    validatePricing(
      { ...input, effectiveFrom: '2026-02-30' },
      true,
      '2026-10-08'
    ).effectiveFrom,
    'dateInvalid'
  )
  assert.equal(
    validatePricing(
      { ...input, effectiveFrom: '2026-10-07' },
      true,
      '2026-10-08'
    ).effectiveFrom,
    'datePast'
  )
  assert.equal(
    validatePricing({ ...input, reason: ' ' }, true, '2026-10-08').reason,
    'reasonRequired'
  )
  assert.equal(
    validatePricing({ ...input, reason: '' }, false, '2026-10-08').reason,
    undefined
  )
})
test('saving creates a new draft without changing approved price or input history', () => {
  const before = initial()
  const next = changePricing(before, input, options)
  assert.equal(next.versions[0].id, 'PR-003')
  assert.equal(next.versions[0].status, 'DRAFT')
  assert.deepEqual(next.versions[1], approved)
  assert.deepEqual(before, initial())
  assert.equal(next.audit[0].actor, 'demo-expert')
})
test('submit locks the draft; repeated submits and stale writes fail', () => {
  const draft = changePricing(initial(), input, options)
  const pending = changePricing(draft, input, {
    ...options,
    expectedRevision: 1,
    submit: true,
  })
  assert.equal(pending.versions[0].status, 'PENDING_APPROVAL')
  assert.equal(pending.versions[0].id, 'PR-003')
  assert.throws(
    () =>
      changePricing(pending, input, {
        ...options,
        expectedRevision: 2,
        submit: true,
      }),
    /PENDING_APPROVAL/
  )
  assert.throws(() => changePricing(draft, input, options), /REVISION_CONFLICT/)
  assert.deepEqual(pending.versions[1], approved)
})
test('qualification is required and returned versions can be revised', () => {
  assert.throws(
    () => changePricing(initial(), input, { ...options, qualified: false }),
    /NOT_QUALIFIED/
  )
  const returned = {
    ...input,
    id: 'PR-003',
    sequence: 3,
    status: 'RETURN_FOR_REVISION',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    effectiveTo: null,
    reviewNote: 'Please explain the fee',
  }
  const next = changePricing(
    { revision: 0, versions: [returned, approved], audit: [] },
    input,
    { ...options, submit: true }
  )
  assert.equal(next.versions.length, 2)
  assert.equal(next.versions[0].id, 'PR-003')
  assert.equal(next.versions[0].status, 'PENDING_APPROVAL')
})
test('rejected version stays immutable while a new draft is created', () => {
  const rejected = {
    ...approved,
    id: 'PR-003',
    sequence: 3,
    status: 'REJECTED',
    reviewNote: 'Revision rejected',
  }
  const next = changePricing(
    { revision: 0, versions: [rejected, approved], audit: [] },
    input,
    options
  )
  assert.equal(next.versions[0].id, 'PR-004')
  assert.deepEqual(next.versions[1], rejected)
})
test('demo persistence is isolated by service and session and defensive against caller mutation', () => {
  const tomorrow = businessDate(new Date(Date.now() + 86400000))
  const next = updateDemoPricing(
    'test-session-a',
    'cit-consultation',
    { ...input, effectiveFrom: tomorrow },
    { ...options, now: new Date() }
  )
  assert.equal(next.versions.length, 2)
  assert.equal(
    getDemoPricing('test-session-b', 'cit-consultation').versions.length,
    1
  )
  assert.equal(
    getDemoPricing('test-session-a', 'cit-review').versions[0].status,
    'PENDING_APPROVAL'
  )
  next.versions[0].amount = '1'
  assert.equal(
    getDemoPricing('test-session-a', 'cit-consultation').versions[0].amount,
    input.amount
  )
})
