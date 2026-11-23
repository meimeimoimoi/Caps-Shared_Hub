import { api } from '@/lib/api-client'
import { isExpertDemo } from '@/lib/expert-data-source'
import type { CreditLedgerEntry, CreditOverview, CreditWallet } from '../types'

const BASE = '/api/v1/billing/wallet'
type Envelope<T> = { data: T }

const fixtures = () => import('./fixtures')

export const creditsKeys = {
  all: ['private', 'client', 'credits'] as const,
  overview: () => [...creditsKeys.all, 'overview'] as const,
}

export async function getCreditOverview(
  signal?: AbortSignal
): Promise<CreditOverview> {
  if (isExpertDemo)
    return structuredClone((await fixtures()).mockCreditOverview)
  // ponytail: newest 50 movements only, and billing has no list of payments yet; add paging and that API when needed
  const [wallet, ledger] = await Promise.all([
    api.get<Envelope<CreditWallet>>(BASE, { signal }),
    api.get<Envelope<{ items: CreditLedgerEntry[] }>>(`${BASE}/ledger`, {
      params: { pageSize: 50 },
      signal,
    }),
  ])
  return { wallet: wallet.data, ledger: ledger.data.items, payments: [] }
}
