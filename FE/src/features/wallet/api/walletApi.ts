import { api, ApiError } from '@/lib/api-client'
import { i18n } from '@/lib/i18n'
import { isExpertDemo } from '@/lib/expert-data-source'
import type {
  LedgerPage,
  LedgerType,
  Topup,
  TopupStatus,
  Wallet,
} from '../types'

/* Demo đọc fixtures; API mode reads billing through the gateway. */
const fixtures = () => import('../fixtures')
const WALLET = '/api/v1/billing/wallet'
const PAYOS = '/api/v1/billing/payos'

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

/** Starts a PayOS top-up; the link and its QR code can be paid for 15 minutes */
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
