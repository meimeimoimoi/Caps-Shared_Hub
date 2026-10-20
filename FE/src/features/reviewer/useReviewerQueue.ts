import { useQueries } from '@tanstack/react-query'
import { useOutletContext } from 'react-router-dom'
import { getApplications } from '@/features/expert-vetting/api/adminApi'
import { getQualifications } from '@/features/expert-vetting/api/qualificationApi'
import { adminKeys } from '@/features/expert-vetting/api/queryKeys'
import { APPLICATION_STATUS, QUALIFICATION_STATUS } from '@/lib/constants'
import { QUEUE_STATUSES } from '@/features/expert-vetting/constants'
import type { ApplicationStatus, QualificationStatus } from '@/features/expert-vetting/types'

const qualificationStatuses = Object.keys(QUALIFICATION_STATUS) as (keyof typeof QUALIFICATION_STATUS)[]
const openApplications: readonly ApplicationStatus[] = ['SUBMITTED', 'NEED_MORE_INFORMATION']
const openQualifications: readonly QualificationStatus[] = ['COMPETENCY_REVIEW', 'NEED_MORE_INFORMATION']

/** Fetch only the visible gate and statuses; sidebar observers only read cached open queues. */
export function useReviewerQueue({
  gate = 'ALL',
  mode = 'OPEN',
  enabled = true,
}: {
  gate?: string
  mode?: 'OPEN' | 'ALL' | 'HISTORY'
  enabled?: boolean
} = {}) {
  const applicationStatuses = mode === 'OPEN' ? openApplications
    : mode === 'HISTORY' ? QUEUE_STATUSES.filter((status) => status !== 'SUBMITTED') : QUEUE_STATUSES
  const serviceStatuses = mode === 'OPEN' ? openQualifications
    : mode === 'HISTORY' ? qualificationStatuses.filter((status) => status !== 'COMPETENCY_REVIEW') : qualificationStatuses
  const applications = useQueries({
    queries: applicationStatuses.map((status) => ({
      queryKey: [...adminKeys.applications(), status],
      queryFn: ({ signal }: { signal: AbortSignal }) => getApplications(signal, [status]),
      enabled: enabled && gate !== 'GATE_2',
    })),
  })
  const qualifications = useQueries({
    queries: serviceStatuses.map((status) => ({
      queryKey: [...adminKeys.qualifications('review'), status],
      queryFn: ({ signal }: { signal: AbortSignal }) => getQualifications('review', [status], signal),
      enabled: enabled && gate !== 'GATE_1',
    })),
  })
  const activeQueries = [
    ...(gate !== 'GATE_2' ? applications : []),
    ...(gate !== 'GATE_1' ? qualifications : []),
  ]
  const records = [
    ...(gate !== 'GATE_2' ? applications.flatMap((query) => query.data ?? []) : []).map((row) => ({
      ...row,
      gate: 'GATE_1' as const,
      serviceLabel: '',
      statusMeta: APPLICATION_STATUS[row.status],
      open: row.status === 'SUBMITTED' || row.status === 'NEED_MORE_INFORMATION',
      reviewed: row.status !== 'SUBMITTED',
    })),
    ...(gate !== 'GATE_1' ? qualifications.flatMap((query) => query.data ?? []) : []).map((row) => ({
      ...row,
      gate: 'GATE_2' as const,
      serviceLabel: row.serviceCode,
      statusMeta: QUALIFICATION_STATUS[row.status],
      open: row.status === 'COMPETENCY_REVIEW' || row.status === 'NEED_MORE_INFORMATION',
      reviewed: row.status !== 'COMPETENCY_REVIEW',
    })),
  ].sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))
  return {
    records,
    openCounts: {
      GATE_1: applications.every((query) => query.isSuccess)
        ? records.filter((row) => row.gate === 'GATE_1' && row.open).length : undefined,
      GATE_2: qualifications.every((query) => query.isSuccess)
        ? records.filter((row) => row.gate === 'GATE_2' && row.open).length : undefined,
    },
    isLoading: enabled && activeQueries.some((query) => query.isLoading),
    isFetching: enabled && activeQueries.some((query) => query.isFetching),
    error: activeQueries.find((query) => query.error)?.error ?? null,
    refresh: () => enabled ? Promise.all(activeQueries.map((query) => query.refetch())) : Promise.resolve([]),
  }
}

export function useReviewerSearch() {
  return useOutletContext<{ query: string; setQuery: (query: string) => void }>()
}
