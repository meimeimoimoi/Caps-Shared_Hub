import { useState } from 'react'
import { paginate } from '@/shared/lib/utils'
import { QUEUE_TABS, type QueueTab } from '../model/constants'
import { mockApplications } from '../model/mockData'
import type { ApplicationStatus } from '../model/types'
import { foldVietnamese } from '../model/utils/applications'

const statusesOf = (tab: QueueTab): readonly ApplicationStatus[] =>
  QUEUE_TABS.find((t) => t.key === tab)?.statuses ?? []

export function usePendingApplications() {
  const [tab, setTabState] = useState<QueueTab>('review')
  const [query, setQueryState] = useState('')
  const [page, setPage] = useState(0)

  // MOCK: thay mockApplications bằng useQuery gọi API (xem features/admin/mockData.ts)
  const applications = mockApplications
  const countOf = (t: QueueTab) =>
    applications.filter((a) => statusesOf(t).includes(a.status)).length

  const q = foldVietnamese(query.trim())
  const rows = applications
    .filter(
      (a) =>
        statusesOf(tab).includes(a.status) &&
        (!q ||
          foldVietnamese(a.name).includes(q) ||
          foldVietnamese(a.email).includes(q))
    )
    .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))
  return {
    tab,
    setTab: (t: QueueTab) => {
      setTabState(t)
      setPage(0)
    },
    query,
    setQuery: (v: string) => {
      setQueryState(v)
      setPage(0)
    },
    countOf,
    paged: paginate(rows, page),
    prev: () => setPage((p) => p - 1),
    next: () => setPage((p) => p + 1),
  }
}

