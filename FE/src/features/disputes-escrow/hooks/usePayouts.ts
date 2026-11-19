import { useSortState } from '@/hooks/useTableSort'
import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { getPayouts } from '../api/payoutsApi'

const key = (status: string | null, page: number) =>
  ['private', 'admin', 'disputes-escrow', 'payouts', status, page] as const

/** Payout list filtered by status on the server, one page at a time */
export function usePayouts() {
  const [status, setStatusState] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const sorting = useSortState({ key: 'createdAt', direction: 'desc' })
  const query = useQuery({
    queryKey: [...key(status, page), sorting.sort],
    queryFn: ({ signal }) => getPayouts(status, page, signal, sorting.sort),
    // Keep the current page on screen while the next one loads
    placeholderData: keepPreviousData,
  })
  return {
    ...query,
    sort: sorting.sort,
    onSort: (key: string) => {
      sorting.onSort(key)
      setPage(1)
    },
    status,
    setStatus: (s: string | null) => {
      setStatusState(s)
      setPage(1)
    },
    page,
    setPage,
  }
}
