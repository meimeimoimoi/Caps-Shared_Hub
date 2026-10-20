import { expect, test, type Page } from '@playwright/test'

// Exercise real routing, stores and StrictMode with deterministic gateway responses.
async function gateway(page: Page, applicant = false, verified = true) {
  const calls: string[] = []
  const user = {
    userId: 'registration-test', email: 'registration@example.com', displayName: 'Test User',
    phone: null, status: verified ? 'ACTIVE' : 'PENDING_VERIFICATION', emailVerified: verified,
    roles: ['USER'], permissions: ['ProfileRead', 'ProfileWrite', 'BusinessRead'],
  }
  let application = applicant ? draft() : null
  let contextFailure = false
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    const method = route.request().method()
    calls.push(`${method} ${path}`)
    let data: unknown = null
    if (/\/auth\/(login|register|refresh-token|verify-email-code)$/.test(path)) {
      if (path.endsWith('/verify-email-code')) {
        user.status = 'ACTIVE'
        user.emailVerified = true
      }
      data = { accessToken: 'test-access-token', expiresIn: 900, user }
    } else if (path === '/api/v1/users/me') data = user
    else if (path.endsWith('/experts/me/context')) {
      if (contextFailure) {
        await route.fulfill({ status: 503, json: { message: 'Unavailable' } })
        return
      }
      data = {
        expertId: application ? 'expert-test' : null, displayName: user.displayName,
        email: user.email, accountStatus: user.status, stage: 'APPLICATION',
        applicationStatus: application?.status ?? null,
        portalAccess: { allowed: true, reason: null, capabilities: ['application.view'] },
        services: [], generatedAt: new Date().toISOString(), version: 'v1',
      }
    } else if (path.endsWith('/experts/me/application')) {
      if (method === 'PUT') application = draft()
      data = application
    }
    await route.fulfill({ json: { success: true, data } })
  })
  return { calls, user, failContext: () => { contextFailure = true } }
}

function draft() {
  return {
    id: 'application-test', status: 'DRAFT', submittedAt: null, decidedAt: null,
    decisionNote: null, earliestReapplyAt: null,
    profile: { displayName: 'Test User', email: 'registration@example.com', phone: '0912345678',
      birthDate: null, title: null, company: null, location: null, bio: null,
      yearsExperience: null, fields: [], highlights: null },
    evidence: [], history: [], eligibility: [], missingRequirements: [], emailVerified: false,
    canEdit: true, canUpload: true, canSubmit: false, canSupplement: false,
  }
}

async function login(page: Page) {
  await page.goto('/login')
  await page.getByRole('button', { name: 'Tiếp tục bằng email', exact: true }).click()
  await page.locator('input[name="email"]').fill('registration@example.com')
  await page.locator('input[name="password"]').fill('Test-Password-2026!')
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
}

test('customer overview stays in customer workspace and never creates an application', async ({ page }) => {
  const { calls } = await gateway(page)
  await login(page)
  await expect(page).toHaveURL(/\/drafts$/)
  await page.getByRole('link', { name: 'Tổng quan', exact: true }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  expect(calls.filter((call) => call.endsWith('/experts/me/application'))).toEqual([])
})

test('reload shares the profile read under StrictMode', async ({ page }) => {
  const { calls } = await gateway(page)
  await login(page)
  await expect(page).toHaveURL(/\/drafts$/)
  calls.length = 0
  await page.reload()
  await expect(page.getByRole('link', { name: 'Tổng quan', exact: true })).toBeVisible()
  await expect.poll(() => calls.filter((call) => call === 'GET /api/v1/users/me').length).toBe(1)
  expect(calls.filter((call) => call.endsWith('/auth/refresh-token'))).toHaveLength(1)
})

for (const verified of [false, true]) {
  test(`expert draft survives logout and login with email verified=${verified}`, async ({ page }) => {
    const { calls } = await gateway(page, true, verified)
    await login(page)
    await expect(page).toHaveURL(/\/expert\/application$/)
    await expect(page.getByText('+84 912 345 678', { exact: true })).toBeVisible()
    await page.goto('/account')
    await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click()
    await expect(page).toHaveURL(/\/login$/)
    calls.length = 0
    await login(page)
    await expect(page).toHaveURL(/\/expert\/application$/)
    await expect(page.getByText('+84 912 345 678', { exact: true })).toBeVisible()
    expect(calls.filter((call) => call === 'GET /api/v1/experts/me/application')).toHaveLength(1)
    expect(calls.some((call) => call === 'PUT /api/v1/experts/me/application')).toBe(false)
  })
}

test('unverified customer returns to email verification', async ({ page }) => {
  await gateway(page, false, false)
  await login(page)
  await expect(page).toHaveURL(/\/verify-email$/)
})

test('expert reload shares a slow application read across StrictMode mounts', async ({ page }) => {
  const { calls } = await gateway(page, true, false)
  await page.route('**/api/v1/experts/me/application', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 200))
    await route.fallback()
  })
  await login(page)
  await expect(page).toHaveURL(/\/expert\/application$/)
  await expect(page.getByText('+84 912 345 678', { exact: true })).toBeVisible()
  calls.length = 0
  await page.reload()
  await expect(page.getByText('+84 912 345 678', { exact: true })).toBeVisible()
  expect(calls.filter((call) => call === 'GET /api/v1/experts/me/application')).toHaveLength(1)
  expect(calls.filter((call) => call === 'GET /api/v1/users/me')).toHaveLength(1)
  expect(calls.filter((call) => call === 'PUT /api/v1/experts/me/application')).toHaveLength(0)
})

test('context outage shows an error instead of routing an applicant to drafts', async ({ page }) => {
  const api = await gateway(page, true)
  api.failContext()
  await login(page)
  await expect(page.getByRole('alert')).toContainText('Không kết nối được máy chủ')
  await expect(page).toHaveURL(/\/login$/)
})

test('customer registration and code verification do not create an expert application', async ({ page }) => {
  const { calls } = await gateway(page, false, false)
  await page.goto('/register')
  await page.locator('input[name="name"]').fill('Test User')
  await page.locator('input[name="email"]').fill('registration@example.com')
  await page.locator('input[name="new-password"]').fill('Test-Password-2026!')
  await page.getByRole('checkbox').check()
  await page.locator('button[type="submit"]').click()
  await expect(page).toHaveURL(/\/verify-email$/)
  const digits = page.locator('input[inputmode="numeric"]')
  for (let i = 0; i < 6; i++) await digits.nth(i).fill(String(i + 1))
  await expect(page).toHaveURL(/\/drafts$/)
  await page.getByRole('link', { name: 'Tổng quan', exact: true }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  expect(calls.some((call) => call.endsWith('/experts/me/application'))).toBe(false)
})

test('expert signup creates a draft before logout and resumes it without verifying email', async ({ page }) => {
  const { calls } = await gateway(page, false, false)
  await page.goto('/expert/register')
  await page.locator('input[name="name"]').fill('Test User')
  await page.locator('input[name="phone"]').fill('0912345678')
  await page.locator('input[name="email"]').fill('registration@example.com')
  await page.locator('input[name="password"]').fill('Test-Password-2026!')
  await page.locator('input[name="confirmPassword"]').fill('Test-Password-2026!')
  await page.getByRole('checkbox').check()
  await page.locator('button[type="submit"]').click()
  await expect(page).toHaveURL(/\/expert\/application$/)
  await expect(page.getByText('+84 912 345 678', { exact: true })).toBeVisible()
  expect(calls.filter((call) => call === 'PUT /api/v1/experts/me/application')).toHaveLength(1)
  expect(calls.filter((call) => call === 'GET /api/v1/experts/me/application')).toHaveLength(0)
  await page.goto('/account')
  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
  await login(page)
  await expect(page).toHaveURL(/\/expert\/application$/)
  await expect(page.getByText('+84 912 345 678', { exact: true })).toBeVisible()
  expect(calls.some((call) => call.endsWith('/auth/verify-email-code'))).toBe(false)
  expect(calls.filter((call) => call === 'PUT /api/v1/experts/me/application')).toHaveLength(1)
})
