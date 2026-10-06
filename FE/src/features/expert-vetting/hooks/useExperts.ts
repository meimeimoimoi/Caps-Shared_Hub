import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { paginate } from '@/lib/utils'
import { getExperts, setExpertServiceStatus } from '../api/adminApi'
import { adminKeys } from '../api/queryKeys'
import type { Expert } from '../types'
import { foldVietnamese } from '../utils/applications'

export const ALL = 'ALL'

export function useExperts() {
  const [status, setStatusState] = useState<
    Expert['serviceStatus'] | typeof ALL
  >(ALL)
  const [field, setFieldState] = useState<string>(ALL)
  const [query, setQueryState] = useState('')
  const [page, setPage] = useState(0)

  const qc = useQueryClient()
  const {
    data: experts = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: adminKeys.experts(),
    queryFn: ({ signal }) => getExperts(signal),
  })
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const setServiceStatus = async (
    id: string,
    status: Expert['serviceStatus']
  ) => {
    await setExpertServiceStatus(id, status)
    await qc.invalidateQueries({ queryKey: adminKeys.experts() })
  }
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
    isLoading,
    error,
    selected: experts.find((e) => e.id === selectedId) ?? null,
    select: setSelectedId,
    setServiceStatus,
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

