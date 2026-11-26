import { useState } from 'react'
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { getPayouts, refreshPayout, transferPayout } from '../api/payoutsApi'

const all = ['private', 'admin', 'disputes-escrow', 'payouts'] as const
const key = (status: string | null, page: number) =>
  [...all, status, page] as const

/** Payout list filtered by status on the server, one page at a time */
export function usePayouts() {
  const qc = useQueryClient()
  const [status, setStatusState] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const query = useQuery({
    queryKey: key(status, page),
    queryFn: ({ signal }) => getPayouts(status, page, signal),
    // Keep the current page on screen while the next one loads
    placeholderData: keepPreviousData,
  })
  // A failed call may still have moved the payout (e.g. to PROCESSING), so reload either way
  const reload = <T>(call: Promise<T>) =>
    call.finally(() => qc.invalidateQueries({ queryKey: all }))
  return {
    ...query,
    status,
    setStatus: (s: string | null) => {
      setStatusState(s)
      setPage(1)
    },
    page,
    setPage,
    transfer: (id: string) => reload(transferPayout(id)),
    refresh: (id: string) => reload(refreshPayout(id)),
  }
}
