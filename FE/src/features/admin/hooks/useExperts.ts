import { useState } from 'react'
import { paginate } from '@/shared/lib/utils'
import { mockExperts } from '../model/mockData'
import type { Expert } from '../model/types'
import { foldVietnamese } from '../model/utils/applications'

export const ALL = 'ALL'

export function useExperts() {
  const [status, setStatusState] = useState<
    Expert['serviceStatus'] | typeof ALL
  >(ALL)
  const [field, setFieldState] = useState<string>(ALL)
  const [query, setQueryState] = useState('')
  const [page, setPage] = useState(0)

  // MOCK: thay mockExperts bằng useQuery gọi API (xem features/admin/mockData.ts)
  const experts = mockExperts
  const fields = [...new Set(experts.flatMap((e) => e.fields))].sort((a, b) =>
    a.localeCompare(b, 'vi')
  )

  const q = foldVietnamese(query.trim())
  const rows = experts
    .filter(
      (e) =>
        (status === ALL || e.serviceStatus === status) &&
        (field === ALL || e.fields.includes(field)) &&
        (!q ||
          foldVietnamese(e.name).includes(q) ||
          foldVietnamese(e.email).includes(q))
    )
    .sort((a, b) => b.approvedAt.localeCompare(a.approvedAt)) // duyệt gần nhất trước

  // Đổi bộ lọc thì quay về trang đầu
  const resetting =
    <T>(set: (v: T) => void) =>
    (v: T) => {
      set(v)
      setPage(0)
    }

  return {
    status,
    setStatus: resetting(setStatusState),
    field,
    setField: resetting(setFieldState),
    fields,
    query,
    setQuery: resetting(setQueryState),
    paged: paginate(rows, page),
    prev: () => setPage((p) => p - 1),
    next: () => setPage((p) => p + 1),
  }
}

