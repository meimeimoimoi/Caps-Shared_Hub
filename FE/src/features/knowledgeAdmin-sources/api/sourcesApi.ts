import { api } from '@/lib/api-client'
import { isExpertDemo } from '@/lib/expert-data-source'
import type { Frequency } from '../constants'
import type { CollectionOverview, SourceInput } from '../types'

/* Dev chạy demo thì đọc fixtures (bản sao để React Query thấy dữ liệu mới);
 * mutation demo sửa thẳng fixtures để lần refetch sau thấy thay đổi.
 * TODO(api): đối chiếu lại đường dẫn endpoint với BE khi có Swagger. */
const fixtures = () => import('./fixtures')
const BASE = '/api/knowledge/collection'

export async function getCollectionOverview(signal?: AbortSignal) {
  if (isExpertDemo) return structuredClone((await fixtures()).mockOverview)
  return api.get<CollectionOverview>(BASE, { signal })
}

export async function saveSchedule(frequency: Frequency) {
  if (isExpertDemo) {
    ;(await fixtures()).mockOverview.schedule.frequency = frequency
    return
  }
  await api.put(`${BASE}/schedule`, { frequency })
}

/** Chạy thu thập ngay; kết quả về sau, xem ở Lịch sử thu thập */
export async function runCollectionNow() {
  if (isExpertDemo) {
    // MOCK: TODO(auth) actor lấy từ tài khoản đang đăng nhập
    ;(await fixtures()).mockOverview.runs.unshift({
      at: new Date().toISOString(),
      trigger: 'MANUAL',
      actor: 'Lê Thu Hà',
      newDocs: 0,
      newVersions: 0,
      unchanged: 12,
      errors: 0,
    })
    return
  }
  await api.post(`${BASE}/run`)
}

/** Thêm nguồn (không có id) hoặc sửa nguồn có sẵn */
export async function saveSource(input: SourceInput, id?: string) {
  if (isExpertDemo) {
    const sources = (await fixtures()).mockOverview.sources
    const existing = sources.find((s) => s.id === id)
    if (existing) Object.assign(existing, input)
    else sources.push({ id: `src-${Date.now().toString(36)}`, ...input })
    return
  }
  if (id) await api.put(`${BASE}/sources/${id}`, input)
  else await api.post(`${BASE}/sources`, input)
}
