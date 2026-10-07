import { api } from '@/lib/api-client'
import { isExpertDemo } from '@/lib/expert-data-source'
import { CURRENT_ADMIN } from '../constants'
import type {
  ApplicationDecisionInput,
  ApplicationDetail,
  Criterion,
  Expert,
  ExpertApplication,
} from '../types'

/* Dev chạy demo thì đọc fixtures (bản sao để React Query thấy dữ liệu mới);
 * mutation demo sửa thẳng fixtures để lần refetch sau thấy thay đổi.
 * TODO(api): đối chiếu lại đường dẫn endpoint với BE khi có Swagger. */
const fixtures = () => import('./fixtures')
const BASE = '/api/admin'

/* ── Xét duyệt Expert ── */
export async function getApplications(signal?: AbortSignal) {
  if (isExpertDemo) return structuredClone((await fixtures()).mockApplications)
  return api.get<ExpertApplication[]>(`${BASE}/expert-applications`, { signal })
}

/** null = không tìm thấy (demo); API trả 404 thành ApiError */
export async function getApplicationDetail(
  id: string,
  signal?: AbortSignal
): Promise<ApplicationDetail | null> {
  if (isExpertDemo) return (await fixtures()).getMockApplicationDetail(id) ?? null
  return api.get<ApplicationDetail>(`${BASE}/expert-applications/${id}`, { signal })
}

export async function getCriteria(signal?: AbortSignal) {
  if (isExpertDemo) return structuredClone((await fixtures()).mockCriteria)
  return api.get<Criterion[]>(`${BASE}/review-criteria`, { signal })
}

export async function decideApplication(id: string, body: ApplicationDecisionInput) {
  if (isExpertDemo) return
  await api.post(`${BASE}/expert-applications/${id}/decision`, body)
}

/* ── Quản lý Expert ── */
export async function getExperts(signal?: AbortSignal) {
  if (isExpertDemo) return structuredClone((await fixtures()).mockExperts)
  return api.get<Expert[]>(`${BASE}/experts`, { signal })
}

export async function setExpertServiceStatus(id: string, status: Expert['serviceStatus']) {
  if (isExpertDemo) {
    const e = (await fixtures()).mockExperts.find((x) => x.id === id)
    if (!e) return
    e.serviceStatus = status
    e.history.unshift({
      at: new Date().toISOString(),
      actor: CURRENT_ADMIN,
      text: status === 'SUSPENDED' ? 'tạm ngưng dịch vụ.' : 'mở lại dịch vụ.',
    })
    return
  }
  await api.put(`${BASE}/experts/${id}/service-status`, { status })
}
