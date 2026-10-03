import assert from 'node:assert/strict'
import test from 'node:test'
import { validateAccount, passwordRequirements } from './accountValidation.ts'

const valid = { name: 'Nguyễn Thị Ánh', email: 'anh@example.com', phone: '+84 (912) 345-678', password: 'River!Cloud27', confirmPassword: 'River!Cloud27', terms: true }
test('accepts Vietnamese names and formatted international numbers', () => {
  assert.deepEqual(validateAccount(valid), {})
  assert.deepEqual(validateAccount({ ...valid, name: "Anne-Marie O’Neill" }), {})
})
test('each empty field has a specific error', () => {
  const errors = validateAccount({ name: ' ', email: '', phone: '', password: '', confirmPassword: '', terms: false })
  assert.equal(Object.keys(errors).length, 6)
  assert.equal(new Set(Object.values(errors)).size, 6)
})
test('rejects malformed profile fields', () => {
  for (const name of ['1John', 'A', 'John<script>']) assert.ok(validateAccount({ ...valid, name }).name)
  for (const email of ['anh@', 'anh@example', 'a@@example.com', 'a b@example.com']) assert.ok(validateAccount({ ...valid, email }).email)
})
test('enforces every password rule and preserves spaces in passwords', () => {
  for (const password of ['Short1!', 'alllowercase1!', 'ALLUPPERCASE1!', 'NoDigitsHere!', 'NoSpecial12345']) {
    assert.ok(validateAccount({ ...valid, password, confirmPassword: password }).password)
  }
  assert.equal(passwordRequirements('River!Cloud27').filter((rule) => rule.met).length, 5)
  assert.equal(passwordRequirements('a').filter((rule) => rule.met).length, 1)
  assert.ok(validateAccount({ ...valid, password: 'River!Cloud27 ', confirmPassword: 'River!Cloud27' }).confirmPassword)
})
test('blocks mismatched confirmation and missing consent', () => {
  assert.ok(validateAccount({ ...valid, confirmPassword: 'SomethingElse1!' }).confirmPassword)
  assert.ok(validateAccount({ ...valid, terms: false }).terms)
})

test('requires a phone value without enforcing Vietnamese formatting', () => {
  for (const phone of ['0912345678', '+84912345678', '0084912345678', '84912345678', '912345678', '02412345678', '+14155552671', '+66912345678', '123']) {
    assert.equal(validateAccount({ ...valid, phone }).phone, undefined)
  }
  for (const phone of ['', '   ']) {
    assert.ok(validateAccount({ ...valid, phone }).phone)
  }
})
