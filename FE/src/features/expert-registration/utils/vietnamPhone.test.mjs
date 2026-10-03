import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeVietnamPhone, formatVietnamPhone, formatVietnamPhoneInput, vietnamPhoneInputValue } from './vietnamPhone.ts'

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

 test('keeps spaces in the national input even when state stores a normalized phone', () => {
  assert.equal(formatVietnamPhoneInput('+84912345678'), '912 345 678')
  assert.equal(formatVietnamPhoneInput('0912345678'), '0912 345 678')
  assert.equal(formatVietnamPhoneInput('912 345 678'), '912 345 678')
  assert.equal(formatVietnamPhoneInput('+842412345678'), '24 1234 5678')
})

test('groups digits while typing, including invalid numbers without dropping digits', () => {
  for (const [input, expected] of [
    ['9', '9'], ['9123', '912 3'], ['9123456', '912 345 6'],
    ['09123', '0912 3'], ['015755928093', '0157 559 28093'],
  ]) assert.equal(formatVietnamPhoneInput(input), expected)
})
