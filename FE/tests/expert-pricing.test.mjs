import test from 'node:test'
import assert from 'node:assert/strict'
import {
  isBigChange,
  netOf,
  validatePricing,
} from '../src/features/expert-pricing/model.ts'
import {
  getDemoServices,
  updateDemoService,
} from '../src/features/expert-pricing/demoRepository.ts'

// Default admin policy: 500,000 to 30,000,000 VND in steps of 10,000, 1 to 7 days
const limits = {
  minFee: 500_000,
  maxFee: 30_000_000,
  feeStep: 10_000,
  minTurnaroundDays: 1,
  maxTurnaroundDays: 7,
  changeWarningPercent: 50,
}

test('a fee in range and in steps of 10,000 with 1 to 7 days is valid', () => {
  assert.deepEqual(
    validatePricing({ fee: '500000', turnaroundDays: '1' }, limits),
    {}
  )
  assert.deepEqual(
    validatePricing({ fee: '30000000', turnaroundDays: '7' }, limits),
    {}
  )
})

test('fees outside the range, off the step or not whole are rejected', () => {
  for (const fee of [
    '490000',
    '505000',
    '30010000',
    '0',
    '-10000',
    '1.5',
    'abc',
    '',
  ])
    assert.equal(
      validatePricing({ fee, turnaroundDays: '2' }, limits).fee,
      'feeInvalid',
      fee
    )
})

test('delivery time outside 1 to 7 days is rejected', () => {
  for (const turnaroundDays of ['0', '8', '2.5', ''])
    assert.equal(
      validatePricing({ fee: '1000000', turnaroundDays }, limits)
        .turnaroundDays,
      'turnaroundInvalid',
      turnaroundDays
    )
})

test('the net amount rounds down like the server', () => {
  assert.equal(netOf(1_000_000, 25), 750_000)
  assert.equal(netOf(1_000_000, 33), 670_000)
  assert.equal(netOf(500_000, 50), 250_000)
  assert.equal(netOf(1_234_567, 0), 1_234_567)
})

test('a change above the warning percent is flagged, the first price never', () => {
  assert.equal(isBigChange(1_000_000, 1_600_000, 50), true)
  assert.equal(isBigChange(1_000_000, 1_500_000, 50), false)
  assert.equal(isBigChange(null, 30_000_000, 50), false)
})

test('demo saves keep the platform fee and compute what the expert receives', () => {
  const scope = 'test:' + Math.random()
  const unpriced = getDemoServices(scope).find((s) => s.fee == null)
  assert.ok(unpriced)

  const saved = updateDemoService(scope, unpriced.serviceCode, {
    fee: '1500000',
    turnaroundDays: '1',
  })

  assert.equal(saved.netAmount, netOf(1_500_000, unpriced.platformFeePercent))
  assert.equal(saved.turnaroundHours, 24)
  assert.deepEqual(
    getDemoServices(scope).find((s) => s.serviceCode === unpriced.serviceCode),
    saved
  )
})
