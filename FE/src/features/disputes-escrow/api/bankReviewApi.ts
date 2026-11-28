import { api, ApiError } from '@/lib/api-client'
import { i18n } from '@/lib/i18n'
import { isExpertDemo } from '@/lib/expert-data-source'

const BASE = '/api/v1/admin/billing/bank-accounts'
const MANAGED_EXPERTS = '/api/v1/admin/experts/managed'
export const BANK_REVIEW_PAGE_SIZE = 20

interface Envelope<T> {
  success: boolean
  data: T
  message?: string
}

export type BankReviewStatus = 'UNVERIFIED' | 'VERIFIED' | 'REJECTED'

/** An expert's bank account as staff review it (billing ReviewBankAccountResponse), with the full number */
export interface ReviewBankAccount {
  id: string
  userId: string
  bankBin: string
  bankName: string
  accountNumber: string
  accountHolderName: string
  isDefault: boolean
  status: BankReviewStatus
  rejectionReason: string | null
  reviewedBy: string | null
  reviewedAt: string | null
  createdAt: string
}

export interface ReviewBankAccountPage {
  items: ReviewBankAccount[]
  page: number
  pageSize: number
  total: number
}

/** Newest first; status null lists every status */
export async function getBankAccountsForReview(
  status: string | null,
  page: number,
  signal?: AbortSignal
): Promise<ReviewBankAccountPage> {
  if (isExpertDemo)
    return { items: [], page, pageSize: BANK_REVIEW_PAGE_SIZE, total: 0 }
  const res = await api.get<Envelope<ReviewBankAccountPage>>(BASE, {
    params: {
      status: status ?? undefined,
      page,
      pageSize: BANK_REVIEW_PAGE_SIZE,
    },
    signal,
  })
  return res.data
}

/** Who an expert account is, and the risk signals staff weigh before paying them */
export interface ExpertInfo {
  name: string | null
  email: string | null
  /** Account status copied from auth; SUSPENDED means the account is locked */
  accountStatus: string | null
  /** Points not excused in the last 90 days (6 hides, 9 suspends) */
  violationPoints: number
  /** At least one of the expert's services is suspended */
  serviceSuspended: boolean
}

/** Registered name and email per expert account id, with their risk signals */
export async function getExpertNames(
  signal?: AbortSignal
): Promise<Map<string, ExpertInfo>> {
  if (isExpertDemo) return new Map()
  const res = await api.get<
    Envelope<
      {
        expertUserId: string
        displayName: string | null
        email: string | null
        status: string
        accountStatus: string | null
        violationPoints: number
      }[]
    >
  >(MANAGED_EXPERTS, { signal })
  // One row per expert–service, so the same expert can appear more than once
  const map = new Map<string, ExpertInfo>()
  for (const e of res.data) {
    const seen = map.get(e.expertUserId)
    map.set(e.expertUserId, {
      name: e.displayName,
      email: e.email,
      accountStatus: e.accountStatus ?? null,
      violationPoints: e.violationPoints ?? 0,
      serviceSuspended: (seen?.serviceSuspended ?? false) || e.status === 'SUSPENDED',
    })
  }
  return map
}

type BankReviewErrorKey =
  | 'bankReview.errors.alreadyReviewed'
  | 'bankReview.errors.selfReview'
  | 'bankReview.errors.notFound'
  | 'bankReview.errors.reason'
  | 'bankReview.errors.sessionCheck'

// Billing errors staff can hit on a review; other errors keep the server message
const ERRORS: Record<string, BankReviewErrorKey> = {
  BANK_ACCOUNT_ALREADY_REVIEWED: 'bankReview.errors.alreadyReviewed',
  BANK_ACCOUNT_SELF_REVIEW: 'bankReview.errors.selfReview',
  BANK_ACCOUNT_NOT_FOUND: 'bankReview.errors.notFound',
  INVALID_BANK_ACCOUNT: 'bankReview.errors.reason',
  SESSION_CHECK_UNAVAILABLE: 'bankReview.errors.sessionCheck',
}

async function review(id: string, action: 'verify' | 'reject', body?: object) {
  try {
    const res = await api.post<Envelope<ReviewBankAccount>>(
      `${BASE}/${encodeURIComponent(id)}/${action}`,
      body
    )
    return res.data
  } catch (e) {
    const key = e instanceof ApiError && e.code ? ERRORS[e.code] : undefined
    if (!key || !(e instanceof ApiError)) throw e
    throw new ApiError(String(i18n.t(key, { ns: 'admin' })), e.status, e.code)
  }
}

/** The holder matches the expert's registered name: payouts may go to this account */
export const verifyBankAccount = (id: string) => review(id, 'verify')

/** Final; the expert sees the reason and links another account */
export const rejectBankAccount = (id: string, reason: string) =>
  review(id, 'reject', { reason })
