import { keepPreviousData, useQueries } from '@tanstack/react-query'
import { getBillingStats, getUserStats, statsKeys } from '../api/statsApi'
import type { Granularity } from '../types'
import { toMonths, toQuarters } from '../utils/periods'

/** Quarters need two years of months so that four full quarters survive dropping the incomplete first one */
const MONTHS: Record<Granularity, number> = { month: 12, quarter: 24 }

/** Monthly or quarterly growth, joined from the auth and billing statistics */
export function useAdminStats(granularity: Granularity, enabled = true) {
  const months = MONTHS[granularity]
  return useQueries({
    queries: [
      {
        queryKey: statsKeys.users(months),
        queryFn: ({ signal }: { signal: AbortSignal }) => getUserStats(months, signal),
        // Switching month/quarter keeps the old chart (faded) until the new figures arrive
        placeholderData: keepPreviousData,
        enabled,
      },
      {
        queryKey: statsKeys.billing(months),
        queryFn: ({ signal }: { signal: AbortSignal }) => getBillingStats(months, signal),
        placeholderData: keepPreviousData,
        enabled,
      },
    ],
    combine: ([users, billing]) => {
      const monthly =
        users.data && billing.data ? toMonths(users.data, billing.data) : undefined
      return {
        data: monthly && (granularity === 'month' ? monthly : toQuarters(monthly)),
        isLoading: users.isLoading || billing.isLoading,
        isPlaceholderData: users.isPlaceholderData || billing.isPlaceholderData,
        error: users.error ?? billing.error,
      }
    },
  })
}
