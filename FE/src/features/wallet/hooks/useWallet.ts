import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { getLedger, getWallet } from '../api/walletApi'
import { walletKeys } from '../api/queryKeys'

export const LEDGER_PAGE_SIZE = 10

export function useWallet() {
  return useQuery({
    queryKey: walletKeys.wallet(),
    queryFn: ({ signal }) => getWallet(signal),
  })
}

export function useLedger(page: number) {
  return useQuery({
    queryKey: walletKeys.ledger(page),
    queryFn: ({ signal }) => getLedger(page, LEDGER_PAGE_SIZE, signal),
    // Keep the current page on screen while the next one loads
    placeholderData: keepPreviousData,
  })
}
