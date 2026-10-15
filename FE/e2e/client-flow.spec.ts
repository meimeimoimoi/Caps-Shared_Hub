import { expect, test, type Page } from '@playwright/test'

/* Flow 5 phía client, chạy trên dữ liệu demo (dev, chưa đăng nhập).
 * Mỗi test là một nhánh của Business Flow; số tiền kiểm theo ma trận quyết toán. */

const heading = (page: Page, name: string | RegExp) =>
  page.getByRole('heading', { name })

test('Bước 1 · gửi yêu cầu từ Sàn tới hồ sơ chờ chuyên gia nhận', async ({
  page,
}) => {
  await page.goto('/experts/1')
  await page.getByRole('button', { name: 'Gửi yêu cầu thẩm định' }).click()
  await expect(page).toHaveURL(/\/cases\/new\?expert=1&service=[\w-]+$/)
  // Trang hồ sơ cũ còn hiện tới khi trang lazy tải xong; nó cũng có h2 + nút cùng tên, nên chờ h1
  await expect(
    page.getByRole('heading', { name: 'Gửi yêu cầu thẩm định', level: 1 })
  ).toBeVisible()

  const submit = page.getByRole('button', { name: 'Gửi yêu cầu thẩm định' })
  await submit.click()
  await expect(
    page.getByText('Xác nhận điều khoản để gửi yêu cầu.')
  ).toBeVisible()

  await page.getByRole('checkbox').check()
  await submit.click()
  await expect(page).toHaveURL(/\/cases\/RC-2026-0419$/)
  await expect(heading(page, /Đang chờ .+ nhận yêu cầu/)).toBeVisible()
  await expect(page.getByText('Chưa thanh toán')).toBeVisible()
})

test('Bước 2 · thanh toán trong hạn 24 giờ thì tiền được giữ hộ', async ({
  page,
}) => {
  await page.goto('/cases/RC-2026-0418')
  // Payment window is 24 hours from ACCEPT, so the countdown shows hours and minutes
  await expect(page.getByRole('timer')).toHaveText(/^\d{1,2} giờ \d{1,2} phút$/)

  await page.getByRole('button', { name: /^Thanh toán 6\.500\.000/ }).click()
  await expect(
    heading(page, 'Đã giữ khoản thanh toán, chờ chuyên gia bắt đầu')
  ).toBeVisible()
  await expect(page.getByText('Đang giữ hộ')).toBeVisible()
  await expect(page.getByText('Thanh toán thành công · giữ hộ')).toBeVisible()
})

test('Bước 2 · quá 24 giờ không thanh toán thì hủy và giải phóng lịch', async ({
  page,
}) => {
  await page.clock.install()
  await page.goto('/cases/RC-2026-0418')
  await expect(page.getByRole('timer')).toBeVisible()

  await page.clock.fastForward('24:00:00')
  await expect(heading(page, 'Yêu cầu đã hủy do chưa thanh toán')).toBeVisible()
  await expect(
    page.getByText('Hết hạn thanh toán · giải phóng lịch')
  ).toBeVisible()
})

test('Bước 4 · phản hồi yêu cầu bổ sung đưa hồ sơ về đang thẩm định', async ({
  page,
}) => {
  await page.goto('/cases/RC-2026-0412')
  const send = page.getByRole('button', { name: 'Gửi phản hồi' })
  await send.click()
  await expect(
    page.getByText('Nhập nội dung phản hồi hoặc đính kèm ít nhất một tài liệu.')
  ).toBeVisible()

  await page
    .getByLabel('Nội dung phản hồi')
    .fill('Đã tải lên bảng EBITDA 2025 và Phụ lục I đã ký.')
  await send.click()
  await expect(heading(page, 'Chuyên gia đang thẩm định hồ sơ')).toBeVisible()
})

test('Bước 4 · hủy khi đang thẩm định quyết toán 50 / 40 / 10', async ({
  page,
}) => {
  await page.goto('/cases/RC-2026-0371') // phí 2.200.000
  await page.getByRole('button', { name: 'Yêu cầu hủy hồ sơ' }).click()

  const dialog = page.getByRole('dialog', { name: 'Hủy hồ sơ đang thẩm định?' })
  await expect(dialog).toContainText('1.100.000')
  await dialog.getByRole('button', { name: 'Xác nhận hủy' }).click()

  await expect(heading(page, 'Hồ sơ đã chấm dứt')).toBeVisible()
  const receipt = page.getByRole('region', { name: 'Quyết toán' })
  for (const amount of ['1.100.000', '880.000', '220.000', '2.200.000'])
    await expect(receipt).toContainText(amount)
})

test('Bước 6 · nghiệm thu quyết toán 80 / 20 rồi đánh giá chuyên gia', async ({
  page,
}) => {
  await page.goto('/cases/RC-2026-0397') // VERIFIED, phí 2.500.000
  await page.getByRole('button', { name: 'Nghiệm thu kết quả' }).click()
  await page
    .getByRole('dialog', { name: 'Nghiệm thu kết quả?' })
    .getByRole('button', { name: 'Nghiệm thu' })
    .click()

  await expect(heading(page, 'Hồ sơ đã hoàn tất')).toBeVisible()
  const receipt = page.getByRole('region', { name: 'Quyết toán' })
  await expect(receipt).toContainText('2.000.000')
  await expect(receipt).toContainText('500.000')

  const rate = page.getByRole('button', { name: 'Gửi đánh giá' })
  await rate.click()
  await expect(page.getByText('Chọn số sao để gửi đánh giá.')).toBeVisible()
  await page
    .locator('label', { has: page.getByRole('radio', { name: '4 sao' }) })
    .click()
  await rate.click()
  await expect(page.getByText('Đánh giá của bạn')).toBeVisible()
  await expect(rate).toHaveCount(0)
})

test('Bước 6-7 · báo cáo vấn đề giữ nguyên khoản thanh toán', async ({
  page,
}) => {
  await page.goto('/cases/RC-2026-0397')
  await page.getByRole('button', { name: 'Báo cáo vấn đề' }).click()

  const dialog = page.getByRole('dialog', {
    name: 'Báo cáo vấn đề với kết quả',
  })
  const submit = dialog.getByRole('button', { name: 'Gửi khiếu nại' })
  await submit.click()
  await expect(dialog.getByText('Chọn loại vấn đề.')).toBeVisible()

  await dialog.getByRole('combobox', { name: 'Loại vấn đề' }).click()
  await page.getByRole('option', { name: 'Thiếu nội dung bàn giao' }).click()
  await dialog
    .getByLabel('Mô tả chi tiết')
    .fill('Kết luận chưa xử lý khoản trích trước chi phí bảo hành.')
  await submit.click()

  await expect(heading(page, 'Khiếu nại đang được xem xét')).toBeVisible()
  await expect(page.getByText('Giữ nguyên · tranh chấp')).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Nghiệm thu kết quả' })
  ).toHaveCount(0)
})

test('Workspace · tổng quan → hồ sơ → lọc → ví → logo về trang chủ', async ({
  page,
}) => {
  await page.goto('/dashboard')
  await expect(heading(page, /^Chào /)).toBeVisible()
  await expect(heading(page, /Việc cần bạn xử lý \(3\)/)).toBeVisible()

  await page.getByRole('link', { name: 'Thanh toán', exact: true }).click()
  await expect(page).toHaveURL(/\/cases\/RC-2026-0418$/)

  await page
    .getByRole('link', { name: /^Hồ sơ thẩm định/ })
    .first()
    .click()
  await expect(page).toHaveURL(/\/cases$/)
  await page.getByRole('button', { name: /^Đã đóng/ }).click()
  await expect(page).toHaveURL(/filter=closed/)
  await expect(page.getByRole('row')).toHaveCount(4) // tiêu đề + 3 hồ sơ đã đóng

  await page.getByRole('link', { name: 'Ví & credit' }).click()
  await expect(heading(page, 'Ví & credit')).toBeVisible()
  await expect(page.getByText('Credit khả dụng')).toBeVisible()

  await page.getByRole('link', { name: 'Về trang chủ Shared Hub' }).click()
  await expect(page).toHaveURL(/\/$/)
})

test('Bảng giá · menu landing mở trang credit AI', async ({ page }) => {
  await page.goto('/')
  await page
    .getByRole('link', { name: 'Bảng giá', exact: true })
    .first()
    .click()
  await expect(page).toHaveURL(/\/pricing$/)
  await expect(heading(page, /Trả theo câu trả lời/)).toBeVisible()
  await expect(page.getByText('Câu hỏi trợ lý AI')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Nạp credit' })).toHaveCount(3)
  await expect(
    page.getByText('Phí thẩm định chuyên gia', { exact: true })
  ).toHaveCount(0)
})
