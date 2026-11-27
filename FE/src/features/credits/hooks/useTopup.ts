import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { creditsKeys, getTopupStatus } from '../api/creditsApi'
import type { Topup } from '../types'

/** Asks billing every 3 s while the payment link can still be paid; a confirmed top-up refreshes the wallet */
export function useTopupStatus(topup: Topup | null) {
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: creditsKeys.topup(topup?.paymentId ?? ''),
    queryFn: ({ signal }) => getTopupStatus(topup!.paymentId, signal),
    enabled: Boolean(topup),
    refetchInterval: (q) =>
      topup &&
      (q.state.data?.status ?? 'PENDING') === 'PENDING' &&
      Date.parse(topup.expiresAt) > Date.now()
        ? 3000
        : false,
  })
  const status = query.data?.status
  useEffect(() => {
    if (status === 'SUCCEEDED')
      void qc.invalidateQueries({ queryKey: creditsKeys.overview() })
  }, [status, qc])
  return query
}
