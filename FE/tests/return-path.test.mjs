import test from 'node:test'
import assert from 'node:assert/strict'
import { customerRegistrationReturnPath, DEFAULT_HOME, expertLoginReturnPath, safeReturnPath } from '../src/features/auth/utils/returnPath.ts'
import { hasAnyPermission, Permission, staffHomePath } from '../src/features/auth/utils/permissions.ts'

test('expert login replaces customer return paths with the expert workspace', () => {
  for (const path of [undefined, '/drafts', '/wallet', '/account', '/experts/1', '/login', '//evil.example', '/expert/../drafts'])
    assert.equal(expertLoginReturnPath(path), '/expert')
  for (const path of ['/expert', '/expert/application', '/expert/overview', '/expert/cases/123?tab=files#details'])
    assert.equal(expertLoginReturnPath(path), path)
})

test('expert permissions identify existing accounts independently of onboarding history', () => {
  for (const permission of ['ServiceManage', 'CaseWork'])
    assert.equal(hasAnyPermission({ permissions: [permission] }, [Permission.ServiceManage, Permission.CaseWork]), true)
  assert.equal(hasAnyPermission({ permissions: ['ProfileRead'] }, [Permission.ServiceManage, Permission.CaseWork]), false)
})

test('login defaults to the workspace granted by server permissions', () => {
  for (const [permissions, expected] of [
    [['ProfileRead', 'UserManage', 'ExpertApprove'], '/admin'],
    [['ProfileRead', 'ExpertReview'], '/reviewer'],
    [['ProfileRead', 'KnowledgeManage'], '/knowledge'],
    [['UserManage', 'ExpertReview', 'KnowledgeManage'], '/admin'],
    [['ProfileRead'], DEFAULT_HOME],
    [undefined, DEFAULT_HOME],
  ]) {
    const home = staffHomePath({ permissions })
    assert.equal(safeReturnPath(undefined, home), expected)
    assert.equal(safeReturnPath('/login', home), expected)
    assert.equal(safeReturnPath('//evil.example', home), expected)
    assert.equal(safeReturnPath('/drafts/../admin', home), expected)
    assert.equal(safeReturnPath('/cases/new?expert=1', home), '/cases/new?expert=1')
    assert.equal(safeReturnPath('/admin/experts/pending', home), '/admin/experts/pending')
  }
})

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
