import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeVietnamPhone, formatVietnamPhone, vietnamPhoneInputValue } from './vietnamPhone.ts'

test('shows the national portion without hiding invalid foreign input', () => {
  for (const value of ['+84912345678', '+84 912345678', '0084912345678', '84912345678']) {
    assert.equal(vietnamPhoneInputValue(value), '912345678')
  }
  assert.equal(vietnamPhoneInputValue('0912345678'), '0912345678')
  assert.equal(vietnamPhoneInputValue('+4915755928093'), '+4915755928093')
  assert.equal(vietnamPhoneInputValue(''), '')
})

test('normalizes national and international input without changing invalid values', () => {
  for (const input of ['0912 345 678', '+84 (912) 345-678', '0084912345678', '84912345678', '912345678']) {
    assert.equal(normalizeVietnamPhone(input), '+84912345678')
  }
  assert.equal(normalizeVietnamPhone('024 1234 5678'), '+842412345678')
  for (const input of ['', '+1 415 555 2671', '++84912345678', '0912abc345678', '+840912345678']) {
    assert.equal(normalizeVietnamPhone(input), null)
  }
})
test('formats mobile and fixed-line numbers for display', () => {
  assert.equal(formatVietnamPhone('0912345678'), '+84 912 345 678')
  assert.equal(formatVietnamPhone('+842412345678'), '+84 24 1234 5678')
  assert.equal(formatVietnamPhone('invalid'), 'invalid')
})
