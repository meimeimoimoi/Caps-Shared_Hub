import { useState } from 'react'
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { getExpertNames } from '../api/bankReviewApi'
import { getDisputes } from '../api/disputesApi'
import { disputesKeys } from '../api/queryKeys'
import {
  getPayouts,
  getPayoutSummary,
  holdPayout,
  refreshPayout,
  releasePayout,
  transferPayout,
  type PayoutFilters,
} from '../api/payoutsApi'

const all = ['private', 'admin', 'disputes-escrow', 'payouts'] as const

/** Payout list filtered on the server, one page at a time, with the deadline banner */
export function usePayouts() {
  const qc = useQueryClient()
  const [filters, setFiltersState] = useState<PayoutFilters>({ status: null })
  const [page, setPage] = useState(1)
  const query = useQuery({
    queryKey: [...all, filters, page],
    queryFn: ({ signal }) => getPayouts(filters, page, signal),
    // Keep the current page on screen while the next one loads
    placeholderData: keepPreviousData,
  })
  const summary = useQuery({
    queryKey: [...all, 'summary'],
    queryFn: ({ signal }) => getPayoutSummary(signal),
  })
  const names = useQuery({
    // Shared with the bank account review, outside the payout key
    queryKey: ['private', 'admin', 'disputes-escrow', 'expert-names'],
    queryFn: ({ signal }) => getExpertNames(signal),
  })
  // Open and closed disputes (the id is the review case): flags payouts of a disputed case
  const disputes = useQuery({
    queryKey: disputesKeys.disputes(),
    queryFn: ({ signal }) => getDisputes(signal),
  })
  // A failed call may still have moved the payout (e.g. to PROCESSING), so reload either way
  const reload = <T>(call: Promise<T>) =>
    call.finally(() => qc.invalidateQueries({ queryKey: all }))
  return {
    ...query,
    filters,
    setFilters: (next: Partial<PayoutFilters>) => {
      setFiltersState((f) => ({ ...f, ...next }))
      setPage(1)
    },
    summary: summary.data,
    names: names.data,
    disputedCases: new Set((disputes.data ?? []).map((d) => d.id)),
    page,
    setPage,
    transfer: (id: string) => reload(transferPayout(id)),
    refresh: (id: string) => reload(refreshPayout(id)),
    hold: (id: string, reason: string, days: number) =>
      reload(holdPayout(id, reason, days)),
    release: (id: string, note: string) => reload(releasePayout(id, note)),
  }
}
