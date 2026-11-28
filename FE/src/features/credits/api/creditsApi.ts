import { api, ApiError } from '@/lib/api-client'
import { i18n } from '@/lib/i18n'
import { isExpertDemo } from '@/lib/expert-data-source'
import type {
  CreditLedgerEntry,
  CreditOverview,
  CreditWallet,
  Topup,
  TopupStatus,
} from '../types'

const BASE = '/api/v1/billing/wallet'
const PAYOS = '/api/v1/billing/payos'
type Envelope<T> = { data: T }

const fixtures = () => import('./fixtures')

export const creditsKeys = {
  all: ['private', 'client', 'credits'] as const,
  overview: () => [...creditsKeys.all, 'overview'] as const,
  topup: (paymentId: string) =>
    [...creditsKeys.all, 'topup', paymentId] as const,
}

/** Top-up limits in VND, as billing checks them (PaymentRules) */
export const TOPUP_MIN = 10_000
export const TOPUP_MAX = 50_000_000

type TopupKey =
  | 'wallet.topup.invalid'
  | 'wallet.topup.conflict'
  | 'wallet.topup.unavailable'
  | 'wallet.topup.demo'

// Billing errors a top-up can hit; other errors keep the server message
const TOPUP_ERRORS: Record<string, TopupKey> = {
  INVALID_TOPUP_AMOUNT: 'wallet.topup.invalid',
  PAYMENT_CONFLICT: 'wallet.topup.conflict',
  PAYMENT_UNAVAILABLE: 'wallet.topup.unavailable',
  SESSION_CHECK_UNAVAILABLE: 'wallet.topup.unavailable',
}

const translated = (key: TopupKey) => String(i18n.t(key, { ns: 'reviewCase' }))

/** Starts a PayOS top-up; the payment link can be paid for 15 minutes */
export async function createTopup(amount: number): Promise<Topup> {
  if (isExpertDemo) throw new Error(translated('wallet.topup.demo'))
  try {
    const res = await api.post<Envelope<Topup>>(`${PAYOS}/create-topup`, {
      amount,
    })
    return res.data
  } catch (e) {
    const key = e instanceof ApiError && e.code ? TOPUP_ERRORS[e.code] : null
    if (key && e instanceof ApiError)
      throw new ApiError(translated(key), e.status, e.code)
    throw e
  }
}

/** PENDING until PayOS confirms (SUCCEEDED) or the link could not be made (FAILED) */
export async function getTopupStatus(
  paymentId: string,
  signal?: AbortSignal
): Promise<TopupStatus> {
  const res = await api.get<Envelope<TopupStatus>>(
    `${PAYOS}/topups/${encodeURIComponent(paymentId)}`,
    { signal }
  )
  return res.data
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
