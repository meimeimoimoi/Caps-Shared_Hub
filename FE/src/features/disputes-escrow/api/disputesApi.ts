import { api } from '@/lib/api-client'
import { isExpertDemo } from '@/lib/expert-data-source'
import { CURRENT_ADMIN } from '@/features/expert-vetting/constants'
import { i18n } from '@/lib/i18n'
import { DISPUTE_OUTCOME } from '../constants'
import type { Dispute, DisputeDecisionInput, Escrow } from '../types'

/* Dev chạy demo thì đọc fixtures (bản sao để React Query thấy dữ liệu mới);
 * mutation demo sửa thẳng fixtures để lần refetch sau thấy thay đổi.
 * TODO(api): đối chiếu lại đường dẫn endpoint với BE khi có Swagger. */
const fixtures = () => import('./fixtures')
const BASE = '/api/admin'

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

/* ── Escrow ── */
export async function getEscrows(signal?: AbortSignal) {
  if (isExpertDemo) return structuredClone((await fixtures()).mockEscrows)
  return api.get<Escrow[]>(`${BASE}/escrows`, { signal })
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
  await api.post(`${BASE}/escrows/${caseId}/payout/retry`)
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
  await api.post(`${BASE}/escrows/${caseId}/refund/confirm`, { ref })
}
