import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { adminKeys } from '../api/queryKeys'
import {
  countOf as sumCounts,
  getReviewQueueCounts,
  searchReviewQueue,
  toApplicationRow,
  toPaged,
} from '../api/reviewQueueApi'
import { QUEUE_TABS, type QueueTab } from '../constants'

const PAGE_SIZE = 10
const statusesOf = (tab: QueueTab) =>
  QUEUE_TABS.find((t) => t.key === tab)?.statuses ?? []

/** Eligibility queue: only the visible tab's page is loaded; tab counts come from the counts endpoint */
export function usePendingApplications() {
  const [tab, setTabState] = useState<QueueTab>('review')
  const [query, setQueryState] = useState('')
  const [page, setPage] = useState(1)
  const search = useDebouncedValue(query)

  const params = {
    applicationStatuses: statusesOf(tab),
    qualificationStatuses: [],
    search,
    page,
    pageSize: PAGE_SIZE,
  }
  const list = useQuery({
    queryKey: adminKeys.queue('review', params),
    queryFn: ({ signal }) => searchReviewQueue('review', params, signal),
    // Keep the current rows on screen while the next page loads
    placeholderData: keepPreviousData,
  })
  const counts = useQuery({
    queryKey: adminKeys.queueCounts('review'),
    queryFn: ({ signal }) => getReviewQueueCounts('review', signal),
  })
  const data = list.data
  return {
    isLoading: list.isLoading,
    error: list.error,
    tab,
    setTab: (t: QueueTab) => {
      setTabState(t)
      setPage(1)
    },
    query,
    setQuery: (v: string) => {
      setQueryState(v)
      setPage(1)
    },
    countOf: (t: QueueTab) => sumCounts(counts.data?.applications, statusesOf(t)) ?? 0,
    paged: toPaged(
      (data?.items ?? []).map(toApplicationRow),
      data?.page ?? page,
      data?.pageSize ?? PAGE_SIZE,
      data?.total ?? 0
    ),
    prev: () => setPage((p) => Math.max(1, p - 1)),
    next: () => setPage((p) => p + 1),
  }
}
