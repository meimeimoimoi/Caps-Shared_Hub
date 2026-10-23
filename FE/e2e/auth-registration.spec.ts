import { expect, test } from '@playwright/test'
import { gateway, login } from './support/gateway'

test('customer overview stays in customer workspace and never creates an application', async ({ page }) => {
  const { calls } = await gateway(page)
  await login(page)
  await expect(page).toHaveURL(/\/ai-assistant$/)
  await page.getByRole('link', { name: 'Tổng quan', exact: true }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  expect(calls.filter((call) => call.endsWith('/experts/me/application'))).toEqual([])
})

test('reload shares the profile read under StrictMode', async ({ page }) => {
  const { calls } = await gateway(page)
  await login(page)
  await expect(page).toHaveURL(/\/ai-assistant$/)
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
  await expect(page).toHaveURL(/\/ai-assistant$/)
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
