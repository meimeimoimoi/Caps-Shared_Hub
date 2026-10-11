import { expect, test } from '@playwright/test'

/* Rà toàn bộ FE: đi từ cửa vào của từng khu, theo mọi link nội bộ tìm thấy, và kiểm tra mỗi trang
 * không lỗi JS/console, không rơi vào trang lỗi hay 404, không cuộn ngang ở màn điện thoại.
 * ponytail: một test thu thập mọi lỗi (expect.soft) thay vì một test/trang, vì route tham số chỉ biết khi crawl. */

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
const EXPECTED_NOISE =
  /Failed to load resource|net::ERR_|ERR_CONNECTION_REFUSED|localhost:5190/

test('mọi trang tìm thấy đều render sạch', async ({ page }) => {
  test.setTimeout(10 * 60_000)
  const queue = [...ENTRIES]
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
    // Không chờ networkidle: dev server giữ kết nối HMR nên mạng không bao giờ "rảnh"
    await page.goto(key, { waitUntil: 'load' })
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

    if (await page.locator('.route-error-page').count())
      problems.push(`${key} · rơi vào trang lỗi`)
    if (await page.getByText('Không tìm thấy trang này.').count())
      problems.push(`${key} · trang 404`)
    if (!rendered && new URL(page.url()).pathname !== '/login')
      problems.push(`${key} · không có nội dung chính`)

    await page.setViewportSize({ width: 390, height: 844 })
    await page.waitForTimeout(150)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    )
    if (overflow > 1) problems.push(`${key} · cuộn ngang ${overflow}px ở 390px`)

    const links = await page.$$eval('a[href^="/"]', (as) =>
      as.map((a) => a.getAttribute('href')!)
    )
    for (const href of links) {
      const path = href.split('#')[0]
      if (path && !seen.has(path) && !path.startsWith('/api')) queue.push(path)
    }
  }

  console.log(`Đã rà ${seen.size} trang:\n${[...seen].join('\n')}`)
  expect(seen.size).toBeGreaterThan(ENTRIES.length)
  expect(problems, problems.join('\n')).toEqual([])
})
