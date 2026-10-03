/* ════════════════════════════════════════════════════════════════════
 * MOCK DATA — đang dùng dữ liệu giả, chưa nối API.
 * TODO(api): thay bằng API lấy danh sách hồ sơ expert (vd. api.get('/api/admin/expert-applications'))
 *            đặt trong features/admin/api/, gọi bằng useQuery của @tanstack/react-query.
 * ════════════════════════════════════════════════════════════════════ */
import type { ExpertApplication } from './types'

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString()

export const mockApplications: ExpertApplication[] = [
  { id: 'EXP-0139', name: 'Lê Quốc Huy', email: 'huy.le@anphat.vn', years: 12, aiFlags: 0, submittedAt: daysAgo(8), status: 'pending' },
  { id: 'EXP-0142', name: 'Nguyễn Minh Anh', email: 'minhanh.tax@gmail.com', years: 8, aiFlags: 1, submittedAt: daysAgo(7), status: 'pending' },
  { id: 'EXP-0145', name: 'Trịnh Bảo Ngọc', email: 'ngoc.tb@gmail.com', years: 10, aiFlags: 0, submittedAt: daysAgo(4), status: 'pending' },
  { id: 'EXP-0147', name: 'Phạm Thu Hà', email: 'ha.pham@ketoanviet.vn', years: 6, aiFlags: 0, submittedAt: daysAgo(2), status: 'reconciling' },
  { id: 'EXP-0136', name: 'Đỗ Văn Khánh', email: 'khanh.do@gmail.com', years: 5, aiFlags: 2, submittedAt: daysAgo(10), status: 'supplement' },
  { id: 'EXP-0131', name: 'Vũ Hoàng Long', email: 'long.vh@gmail.com', years: 1, aiFlags: 3, submittedAt: daysAgo(15), status: 'ineligible' },
]
