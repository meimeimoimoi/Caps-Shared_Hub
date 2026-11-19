import { useSortState } from '@/hooks/useTableSort'
import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { adminKeys } from '../api/queryKeys'
import {
  countOf as sumCounts,
  getReviewQueueCounts,
  searchReviewQueue,
  toPaged,
  toQualificationRow,
} from '../api/reviewQueueApi'
import {
  APPROVAL_TABS,
  QUALIFICATION_TABS,
  type QualificationTab,
} from '../constants'
import type { QualificationScope, QualificationStatus } from '../types'

const PAGE_SIZE = 10

export const tabsOf = (scope: QualificationScope) =>
  scope === 'review' ? QUALIFICATION_TABS : APPROVAL_TABS

/**
 * Competency or final approval queue: only the visible tab's page is loaded (filtered, searched and ordered
 * on the server); tab counts come from the counts endpoint.
 */
export function useQualificationQueue(scope: QualificationScope) {
  const tabs = tabsOf(scope)
  const statusesOf = (tab: QualificationTab): readonly QualificationStatus[] =>
    tabs.find((t) => t.key === tab)?.statuses ?? []
  const [tab, setTabState] = useState<QualificationTab>(tabs[0].key)
  const [query, setQueryState] = useState('')
  const [page, setPage] = useState(1)
  const sorting = useSortState({ key: 'queue', direction: 'asc' })
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const search = useDebouncedValue(query)

  const params = {
    applicationStatuses: [],
    qualificationStatuses: statusesOf(tab),
    search,
    page,
    pageSize,
    sortBy: sorting.sort.key,
    sortDescending: sorting.sort.direction === 'desc',
  }
  const list = useQuery({
    queryKey: adminKeys.queue(scope, params),
    queryFn: ({ signal }) => searchReviewQueue(scope, params, signal),
    // Keep the current rows on screen while the next page loads
    placeholderData: keepPreviousData,
  })
  const counts = useQuery({
    queryKey: adminKeys.queueCounts(scope),
    queryFn: ({ signal }) => getReviewQueueCounts(scope, signal),
  })
  const data = list.data
  return {
    sort: sorting.sort,
    onSort: (key: string) => {
      sorting.onSort(key)
      setPage(1)
    },
    isLoading: list.isLoading,
    error: list.error,
    tab,
    setTab: (t: QualificationTab) => {
      setTabState(t)
      setPage(1)
    },
    query,
    setQuery: (v: string) => {
      setQueryState(v)
      setPage(1)
    },
    countOf: (t: QualificationTab) =>
      sumCounts(counts.data?.qualifications, statusesOf(t)) ?? 0,
    paged: toPaged(
      (data?.items ?? []).map(toQualificationRow),
      data?.page ?? page,
      data?.pageSize ?? pageSize,
      data?.total ?? 0
    ),
    setPage,
    setPageSize: (size: number) => {
      setPageSize(size)
      setPage(1)
    },
    prev: () => setPage((p) => Math.max(1, p - 1)),
    next: () => setPage((p) => p + 1),
  }
}
