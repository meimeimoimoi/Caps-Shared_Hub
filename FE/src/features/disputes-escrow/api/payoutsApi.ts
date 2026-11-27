import { api, ApiError } from '@/lib/api-client'
import { i18n } from '@/lib/i18n'
import { isExpertDemo } from '@/lib/expert-data-source'

const BASE = '/api/v1/admin/billing/payouts'
export const PAYOUT_PAGE_SIZE = 20

interface Envelope<T> {
  success: boolean
  data: T
  message?: string
}

export type PayoutStatus = 'PENDING' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED'

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
  /** PENDING → PROCESSING (sent through PayOS) → SUCCEEDED, or FAILED (may be sent again) */
  status: PayoutStatus
  attemptCount: number
  lastError: string | null
  /** PayOS payout id of the current attempt */
  providerRef: string | null
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

type PayoutErrorKey =
  | 'payouts.errors.notTransferable'
  | 'payouts.errors.noAccount'
  | 'payouts.errors.notVerified'
  | 'payouts.errors.notFound'
  | 'payouts.errors.unavailable'
  | 'payouts.errors.sessionCheck'

// Billing errors staff can hit on a transfer; other errors keep the server message
const ERRORS: Record<string, PayoutErrorKey> = {
  PAYOUT_NOT_TRANSFERABLE: 'payouts.errors.notTransferable',
  PAYOUT_NO_BANK_ACCOUNT: 'payouts.errors.noAccount',
  PAYOUT_ACCOUNT_NOT_VERIFIED: 'payouts.errors.notVerified',
  PAYOUT_NOT_FOUND: 'payouts.errors.notFound',
  PAYMENT_UNAVAILABLE: 'payouts.errors.unavailable',
  SESSION_CHECK_UNAVAILABLE: 'payouts.errors.sessionCheck',
}

async function action(id: string, name: 'transfer' | 'refresh') {
  try {
    const res = await api.post<Envelope<Payout>>(
      `${BASE}/${encodeURIComponent(id)}/${name}`
    )
    return res.data
  } catch (e) {
    const key = e instanceof ApiError && e.code ? ERRORS[e.code] : undefined
    if (!key || !(e instanceof ApiError)) throw e
    throw new ApiError(String(i18n.t(key, { ns: 'admin' })), e.status, e.code)
  }
}

/** Sends a PENDING or FAILED payout to the expert's bank account through PayOS */
export const transferPayout = (id: string) => action(id, 'transfer')

/** Asks PayOS for the outcome of a PROCESSING payout (PayOS sends no payout webhook) */
export const refreshPayout = (id: string) => action(id, 'refresh')
