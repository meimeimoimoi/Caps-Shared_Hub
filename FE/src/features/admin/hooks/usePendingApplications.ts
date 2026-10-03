import { useState } from 'react'
import { mockApplications } from '../mockData'
import type { ApplicationStatus } from '../types'
import { foldVietnamese } from '../utils/applications'

const PAGE_SIZE = 10

export function usePendingApplications() {
  const [tab, setTabState] = useState<ApplicationStatus>('pending')
  const [query, setQueryState] = useState('')
  const [page, setPage] = useState(0)

  // MOCK: thay mockApplications bằng useQuery gọi API (xem features/admin/mockData.ts)
  const applications = mockApplications
  const countOf = (s: ApplicationStatus) => applications.filter((a) => a.status === s).length

  const q = foldVietnamese(query.trim())
  const rows = applications
    .filter(
      (a) =>
        a.status === tab &&
        (!q || foldVietnamese(a.name).includes(q) || foldVietnamese(a.email).includes(q)),
    )
    .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const visible = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return {
    tab,
    setTab: (t: ApplicationStatus) => {
      setTabState(t)
      setPage(0)
    },
    query,
    setQuery: (v: string) => {
      setQueryState(v)
      setPage(0)
    },
    countOf,
    rows: visible,
    total: rows.length,
    from: rows.length ? page * PAGE_SIZE + 1 : 0,
    to: page * PAGE_SIZE + visible.length,
    canPrev: page > 0,
    canNext: page < pageCount - 1,
    prev: () => setPage((p) => p - 1),
    next: () => setPage((p) => p + 1),
  }
}
