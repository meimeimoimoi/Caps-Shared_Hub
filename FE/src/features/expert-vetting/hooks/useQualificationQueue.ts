import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { paginate } from '@/lib/utils'
import { getQualifications } from '../api/qualificationApi'
import { adminKeys } from '../api/queryKeys'
import { QUALIFICATION_TABS, type QualificationTab } from '../constants'
import type { QualificationStatus } from '../types'
import { foldVietnamese } from '../utils/applications'

const statusesOf = (tab: QualificationTab): readonly QualificationStatus[] =>
  QUALIFICATION_TABS.find((t) => t.key === tab)?.statuses ?? []

/** Gate 2 queue: tabs by status, search by name, oldest submission first */
export function useQualificationQueue() {
  const [tab, setTabState] = useState<QualificationTab>('review')
  const [query, setQueryState] = useState('')
  const [page, setPage] = useState(0)

  const {
    data: qualifications = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: adminKeys.qualifications(),
    queryFn: ({ signal }) => getQualifications(signal),
  })
  const countOf = (t: QualificationTab) =>
    qualifications.filter((q) => statusesOf(t).includes(q.status)).length

  const q = foldVietnamese(query.trim())
  const rows = qualifications
    .filter(
      (x) =>
        statusesOf(tab).includes(x.status) &&
        (!q || foldVietnamese(x.name).includes(q))
    )
    .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))
  return {
    isLoading,
    error,
    tab,
    setTab: (t: QualificationTab) => {
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
