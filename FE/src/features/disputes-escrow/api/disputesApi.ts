import { api, ApiError } from '@/lib/api-client'
import { isExpertDemo } from '@/lib/expert-data-source'
import { CURRENT_ADMIN } from '@/features/expert-vetting/constants'
import { i18n } from '@/lib/i18n'
import { DISPUTE_OUTCOME } from '../constants'
import { getPublicExpert } from '@/features/marketplace/api/marketplaceApi'
import type { Dispute, DisputeDecisionInput, Escrow } from '../types'
import { toEscrow, type EscrowDto } from './escrowMappers'

/* The demo reads fixtures (cloned so React Query sees new data) and its mutations edit them in place.
 * Disputes use the workflow service, escrows the billing service. */
const fixtures = () => import('./fixtures')
const CASES = '/api/v1/admin/review-cases'
const ESCROWS = '/api/v1/admin/billing/escrows'

interface Envelope<T> {
  success: boolean
  data: T
  message?: string
}

type SettleKey =
  | 'escrow.settle.notHeld'
  | 'escrow.settle.notFound'
  | 'escrow.settle.invalidFee'
  | 'escrow.settle.unavailable'

// Billing errors release and refund can hit; other errors keep the server message
const SETTLE_ERRORS: Record<string, SettleKey> = {
  ESCROW_NOT_HELD: 'escrow.settle.notHeld',
  ESCROW_NOT_FOUND: 'escrow.settle.notFound',
  INVALID_PLATFORM_FEE: 'escrow.settle.invalidFee',
  SESSION_CHECK_UNAVAILABLE: 'escrow.settle.unavailable',
}

async function settle(call: Promise<unknown>) {
  try {
    await call
  } catch (e) {
    const key = e instanceof ApiError && e.code ? SETTLE_ERRORS[e.code] : undefined
    if (!key || !(e instanceof ApiError)) throw e
    throw new ApiError(String(i18n.t(key, { ns: 'admin' })), e.status, e.code)
  }
}

const notConnected = () =>
  new Error(String(i18n.t('escrow.notConnected', { ns: 'admin' })))

/** AdminDisputeResponse of the workflow service */
interface AdminDisputeDto {
  reviewCaseId: string
  /** Only admins see it; the expert never learns the client's contact */
  requesterEmail: string | null
  expertProfileId: string
  fee: number
  platformFeePct: number
  result: string | null
  reviewSummary: string | null
  overdue: boolean
  dispute: {
    id: string
    reason: string
    description: string
    status: string
    openedAt: string
    decideBy: string
    /** The admin already used the one extension */
    extended: boolean
    expertStatement: string | null
  }
}

/** Meeting of 2026-11-11: an upheld dispute refunds 50% and the platform keeps the rest; a rejected one splits as booked */
const REFUND_PCT = {
  RESOLVE_REFUND_USER: 50,
  RESOLVE_PAY_EXPERT: 0,
} as const

/** ReviewDispute.Reasons on the server */
const REASON_KEY = {
  DELIVERABLE_INCOMPLETE: 'disputes.reason.DELIVERABLE_INCOMPLETE',
  OBLIGATION_NOT_MET: 'disputes.reason.OBLIGATION_NOT_MET',
  PROFESSIONAL_JUDGMENT: 'disputes.reason.PROFESSIONAL_JUDGMENT',
} as const

function toDispute(x: AdminDisputeDto, expert: string): Dispute {
  const d = x.dispute
  // An unknown code from a newer server is shown as sent rather than hidden
  const reason =
    d.reason in REASON_KEY
      ? i18n.t(REASON_KEY[d.reason as keyof typeof REASON_KEY], { ns: 'admin' })
      : d.reason
  return {
    id: x.reviewCaseId,
    code: x.reviewCaseId.slice(0, 8).toUpperCase(),
    kind: 'DELIVERY_ISSUE',
    client: x.requesterEmail ?? undefined,
    expert: expert || undefined,
    ground: reason,
    openedAt: d.openedAt,
    decideBy: d.decideBy,
    escalatedAt: d.extended ? d.decideBy : undefined,
    fee: x.fee,
    platformFeePct: x.platformFeePct,
    expertStatement: d.expertStatement ?? undefined,
    reviewSummary: x.reviewSummary ?? undefined,
    complaint: { issue: reason, description: d.description },
    history: [],
  }
}

async function openDisputes(signal?: AbortSignal) {
  const response = await api.get<Envelope<AdminDisputeDto[]>>(
    `${CASES}/disputes`,
    { signal }
  )
  // ponytail: one marketplace call per distinct expert; add the name to the dispute API if the queue grows large
  const ids = [...new Set(response.data.map((x) => x.expertProfileId))]
  const names = new Map(
    await Promise.all(
      ids.map(
        async (id) =>
          [
            id,
            // A suspended expert is no longer listed: the email still shows
            await getPublicExpert(id, signal)
              .then((e) => e.displayName ?? '')
              .catch(() => ''),
          ] as const
      )
    )
  )
  return response.data.map((x) =>
    toDispute(x, names.get(x.expertProfileId) ?? '')
  )
}

/* ── Khiếu nại ── */
export async function getDisputes(signal?: AbortSignal) {
  if (isExpertDemo) return structuredClone((await fixtures()).mockDisputes)
  return openDisputes(signal)
}

export async function getDispute(
  id: string,
  signal?: AbortSignal
): Promise<Dispute | null> {
  if (isExpertDemo) {
    const d = (await fixtures()).mockDisputes.find((x) => x.id === id)
    return d ? structuredClone(d) : null
  }
  // The server has the open queue only, no single-dispute endpoint
  return (await openDisputes(signal)).find((x) => x.id === id) ?? null
}

export async function decideDispute(id: string, body: DisputeDecisionInput) {
  if (isExpertDemo) {
    const d = (await fixtures()).mockDisputes.find((x) => x.id === id)
    if (!d) return
    d.resolvedAt = new Date().toISOString()
    d.history.unshift({
      at: d.resolvedAt,
      actor: CURRENT_ADMIN,
      text: `${i18n.t('disputes.decision.done', { ns: 'admin' })}: ${i18n.t(DISPUTE_OUTCOME[body.outcome].label, { ns: 'admin' })}. ${body.reason}`,
    })
    return
  }
  await api.post(`${CASES}/${id}/dispute/decision`, {
    refundPct: REFUND_PCT[body.outcome],
    note: body.reason,
  })
}

/** Escalate a professional-judgment dispute; allowed once and adds 2 working days to the deadline */
export async function escalateDispute(id: string) {
  if (isExpertDemo) {
    const d = (await fixtures()).mockDisputes.find((x) => x.id === id)
    if (!d || d.escalatedAt || d.resolvedAt) return
    d.escalatedAt = new Date().toISOString()
    d.history.unshift({
      at: d.escalatedAt,
      actor: CURRENT_ADMIN,
      text: i18n.t('disputes.escalation.logged', { ns: 'admin' }),
    })
    return
  }
  await api.post(`${CASES}/${id}/dispute/extend`)
}

/* ── Escrow ── */
export async function getEscrows(signal?: AbortSignal): Promise<Escrow[]> {
  if (isExpertDemo) return structuredClone((await fixtures()).mockEscrows)
  // Collect every server page before client filtering and sorting.
  const rows = new Map<string, EscrowDto>()
  let page = 1
  let total = 0
  do {
    const res = await api.get<Envelope<{ items: EscrowDto[]; total: number }>>(ESCROWS, {
      params: { page, pageSize: 100 },
      signal,
    })
    for (const row of res.data.items) rows.set(row.id, row)
    total = res.data.total
    if (res.data.items.length < 100) break
    page++
  } while ((page - 1) * 100 < total)
  return [...rows.values()].map(toEscrow)
}

/** Pays a HELD escrow to the expert minus the platform fee; billing creates a PENDING payout (API mode only) */
export async function releaseEscrow(
  caseId: string,
  expertUserId: string,
  platformFeePct: number
) {
  await settle(
    api.post(`${ESCROWS}/${encodeURIComponent(caseId)}/release`, {
      expertUserId,
      platformFeePct,
    })
  )
}

/** Returns a HELD escrow to the payer's credits (API mode only) */
export async function refundEscrow(caseId: string) {
  await settle(api.post(`${ESCROWS}/${encodeURIComponent(caseId)}/refund`))
}

/** Chi trả lại khoản bị lỗi (PAYOUT_FAILED) */
export async function retryPayout(caseId: string, actor: string) {
  if (isExpertDemo) {
    const e = (await fixtures()).mockEscrows.find((x) => x.caseId === caseId)
    if (!e) return
    // MOCK: lỗi tạm thời (ngân hàng không phản hồi) thì thành công; tài khoản sai thì vẫn lỗi
    if (e.failure && !e.failure.retryable)
      throw new Error(i18n.t('escrow.retryBlocked', { ns: 'admin' }))
    const at = new Date().toISOString()
    Object.assign(e, { status: 'PAID', nextAt: at, failure: undefined })
    e.history.unshift({
      at,
      actor,
      text: i18n.t('escrow.retried', { ns: 'admin', id: caseId }),
    })
    return
  }
  // Billing does not make the transfers yet, so there is nothing to retry
  throw notConnected()
}

/** Đánh dấu đã hoàn tiền cho Client, kèm mã giao dịch ngân hàng để đối soát.
 * ponytail: hoàn tay vì chưa rõ PayOS có API hoàn tiền; nếu có, BE tự chuyển trạng thái và nút này chỉ còn dùng cho ca lỗi */
export async function markRefunded(caseId: string, ref: string, actor: string) {
  if (isExpertDemo) {
    const e = (await fixtures()).mockEscrows.find((x) => x.caseId === caseId)
    if (!e) return
    const at = new Date().toISOString()
    Object.assign(e, {
      status: 'REFUNDED',
      nextAt: at,
      refundRef: ref,
      failure: undefined,
    })
    e.history.unshift({
      at,
      actor,
      text: i18n.t('escrow.refund.logged', { ns: 'admin', ref }),
    })
    return
  }
  // A billing refund goes back to the payer's credits (refundEscrow); bank refunds are not built yet
  throw notConnected()
}
