import { api } from '@/lib/api-client'
import { isExpertDemo } from '@/lib/expert-data-source'

const BASE = '/api/v1/admin/billing/payouts'
export const PAYOUT_PAGE_SIZE = 20

interface Envelope<T> {
  success: boolean
  data: T
  message?: string
}

/** One transfer to an expert (billing PayoutResponse); bank details are copied when it is created */
export interface Payout {
  id: string
  settlementId: string
  payoutType: string
  recipientUserId: string
  amount: number
  bankName: string | null
  accountLast4: string | null
  holderName: string | null
  /** PENDING until the transfer is made (transfers are not built yet) */
  status: string
  attemptCount: number
  lastError: string | null
  createdAt: string
  completedAt: string | null
}

export interface PayoutPage {
  items: Payout[]
  page: number
  pageSize: number
  total: number
}

/** Newest first; status null lists every status */
export async function getPayouts(
  status: string | null,
  page: number,
  signal?: AbortSignal
): Promise<PayoutPage> {
  // Demo escrows carry their own payout state, so the demo has no separate payout list
  if (isExpertDemo)
    return { items: [], page, pageSize: PAYOUT_PAGE_SIZE, total: 0 }
  const res = await api.get<Envelope<PayoutPage>>(BASE, {
    params: { status: status ?? undefined, page, pageSize: PAYOUT_PAGE_SIZE },
    signal,
  })
  return res.data
}
