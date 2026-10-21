import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useOutletContext } from 'react-router-dom'
import { adminKeys } from '@/features/expert-vetting/api/queryKeys'
import {
  countOf,
  getReviewQueueCounts,
  searchReviewQueue,
  type ReviewQueueRow,
} from '@/features/expert-vetting/api/reviewQueueApi'
import { APPLICATION_STATUS, QUALIFICATION_STATUS } from '@/lib/constants'
import { QUEUE_STATUSES } from '@/features/expert-vetting/constants'

const qualificationStatuses = Object.keys(QUALIFICATION_STATUS)
const openApplications = ['SUBMITTED', 'NEED_MORE_INFORMATION']
const openQualifications = ['COMPETENCY_REVIEW', 'NEED_MORE_INFORMATION']

type Mode = 'OPEN' | 'ALL' | 'HISTORY'

const statusesFor = (gate: string, mode: Mode) => ({
  applicationStatuses:
    gate === 'GATE_2'
      ? []
      : mode === 'OPEN'
        ? openApplications
        : mode === 'HISTORY'
          ? QUEUE_STATUSES.filter((status) => status !== 'SUBMITTED')
          : [...QUEUE_STATUSES],
  qualificationStatuses:
    gate === 'GATE_1'
      ? []
      : mode === 'OPEN'
        ? openQualifications
        : mode === 'HISTORY'
          ? qualificationStatuses.filter((status) => status !== 'COMPETENCY_REVIEW')
          : qualificationStatuses,
})

const toRecord = (row: ReviewQueueRow) => {
  const gate1 = row.gate === 'GATE_1'
  return {
    id: row.id,
    gate: row.gate,
    name: row.displayName ?? row.applicantUserId,
    years: row.yearsExperience ?? 0,
    fields: row.fields,
    isReapplication: row.isReapplication,
    submittedAt: row.submittedAt ?? '',
    serviceLabel: gate1 ? '' : (row.serviceName ?? row.serviceCode ?? ''),
    statusMeta: gate1
      ? APPLICATION_STATUS[row.status as keyof typeof APPLICATION_STATUS]
      : QUALIFICATION_STATUS[row.status as keyof typeof QUALIFICATION_STATUS],
    open: (gate1 ? openApplications : openQualifications).includes(row.status),
  }
}

/**
 * One page of the reviewer's queue, filtered, searched and ordered on the server. Only the visible page is
 * loaded; switching back to a page already seen shows it from the cache.
 */
export function useReviewerQueue({
  gate = 'ALL',
  mode = 'OPEN',
  search = '',
  page = 1,
  pageSize = 10,
}: {
  gate?: string
  mode?: Mode
  search?: string
  page?: number
  pageSize?: number
} = {}) {
  const params = { ...statusesFor(gate, mode), search, page, pageSize }
  const query = useQuery({
    queryKey: adminKeys.queue('review', params),
    queryFn: ({ signal }) => searchReviewQueue('review', params, signal),
    placeholderData: keepPreviousData,
  })
  return {
    records: (query.data?.items ?? []).map(toRecord),
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refresh: () => query.refetch(),
  }
}

/** Open work per gate for the sidebar badges: one grouped count, no rows */
export function useReviewerCounts() {
  const { data } = useQuery({
    queryKey: adminKeys.queueCounts('review'),
    queryFn: ({ signal }) => getReviewQueueCounts('review', signal),
  })
  return {
    GATE_1: countOf(data?.applications, openApplications),
    GATE_2: countOf(data?.qualifications, openQualifications),
  }
}

export function useReviewerSearch() {
  return useOutletContext<{ query: string; setQuery: (query: string) => void }>()
}
