import { api } from '@/lib/api-client'
import { isExpertDemo } from '@/lib/expert-data-source'
import type { LedgerPage, LedgerType, Wallet } from '../types'

/* Demo đọc fixtures; API mode reads billing through the gateway. */
const fixtures = () => import('../fixtures')
const WALLET = '/api/v1/billing/wallet'

interface Envelope<T> {
  success: boolean
  data: T
  message?: string
}

interface LedgerEntryDto {
  id: string
  entryType: LedgerType
  amount: number
  balanceAfter: number
  note: string | null
  createdAt: string
}

export async function getWallet(signal?: AbortSignal): Promise<Wallet> {
  if (isExpertDemo) {
    const { WALLET: demo } = await fixtures()
    return { balance: demo.available, held: demo.held, updatedAt: null }
  }
  const res = await api.get<Envelope<Wallet>>(WALLET, { signal })
  return res.data
}

/** Newest first; page starts at 1 */
export async function getLedger(
  page: number,
  pageSize: number,
  signal?: AbortSignal
): Promise<LedgerPage> {
  if (isExpertDemo) {
    const { LEDGER } = await fixtures()
    const items = LEDGER.slice((page - 1) * pageSize, page * pageSize)
    return { items, page, pageSize, total: LEDGER.length }
  }
  const res = await api.get<
    Envelope<{
      items: LedgerEntryDto[]
      page: number
      pageSize: number
      total: number
    }>
  >(`${WALLET}/ledger`, { params: { page, pageSize }, signal })
  return {
    ...res.data,
    items: res.data.items.map((e) => ({
      id: e.id,
      type: e.entryType,
      amount: e.amount,
      balanceAfter: e.balanceAfter,
      // The server note is English audit text; the entry type already says what happened
      note: null,
      at: e.createdAt,
    })),
  }
}
