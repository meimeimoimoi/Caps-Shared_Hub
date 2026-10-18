import test from 'node:test'
import assert from 'node:assert/strict'
import { customerRegistrationReturnPath, DEFAULT_HOME, safeReturnPath } from '../src/features/auth/utils/returnPath.ts'

test('customer registration drops inherited expert portal destinations', () => {
  for (const path of ['/expert', '/expert/application', '/expert/overview?scenario=normal', '/expert#application'])
    assert.equal(customerRegistrationReturnPath(path), DEFAULT_HOME)
})

test('customer registration preserves customer destinations and public expert profiles', () => {
  for (const path of ['/cases/new?expert=1', '/wallet', '/experts/1?service=review'])
    assert.equal(customerRegistrationReturnPath(path), path)
  assert.equal(customerRegistrationReturnPath(undefined), DEFAULT_HOME)
  assert.equal(safeReturnPath('/expert/application'), '/expert/application')
})

test('client workspace pages survive the login round trip', () => {
  for (const p of [
    '/cases',
    '/wallet',
    '/account',
    '/cases/RC-2026-0418?scenario=VERIFIED',
    '/cases/new?expert=1&service=cit-review',
  ])
    assert.equal(safeReturnPath(p), p)
})

test('staff areas survive the login round trip', () => {
  for (const p of ['/admin', '/admin/experts/pending', '/knowledge/queue', '/reviewer'])
    assert.equal(safeReturnPath(p), p)
})

test('anything else falls back to the default home', () => {
  for (const p of [
    '//evil.example',
    'https://evil.example',
    '/login',
    '/cases/../admin',
    '/drafts/./../admin',
    '/drafts\\..\\admin',
    undefined,
  ])
    assert.equal(safeReturnPath(p), DEFAULT_HOME)
})
