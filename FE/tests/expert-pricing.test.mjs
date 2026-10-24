import test from 'node:test'
import assert from 'node:assert/strict'
import { netOf, validatePricing } from '../src/features/expert-pricing/model.ts'
import {
  getDemoServices,
  updateDemoService,
} from '../src/features/expert-pricing/demoRepository.ts'

test('a fee in range and in steps of 1,000 with 1 to 720 hours is valid', () => {
  assert.deepEqual(validatePricing({ fee: '10000', turnaroundHours: '1' }), {})
  assert.deepEqual(
    validatePricing({ fee: '1000000000', turnaroundHours: '720' }),
    {}
  )
})

test('fees outside the range, off the step or not whole are rejected', () => {
  for (const fee of [
    '9000',
    '10500',
    '1000001000',
    '0',
    '-1000',
    '1.5',
    'abc',
    '',
  ])
    assert.equal(
      validatePricing({ fee, turnaroundHours: '48' }).fee,
      'feeInvalid',
      fee
    )
})

test('delivery time outside 1 to 720 hours is rejected', () => {
  for (const turnaroundHours of ['0', '721', '2.5', ''])
    assert.equal(
      validatePricing({ fee: '1000000', turnaroundHours }).turnaroundHours,
      'turnaroundInvalid',
      turnaroundHours
    )
})

test('the net amount rounds down like the server', () => {
  assert.equal(netOf(1_000_000, 25), 750_000)
  assert.equal(netOf(1_000_000, 33), 670_000)
  assert.equal(netOf(10_000, 99), 100)
  assert.equal(netOf(1_234_567, 0), 1_234_567)
})

test('demo saves keep the platform fee and compute what the expert receives', () => {
  const scope = 'test:' + Math.random()
  const unpriced = getDemoServices(scope).find((s) => s.fee == null)
  assert.ok(unpriced)

  const saved = updateDemoService(scope, unpriced.serviceCode, {
    fee: '1500000',
    turnaroundHours: '24',
  })

  assert.equal(saved.netAmount, netOf(1_500_000, unpriced.platformFeePercent))
  assert.deepEqual(
    getDemoServices(scope).find((s) => s.serviceCode === unpriced.serviceCode),
    saved
  )
})
