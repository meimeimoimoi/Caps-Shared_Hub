import type { Page } from '@playwright/test'

// Exercise real routing, stores and StrictMode with deterministic gateway responses.
export async function gateway(page: Page, applicant = false, verified = true) {
  const calls: string[] = []
  const user = {
    userId: 'registration-test', email: 'registration@example.com', displayName: 'Test User',
    phone: null, status: verified ? 'ACTIVE' : 'PENDING_VERIFICATION', emailVerified: verified,
    roles: ['USER'], permissions: ['ProfileRead', 'ProfileWrite', 'BusinessRead'],
  }
  let application = applicant ? draft() : null
  let contextFailure = false
  await page.route('**/api/v1/**', async (route) => {
    // Without VITE_API_URL (CI) the client prefixes /api, so requests reach /api/api/v1/...
    const path = new URL(route.request().url()).pathname.replace(/^\/api(?=\/api\/)/, '')
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
    } else if (path === '/api/v1/marketplace/experts') data = [listedExpert()]
    else if (path === '/api/v1/marketplace/experts/1') data = listedExpert()
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

// The public marketplace reads the expert service; expert 1 matches the client-flow demo cases
function listedExpert() {
  return {
    expertId: '1', displayName: 'Đỗ Hoàng Long', title: 'Đại lý thuế', company: null,
    location: 'TP. Hồ Chí Minh', yearsExperience: 16, fields: [], bio: null, highlights: null,
    ratingAvg: 4.95, ratingCount: 58,
    services: [{ serviceCode: 'cit-review', serviceName: 'CIT draft verification',
      price: 2_400_000, slaHours: 48, approvedAt: '2026-03-19T00:00:00Z' }],
    nextOpenSlotAt: null, openSlotCount: 0,
  }
}

export async function login(page: Page) {
  await page.goto('/login')
  await page.getByRole('button', { name: 'Tiếp tục bằng email', exact: true }).click()
  await page.locator('input[name="email"]').fill('registration@example.com')
  await page.locator('input[name="password"]').fill('Test-Password-2026!')
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
}
