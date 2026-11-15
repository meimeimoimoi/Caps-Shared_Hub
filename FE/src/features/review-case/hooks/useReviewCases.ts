import { useMemo } from 'react'
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth'
import { getPublicExpert } from '@/features/marketplace/api/marketplaceApi'
import { marketplaceKeys } from '@/features/marketplace/hooks/useMarketplace'
import { ApiError } from '@/lib/api-client'
import { isExpertDemo } from '@/lib/expert-data-source'
import {
  getCaseDispute,
  getReviewCase,
  listReviewCases,
} from '../api/reviewCaseApi'
import { DEMO_CASES, demoCase } from '../fixtures'
import { toReviewCase } from '../mapper'
import { caseText } from '../ui'
import type { ReviewCase } from '../types'

export const reviewCaseKeys = {
  all: ['private', 'review-cases'] as const,
  list: () => [...reviewCaseKeys.all, 'list'] as const,
  detail: (id: string) => [...reviewCaseKeys.all, 'detail', id] as const,
  dispute: (id: string) => [...reviewCaseKeys.all, 'dispute', id] as const,
  attachments: (id: string) =>
    [...reviewCaseKeys.all, 'attachments', id] as const,
}

// A delisted expert answers 404: the case still shows, with a generic name
const expertQuery = (id: string) => ({
  queryKey: marketplaceKeys.expert(id),
  queryFn: ({ signal }: { signal: AbortSignal }) => getPublicExpert(id, signal),
  retry: false,
  staleTime: 300_000,
})

const noRetryOn404 = (count: number, error: Error) =>
  !(error instanceof ApiError && error.status === 404) && count < 1

/** The cases the signed-in user booked, newest first; fixtures in the development demo. */
export function useClientCases() {
  const userId = useAuthStore((s) => s.user?.id)
  const query = useQuery({
    queryKey: reviewCaseKeys.list(),
    queryFn: ({ signal }) => listReviewCases(signal),
    enabled: !isExpertDemo && Boolean(userId),
    staleTime: 15_000,
  })
  const mine = useMemo(
    () => query.data?.filter((d) => d.requesterUserId === userId) ?? [],
    [query.data, userId]
  )
  const experts = useQueries({
    queries: [...new Set(mine.map((d) => d.expertProfileId))].map(expertQuery),
    combine: (results) => results.map((r) => r.data),
  })
  const cases = useMemo<ReviewCase[]>(() => {
    if (isExpertDemo)
      return DEMO_CASES.map((d) => demoCase(d.id)!).sort((a, b) =>
        b.timeline[0].at.localeCompare(a.timeline[0].at)
      )
    return mine.map((d) => {
      const bio = experts.find((e) => e?.expertId === d.expertProfileId)
      return toReviewCase(d, {
        expertName: bio?.displayName,
        serviceName: bio?.services.find((s) => s.serviceId === d.serviceCode)
          ?.serviceName,
      })
    })
  }, [mine, experts])
  return {
    cases,
    isPending: !isExpertDemo && query.isPending,
    isError: !isExpertDemo && query.isError,
    refetch: query.refetch,
  }
}

/** One case with its dispute and the expert's public name. */
export function useLiveCase(id: string) {
  const detail = useQuery({
    queryKey: reviewCaseKeys.detail(id),
    queryFn: ({ signal }) => getReviewCase(id, signal),
    enabled: !isExpertDemo && Boolean(id),
    retry: noRetryOn404,
    // The expiry job moves a case without telling the page that shows it
    refetchInterval: 30_000,
  })
  const dto = detail.data
  const dispute = useQuery({
    queryKey: reviewCaseKeys.dispute(id),
    queryFn: ({ signal }) => getCaseDispute(id, signal),
    enabled: dto?.status === 'DISPUTED' || dto?.status === 'RESOLVED',
    retry: noRetryOn404,
  })
  const expert = useQuery({
    ...expertQuery(dto?.expertProfileId ?? ''),
    enabled: Boolean(dto),
  })
  const view = useMemo(
    () =>
      dto &&
      toReviewCase(dto, {
        expertName: expert.data?.displayName,
        serviceName: expert.data?.services.find(
          (s) => s.serviceId === dto.serviceCode
        )?.serviceName,
        dispute: dispute.data,
      }),
    [dto, expert.data, dispute.data]
  )
  return {
    dto,
    view,
    dispute: dispute.data,
    isPending: detail.isPending,
    notFound: detail.error instanceof ApiError && detail.error.status === 404,
    isError: detail.isError,
    refetch: detail.refetch,
  }
}

/** The server's reason in the user's language; unknown codes get a generic message. */
export function useCaseError() {
  return (error: unknown): string =>
    (error instanceof ApiError && caseText(`errors.${error.code}`)) ||
    caseText('errors.failed')!
}

/** Runs one case action at a time, so a double click cannot send it twice, then reloads the case. */
export function useCaseRun() {
  const client = useQueryClient()
  const mutation = useMutation({
    mutationFn: (action: () => Promise<unknown>) => action(),
    onSuccess: () => client.invalidateQueries({ queryKey: reviewCaseKeys.all }),
  })
  const run: typeof mutation.mutate = (action, options) => {
    if (!mutation.isPending) mutation.mutate(action, options)
  }
  return { run, busy: mutation.isPending }
}
