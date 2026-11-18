import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getTopupStatus } from '../api/walletApi'
import { walletKeys } from '../api/queryKeys'
import type { Topup } from '../types'

/** Asks billing every 3 s while the QR code can still be paid; a confirmed top-up refreshes the wallet */
export function useTopupStatus(topup: Topup | null) {
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: walletKeys.topup(topup?.paymentId ?? ''),
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
    if (status !== 'SUCCEEDED') return
    void qc.invalidateQueries({ queryKey: walletKeys.wallet() })
    void qc.invalidateQueries({ queryKey: walletKeys.ledgers() })
  }, [status, qc])
  return query
}
