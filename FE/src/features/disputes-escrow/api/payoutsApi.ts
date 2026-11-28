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
  /** The review case the payout settles; null in a transfer's own response */
  reviewCaseId: string | null
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
  /** Settlement + 7 calendar days: it cannot be sent earlier */
  transferableFrom: string
  /** Staff must send it by then: 2 working days after the hold or the account check, null without a verified account */
  dueAt: string | null
  /** 1 working day before dueAt, when staff are reminded */
  remindAt: string | null
  /** Every allowed attempt failed; only another verified account of the expert is tried */
  attemptsExhausted: boolean
  /** Why staff hold it for review; null when it is not held */
  holdReason: string | null
  /** Staff must review the hold by then */
  holdReviewBy: string | null
  /** What the transfer cost the platform once paid; the expert receives the full amount */
  transferFee: number | null
  /** Status changes, oldest first; never edited */
  history: PayoutHistoryEntry[]
}

/** One payout status change; actorUserId is null when the system or PayOS made it */
export interface PayoutHistoryEntry {
  /** A status, or ON_HOLD / RELEASED when staff held or released it */
  status: PayoutStatus | 'ON_HOLD' | 'RELEASED'
  attemptNo: number
  accountLast4: string | null
  actorUserId: string | null
  /** PayOS payout id, or the failure reason */
  note: string | null
  at: string
}

export interface PayoutPage {
  items: Payout[]
  page: number
  pageSize: number
  total: number
}

/** Staff filters on the payout table; empty fields do not filter */
export interface PayoutFilters {
  status: string | null
  recipientUserId?: string
  /** Created on or after this day (YYYY-MM-DD, Vietnam time) */
  fromDay?: string
  /** Created on or before this day (YYYY-MM-DD, Vietnam time) */
  toDay?: string
  minAmount?: number
  maxAmount?: number
}

// A Vietnam calendar day as the instant it starts
const dayStart = (day: string) => `${day}T00:00:00+07:00`
const nextDay = (day: string) => {
  const d = new Date(`${day}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

/** Unsent payouts first, the most urgent on top (the server sorts by deadline) */
export async function getPayouts(
  filters: PayoutFilters,
  page: number,
  signal?: AbortSignal
): Promise<PayoutPage> {
  // Demo escrows carry their own payout state, so the demo has no separate payout list
  if (isExpertDemo)
    return { items: [], page, pageSize: PAYOUT_PAGE_SIZE, total: 0 }
  const res = await api.get<Envelope<PayoutPage>>(BASE, {
    params: {
      status: filters.status ?? undefined,
      page,
      pageSize: PAYOUT_PAGE_SIZE,
      recipientUserId: filters.recipientUserId || undefined,
      from: filters.fromDay ? dayStart(filters.fromDay) : undefined,
      to: filters.toDay ? dayStart(nextDay(filters.toDay)) : undefined,
      minAmount: filters.minAmount ?? undefined,
      maxAmount: filters.maxAmount ?? undefined,
    },
    signal,
  })
  return res.data
}

/** Unsent payouts by deadline stage and the PayOS payout balance (billing PayoutSummaryResponse) */
export interface PayoutSummary {
  summary: {
    overdue: number
    overdueAmount: number
    dueSoon: number
    ready: number
    waitingForAccount: number
    amountToSend: number
    heldPastReview: number
  }
  /** Null when PayOS cannot be read */
  balance: number | null
}

export async function getPayoutSummary(
  signal?: AbortSignal
): Promise<PayoutSummary | null> {
  if (isExpertDemo) return null
  const res = await api.get<Envelope<PayoutSummary>>(`${BASE}/summary`, {
    signal,
  })
  return res.data
}

type PayoutErrorKey =
  | 'payouts.errors.notTransferable'
  | 'payouts.errors.noAccount'
  | 'payouts.errors.notVerified'
  | 'payouts.errors.notFound'
  | 'payouts.errors.onHold'
  | 'payouts.errors.attemptsExhausted'
  | 'payouts.errors.insufficientBalance'
  | 'payouts.errors.held'
  | 'payouts.errors.holdInvalid'
  | 'payouts.errors.notHeld'
  | 'payouts.errors.unavailable'
  | 'payouts.errors.sessionCheck'

// Billing errors staff can hit on a transfer; other errors keep the server message
const ERRORS: Record<string, PayoutErrorKey> = {
  PAYOUT_NOT_TRANSFERABLE: 'payouts.errors.notTransferable',
  PAYOUT_NO_BANK_ACCOUNT: 'payouts.errors.noAccount',
  PAYOUT_ACCOUNT_NOT_VERIFIED: 'payouts.errors.notVerified',
  PAYOUT_NOT_FOUND: 'payouts.errors.notFound',
  PAYOUT_ON_HOLD: 'payouts.errors.onHold',
  PAYOUT_ATTEMPTS_EXHAUSTED: 'payouts.errors.attemptsExhausted',
  PAYOUT_INSUFFICIENT_BALANCE: 'payouts.errors.insufficientBalance',
  PAYOUT_HELD: 'payouts.errors.held',
  PAYOUT_HOLD_INVALID: 'payouts.errors.holdInvalid',
  PAYOUT_NOT_HELD: 'payouts.errors.notHeld',
  PAYMENT_UNAVAILABLE: 'payouts.errors.unavailable',
  SESSION_CHECK_UNAVAILABLE: 'payouts.errors.sessionCheck',
}

async function action(
  id: string,
  name: 'transfer' | 'refresh' | 'hold' | 'release',
  body?: object
) {
  try {
    const res = await api.post<Envelope<Payout>>(
      `${BASE}/${encodeURIComponent(id)}/${name}`,
      body
    )
    return res.data
  } catch (e) {
    const key = e instanceof ApiError && e.code ? ERRORS[e.code] : undefined
    if (!key || !(e instanceof ApiError)) throw e
    throw new ApiError(String(i18n.t(key, { ns: 'admin' })), e.status, e.code)
  }
}

/** Holds an unsent payout for review: a reason (10+ characters) and a review within 1-30 days */
export const holdPayout = (id: string, reason: string, reviewDays: number) =>
  action(id, 'hold', { reason, reviewDays })

/** Lifts a hold after review; the deadline restarts */
export const releasePayout = (id: string, note: string) =>
  action(id, 'release', { note: note || null })

/** Sends a PENDING or FAILED payout to the expert's bank account through PayOS */
export const transferPayout = (id: string) => action(id, 'transfer')

/** Asks PayOS for the outcome of a PROCESSING payout (PayOS sends no payout webhook) */
export const refreshPayout = (id: string) => action(id, 'refresh')
