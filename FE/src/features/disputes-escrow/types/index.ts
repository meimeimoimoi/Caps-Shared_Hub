import type { ESCROW_STATUS } from '@/lib/constants'
import type { HistoryEntry } from '@/features/expert-vetting/types'
import type { DisputeOutcome, TerminationReason } from '../constants'

export interface Escrow {
  caseId: string
  client: string
  expert: string
  amount: number // VND
  status: keyof typeof ESCROW_STATUS
  /** Chỉ có khi hoàn tiền do chấm dứt hồ sơ */
  termination?: TerminationReason
  /** Hạn quyết định / tự xác nhận, hoặc ngày hoàn tất */
  nextAt: string
  /** Lúc Client thanh toán vào Escrow */
  paidAt: string
  /** Mã giao dịch PayOS, dùng để đối soát */
  payosRef: string
  /** Tài khoản nhận chi trả của chuyên gia, đã che số */
  payoutAccount: string
  /** Tài khoản nhận hoàn của Client (đã che số); chỉ có với khoản phải hoàn */
  refundAccount?: string
  /** Mã giao dịch ngân hàng của lần hoàn, nhập khi đánh dấu đã hoàn */
  refundRef?: string
  /** Chỉ có khi PAYOUT_FAILED / REFUND_FAILED. retryable = false: thử lại vô ích tới khi sửa thông tin nhận tiền */
  failure?: { reason: string; retryable: boolean }
  history: HistoryEntry[]
}

export interface DisputeDecisionInput {
  outcome: DisputeOutcome
  reason: string
}

/** Một đoạn văn bản bằng chứng; `change` là phần bị xóa (bản nháp) hoặc được thêm (bản sửa) */
export interface EvidenceExcerpt {
  label: string
  text: string
  change: string
}

/** DELIVERY_ISSUE: the case is DISPUTED. USER_NON_RESPONSE_CHALLENGE: the case stays TERMINATED. */
export type DisputeKind = 'DELIVERY_ISSUE' | 'USER_NON_RESPONSE_CHALLENGE'

export interface Dispute {
  id: string // mã hồ sơ rà soát đang tranh chấp
  kind: DisputeKind
  title: string
  client: string
  expert: string
  /** Căn cứ khiếu nại của Client */
  ground: string
  openedAt: string
  /** Set once when escalated to a professional reviewer; extends the deadline by 48 hours */
  escalatedAt?: string
  /** Có giá trị = đã ra quyết định trọng tài */
  resolvedAt?: string
  /** Draft versus revision excerpts; a USER_NON_RESPONSE challenge has none */
  evidence?: {
    draft: EvidenceExcerpt
    revision: EvidenceExcerpt
    note: string
  }
  complaint: {
    issue: string
    description: string
    attachment: string
  }
  history: HistoryEntry[]
}
