/* Dữ liệu demo cho templatesApi.ts khi chạy dev (isExpertDemo).
 * Lấy template từ fixtures soạn nháp để tên, mô tả, trường khớp với những gì người dùng thấy. */
import { templates } from '@/features/drafting/api/fixtures'
import type { ManagedTemplate } from '../types'

const daysAgo = (n: number) =>
  new Date(Date.now() - n * 86_400_000).toISOString()
const ADMIN = 'Lê Thu Hà' // MOCK: TODO(auth) tài khoản Knowledge Admin đang đăng nhập
// MOCK: số bản nháp đang dùng từng template (phiên bản mới nhất trước)
const USAGE: Record<string, number[]> = {
  'expense-explanation-v3': [23, 9, 2],
  'non-deductible-v2': [11, 4],
  'refund-v2': [6, 1],
  'supplement-v1': [8],
  'interest-v1': [3],
  'incentive-v1': [0],
}

export const mockTemplates: ManagedTemplate[] = templates.map((tpl, i) => {
  const base = tpl.id.replace(/-v\d+$/, '')
  const usage = USAGE[tpl.id] ?? [0]
  return {
    id: base,
    title: tpl.title,
    description: tpl.description,
    category: tpl.category,
    // Template ưu đãi tạm ngưng để demo trạng thái INACTIVE
    status: base === 'incentive' ? 'INACTIVE' : 'ACTIVE',
    versions: usage.map((workspaces, k) => {
      const version = tpl.version - k
      return {
        id: `${base}-v${version}`,
        version,
        publishedAt: daysAgo(3 + i * 5 + k * 60),
        publishedBy: ADMIN,
        fileName: `${base}-v${version}.docx`,
        changelog:
          k === 0
            ? (tpl.changelog?.[0] ?? 'Cập nhật mô tả và gợi ý trường.')
            : `Phát hành phiên bản ${version}.`,
        // Phiên bản cũ của mẫu giải trình bớt dần trường để thấy khác biệt giữa các phiên bản
        fields: tpl.fields.slice(0, tpl.fields.length - k * 2),
        workspaces,
      }
    }),
    history: [
      {
        at: daysAgo(3 + i * 5),
        actor: ADMIN,
        text: `Phát hành phiên bản ${tpl.version}`,
      },
      ...(base === 'incentive'
        ? [
            {
              at: daysAgo(1),
              actor: ADMIN,
              text: 'Tạm ngưng template: chờ cập nhật theo nghị định mới',
            },
          ]
        : []),
    ].sort((a, b) => b.at.localeCompare(a.at)),
  }
})
