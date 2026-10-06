import { api } from '@/lib/api-client'
import { isExpertDemo } from '@/lib/expert-data-source'
import type {
  NewTierInput,
  PackageInput,
  PricingOverview,
  TierChangeInput,
} from '../types'

const vnd = (n: number) => n.toLocaleString('vi-VN')

/* Dev chạy demo thì đọc fixtures; mutation demo sửa thẳng fixtures để refetch thấy thay đổi.
 * TODO(api): đối chiếu lại đường dẫn endpoint với BE khi có Swagger. */
const fixtures = () => import('./fixtures')
const BASE = '/api/admin/pricing'

export async function getPricing(signal?: AbortSignal) {
  if (isExpertDemo) return structuredClone((await fixtures()).mockPricing)
  return api.get<PricingOverview>(BASE, { signal })
}

/** Lên lịch khung mới cho một nhóm; thay lịch cũ nếu đã có */
export async function scheduleTierChange(tierId: string, body: TierChangeInput) {
  if (isExpertDemo) {
    const p = (await fixtures()).mockPricing
    const t = p.tiers.find((x) => x.id === tierId)
    if (!t) return
    const now = new Date().toISOString()
    // MOCK: TODO(auth) người tạo lấy từ tài khoản admin đang đăng nhập
    t.scheduled = { min: body.min, max: body.max, effectiveFrom: body.effectiveFrom, by: 'Trần An', createdAt: now }
    t.step = body.step
    p.history.unshift({
      at: now,
      by: 'Trần An',
      text: `Lên lịch khung mới cho ${t.group}: ${body.min.toLocaleString('vi-VN')} – ${body.max.toLocaleString('vi-VN')} đ. Lý do: ${body.reason}`,
    })
    return
  }
  await api.post(`${BASE}/tiers/${tierId}/schedule`, body)
}

/** Tạo khung cho nhóm mẫu biểu mới; trả id nhóm */
export async function createTier(body: NewTierInput): Promise<string> {
  if (isExpertDemo) {
    const p = (await fixtures()).mockPricing
    const id = `tier-${Date.now()}`
    p.tiers.push({
      id,
      group: body.group,
      templateCount: 0,
      min: body.min,
      max: body.max,
      step: body.step,
      expertsAccepting: 0,
      outsideRange: 0,
      experts: [],
      activeCases: 0,
      effectiveFrom: body.effectiveFrom,
    })
    p.history.unshift({
      at: new Date().toISOString(),
      by: 'Trần An', // MOCK: TODO(auth) tài khoản admin đang đăng nhập
      text: `Thêm nhóm ${body.group}: ${vnd(body.min)} – ${vnd(body.max)} đ. Lý do: ${body.reason}`,
    })
    return id
  }
  return (await api.post<{ id: string }>(`${BASE}/tiers`, body)).id
}

/** Thêm gói (không có id) hoặc sửa gói nạp credit */
export async function savePackage(body: PackageInput) {
  if (isExpertDemo) {
    const p = (await fixtures()).mockPricing
    const existing = p.creditPackages.find((x) => x.id === body.id)
    if (existing) Object.assign(existing, body)
    else p.creditPackages.push({ ...body, id: `pkg-${Date.now()}` })
    p.history.unshift({
      at: new Date().toISOString(),
      by: 'Trần An', // MOCK: TODO(auth) tài khoản admin đang đăng nhập
      text: `${existing ? 'Sửa' : 'Thêm'} gói nạp ${body.name}: ${body.credits} credit, ${
        body.price === null ? 'chưa chốt giá' : `${vnd(body.price)} đ`
      }.`,
    })
    return
  }
  if (body.id) await api.put(`${BASE}/packages/${body.id}`, body)
  else await api.post(`${BASE}/packages`, body)
}
