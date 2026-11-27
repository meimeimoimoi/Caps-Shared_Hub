import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addBankAccount,
  listBankAccounts,
  removeBankAccount,
} from '../api/bankAccountsApi'
import type { BankAccount, NewBankAccount } from '../types'

const key = ['private', 'expert', 'bank-accounts'] as const

export function useBankAccounts() {
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => listBankAccounts(signal),
  })
  // Every change answers with the whole list, so no refetch is needed
  const store = (accounts: BankAccount[]) => {
    qc.setQueryData(key, accounts)
  }
  return {
    accounts: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    add: (input: NewBankAccount) => addBankAccount(input).then(store),
    remove: (id: string) => removeBankAccount(id).then(store),
  }
}
