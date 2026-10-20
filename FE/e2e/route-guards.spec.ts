import { expect, test } from '@playwright/test'

// Run against Vite dev as well: demo data must never bypass authentication.
const areas = {
  customer: ['/dashboard', '/cases', '/cases/new', '/cases/test-case', '/wallet', '/account'],
  drafts: ['/drafts', '/drafts/templates', '/drafts/templates/test-template',
    '/drafts/test-workspace/input', '/drafts/test-workspace/generations/test-job',
    '/drafts/test-workspace/versions/test-version', '/drafts/test-workspace/history'],
  assistant: ['/ai-assistant'],
  expert: ['/expert', '/expert/application', '/expert/overview', '/expert/cases',
    '/expert/queue', '/expert/active', '/expert/cases/test-case', '/expert/services',
    '/expert/services/test-service/pricing', '/expert/income', '/expert/bio',
    '/expert/profile', '/expert/settings', '/expert/settings/account',
    '/expert/settings/expert-profile', '/expert/settings/access'],
  aliases: ['/requests', '/credits', '/ai-assitant'],
}

for (const [area, paths] of Object.entries(areas)) {
  test(`${area}: direct URLs require sign-in even in development`, async ({ page }) => {
    test.setTimeout(90_000)
    for (const path of paths) {
      await page.goto(path)
      await expect(page, path).toHaveURL(/\/login$/)
      await expect(page.getByRole('button', { name: 'Tiếp tục bằng email', exact: true })).toBeVisible()
    }
  })
}

test('both signup forms remain public', async ({ page }) => {
  for (const path of ['/register', '/expert/register']) {
    await page.goto(path)
    await expect(page).toHaveURL(new RegExp(`${path}$`))
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  }
})
