import { api, ApiError } from '@/lib/api-client'
import { isExpertDemo } from '@/lib/expert-data-source'
import { CURRENT_ADMIN } from '@/features/expert-vetting/constants'
import { i18n } from '@/lib/i18n'
import { DISPUTE_OUTCOME } from '../constants'
import type { Dispute, DisputeDecisionInput, Escrow } from '../types'
import { toEscrow, type EscrowDto } from './escrowMappers'

/* Dev chạy demo thì đọc fixtures (bản sao để React Query thấy dữ liệu mới);
 * mutation demo sửa thẳng fixtures để lần refetch sau thấy thay đổi.
 * TODO(api): đối chiếu lại đường dẫn endpoint với BE khi có Swagger. */
const fixtures = () => import('./fixtures')
const BASE = '/api/admin'
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

/* ── Khiếu nại ── */
export async function getDisputes(signal?: AbortSignal) {
  if (isExpertDemo) return structuredClone((await fixtures()).mockDisputes)
  return api.get<Dispute[]>(`${BASE}/disputes`, { signal })
}

export async function getDispute(
  id: string,
  signal?: AbortSignal
): Promise<Dispute | null> {
  if (isExpertDemo) {
    const d = (await fixtures()).mockDisputes.find((x) => x.id === id)
    return d ? structuredClone(d) : null
  }
  return api.get<Dispute>(`${BASE}/disputes/${id}`, { signal })
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
  await api.post(`${BASE}/disputes/${id}/decision`, body)
}

/** Escalate a professional-judgment dispute; allowed once and adds 48 hours to the deadline */
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
  await api.post(`${BASE}/disputes/${id}/escalate`)
}

/* ── Escrow ── */
export async function getEscrows(signal?: AbortSignal): Promise<Escrow[]> {
  if (isExpertDemo) return structuredClone((await fixtures()).mockEscrows)
  // shortcut: the newest 100 escrows (the API maximum); filter and page on the server when there are more
  const res = await api.get<Envelope<{ items: EscrowDto[] }>>(ESCROWS, {
    params: { page: 1, pageSize: 100 },
    signal,
  })
  return res.data.items.map(toEscrow)
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
    e.history.unshift({ at, actor, text: i18n.t('escrow.retried', { ns: 'admin', id: caseId }) })
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
    Object.assign(e, { status: 'REFUNDED', nextAt: at, refundRef: ref, failure: undefined })
    e.history.unshift({ at, actor, text: i18n.t('escrow.refund.logged', { ns: 'admin', ref }) })
    return
  }
  // A billing refund goes back to the payer's credits (refundEscrow); bank refunds are not built yet
  throw notConnected()
}
