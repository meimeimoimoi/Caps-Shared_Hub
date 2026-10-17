import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_HOME, safeReturnPath } from '../src/features/auth/utils/returnPath.ts'

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
