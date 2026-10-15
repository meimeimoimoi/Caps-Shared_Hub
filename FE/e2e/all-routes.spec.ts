import { expect, test, type Page } from '@playwright/test'

/* Rà toàn bộ FE: đi từ cửa vào của từng khu, theo mọi link nội bộ tìm thấy, và kiểm tra mỗi trang
 * không lỗi JS/console, không rơi vào trang lỗi hay 404, không cuộn ngang ở màn điện thoại.
 * ponytail: một test thu thập mọi lỗi (expect.soft) thay vì một test/trang, vì route tham số chỉ biết khi crawl.
 *
 * Staff areas (/admin, /knowledge, /reviewer) are behind PermissionRoute, so the signed-out pass only
 * reaches /login for them. The signed-in tests below log in through the real login form and need the
 * BE (gateway :5190 + auth) running with the local test accounts. Set these env vars, or the tests skip:
 *   E2E_PASSWORD        password shared by the test accounts (never commit it)
 *   E2E_ADMIN_EMAIL     SYSTEM_ADMIN account, e.g. admin@caps.test      -> /admin
 *   E2E_KADMIN_EMAIL    KNOWLEDGE_ADMIN account, e.g. kadmin@caps.test  -> /knowledge
 *   E2E_REVIEWER_EMAIL  AUTHOR_REVIEWER account, e.g. reviewer@caps.test -> /reviewer, /admin/experts
 *   E2E_USER_EMAIL      plain USER account, e.g. user@caps.test         -> expects 403 on /admin
 * Gateway CORS only allows http://localhost:5173, so run them on that port (E2E_PORT, reuses `npm run dev`):
 *   $env:E2E_PORT='5173'; $env:E2E_PASSWORD='...'; $env:E2E_ADMIN_EMAIL='admin@caps.test'; npx playwright test all-routes */

const ENTRIES = [
  '/',
  '/marketplace',
  '/pricing',
  '/experts/1',
  '/login',
  '/register',
  '/reset-password',
  '/expert/register',
  '/dashboard',
  '/cases',
  '/cases/RC-2026-0418',
  '/cases/new?expert=1&service=cit-review',
  '/wallet',
  '/account',
  '/drafts',
  '/ai-assistant',
  '/expert/overview',
  '/admin',
  '/knowledge',
  '/reviewer',
]
const MAX_PAGES = 160
// Bản dev chưa có BE: request tới API thật lỗi mạng là dự kiến, không tính là lỗi UI
// Google's sign-in iframe logs its own report-only CSP (frame-ancestors) on origins registered
// for the client id (5173); the app cannot change Google's policy.
const EXPECTED_NOISE =
  /Failed to load resource|net::ERR_|ERR_CONNECTION_REFUSED|localhost:5190|Framing 'https:\/\/accounts\.google\.com\/' violates .*report-only/
const FORBIDDEN_TITLE = 'Bạn không có quyền vào trang này.'

type CrawlOptions = {
  /** Only follow links under these path prefixes (default: every internal link) */
  scope?: string[]
  /** Signed in: navigate inside the SPA instead of reloading. A reload would spend one token refresh
   * per page and hit the gateway's auth rate limit; landing on /login or 403 counts as a problem. */
  signedIn?: boolean
}

async function crawl(page: Page, entries: string[], opts: CrawlOptions = {}) {
  const queue = [...entries]
  const seen = new Set<string>()
  const problems: string[] = []
  let current = ''
  page.on('pageerror', (e) =>
    problems.push(`${current} · lỗi JS: ${e.message}`)
  )
  page.on('console', (m) => {
    if (m.type() === 'error' && !EXPECTED_NOISE.test(m.text()))
      problems.push(`${current} · console: ${m.text().slice(0, 200)}`)
  })

  while (queue.length && seen.size < MAX_PAGES) {
    const url = queue.shift()!
    const key = url.split('#')[0]
    if (seen.has(key)) continue
    seen.add(key)
    current = key

    await page.setViewportSize({ width: 1440, height: 900 })
    if (opts.signedIn) {
      // React Router (createBrowserRouter) follows popstate, so this is an in-app navigation
      await page.evaluate((to) => {
        window.history.pushState({}, '', to)
        window.dispatchEvent(new PopStateEvent('popstate'))
      }, key)
    } else {
      // Không chờ networkidle: dev server giữ kết nối HMR nên mạng không bao giờ "rảnh"
      await page.goto(key, { waitUntil: 'load' })
    }
    // Trang lazy: chờ nội dung chính (hoặc trang lỗi) thay vì chờ cố định
    const content = page.locator(
      'main, [role=main], #shub-home, .route-error-page'
    )
    const rendered = await content
      .first()
      .waitFor({ timeout: 10_000 })
      .then(
        () => true,
        () => false
      )
    await page.waitForTimeout(400) // dữ liệu demo trả về sau vài trăm ms

    const pathname = new URL(page.url()).pathname
    if (await page.locator('.route-error-page').count())
      problems.push(`${key} · rơi vào trang lỗi`)
    if (await page.getByText('Không tìm thấy trang này.').count())
      problems.push(`${key} · trang 404`)
    if (!rendered && pathname !== '/login')
      problems.push(`${key} · không có nội dung chính`)
    if (opts.signedIn && pathname === '/login')
      problems.push(`${key} · signed out (redirected to /login)`)
    if (opts.signedIn && (await page.getByText(FORBIDDEN_TITLE).count()))
      problems.push(`${key} · 403 page`)

    await page.setViewportSize({ width: 390, height: 844 })
    await page.waitForTimeout(150)
    // Layout transitions after the resize briefly overflow; measure once finite animations end
    await page
      .waitForFunction(
        () =>
          document
            .getAnimations()
            .every(
              (a) =>
                a.playState !== 'running' ||
                a.effect?.getTiming().iterations === Infinity
            ),
        undefined,
        { timeout: 2_000 }
      )
      .catch(() => {})
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    )
    if (overflow > 1) problems.push(`${key} · cuộn ngang ${overflow}px ở 390px`)

    const links = await page.$$eval('a[href^="/"]', (as) =>
      as.map((a) => a.getAttribute('href')!)
    )
    for (const href of links) {
      const path = href.split('#')[0]
      if (!path || seen.has(path) || path.startsWith('/api')) continue
      if (opts.scope && !opts.scope.some((p) => path.startsWith(p))) continue
      queue.push(path)
    }
  }

  return { seen, problems }
}

test('mọi trang tìm thấy đều render sạch', async ({ page }) => {
  test.setTimeout(10 * 60_000)
  const { seen, problems } = await crawl(page, ENTRIES)

  console.log(`Đã rà ${seen.size} trang:\n${[...seen].join('\n')}`)
  expect(seen.size).toBeGreaterThan(ENTRIES.length)
  expect(problems, problems.join('\n')).toEqual([])
})

/** Opens a guarded page signed out, logs in through the real form and waits to land back on it. */
async function signInAt(page: Page, path: string, email: string) {
  await page.goto(path)
  await expect(page).toHaveURL(/\/login$/)
  await page.getByRole('button', { name: 'Tiếp tục bằng email' }).click()
  await page.getByLabel('Email').fill(email)
  await page
    .getByLabel('Mật khẩu', { exact: true })
    .fill(process.env.E2E_PASSWORD!)
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`${path}$`), { timeout: 15_000 })
}

const STAFF = [
  { envVar: 'E2E_ADMIN_EMAIL', entries: ['/admin'] },
  { envVar: 'E2E_KADMIN_EMAIL', entries: ['/knowledge'] },
  { envVar: 'E2E_REVIEWER_EMAIL', entries: ['/reviewer', '/admin/experts'] },
]

test.describe('staff areas, signed in', () => {
  for (const { envVar, entries } of STAFF) {
    test(`${entries.join(' + ')} render sạch (${envVar})`, async ({ page }) => {
      const email = process.env[envVar]
      test.skip(
        !email || !process.env.E2E_PASSWORD,
        `Set ${envVar} and E2E_PASSWORD (see the header of all-routes.spec.ts) to crawl ${entries.join(', ')} signed in`
      )
      test.setTimeout(10 * 60_000)

      await signInAt(page, entries[0], email!)
      const { seen, problems } = await crawl(page, entries, {
        scope: entries,
        signedIn: true,
      })

      console.log(
        `${email}: đã rà ${seen.size} trang:\n${[...seen].join('\n')}`
      )
      expect(seen.size).toBeGreaterThan(entries.length)
      expect(problems, problems.join('\n')).toEqual([])
    })
  }

  test('USER account sees 403 on /admin', async ({ page }) => {
    const email = process.env.E2E_USER_EMAIL
    test.skip(
      !email || !process.env.E2E_PASSWORD,
      'Set E2E_USER_EMAIL and E2E_PASSWORD (see the header of all-routes.spec.ts) to check the 403 page'
    )

    await signInAt(page, '/admin', email!)
    await expect(
      page.getByRole('heading', { name: FORBIDDEN_TITLE })
    ).toBeVisible()
    await expect(page.getByText(email!)).toBeVisible()
  })
})
