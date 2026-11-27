import { useState } from 'react'
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  getBankAccountsForReview,
  getExpertNames,
  rejectBankAccount,
  verifyBankAccount,
} from '../api/bankReviewApi'

const all = ['private', 'admin', 'disputes-escrow', 'bank-review'] as const

/** Bank accounts waiting for staff review first, one page at a time, with the experts' registered names */
export function useBankReview() {
  const qc = useQueryClient()
  const [status, setStatusState] = useState<string | null>('UNVERIFIED')
  const [page, setPage] = useState(1)
  const query = useQuery({
    queryKey: [...all, status, page],
    queryFn: ({ signal }) => getBankAccountsForReview(status, page, signal),
    // Keep the current page on screen while the next one loads
    placeholderData: keepPreviousData,
  })
  const names = useQuery({
    // Outside the list key, so a review does not reload every expert
    queryKey: ['private', 'admin', 'disputes-escrow', 'expert-names'],
    queryFn: ({ signal }) => getExpertNames(signal),
  })
  const reload = <T>(call: Promise<T>) =>
    call.finally(() => qc.invalidateQueries({ queryKey: all }))
  return {
    ...query,
    names: names.data,
    status,
    setStatus: (s: string | null) => {
      setStatusState(s)
      setPage(1)
    },
    page,
    setPage,
    verify: (id: string) => reload(verifyBankAccount(id)),
    reject: (id: string, reason: string) =>
      reload(rejectBankAccount(id, reason)),
  }
}
