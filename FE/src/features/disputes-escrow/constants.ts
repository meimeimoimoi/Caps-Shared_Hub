import { SETTLEMENT_POLICY } from '@/features/review-case/settlement'

/* Quyết định trọng tài khiếu nại: kết quả → tỷ lệ phân chia tiền Escrow */
export const DISPUTE_SLA_HOURS = 48
/** Extra decision time, granted once, when a dispute is escalated to a professional reviewer */
export const DISPUTE_ESCALATION_HOURS = 48
/** Trạng thái hiển thị khi khiếu nại đã có quyết định trọng tài */
export const DISPUTE_RESOLVED = {
  label: 'disputes.resolved',
  tone: 'plain',
} as const
/* Outcome names follow the Dispute Settlement Matrix in business tab 03 */
export const DISPUTE_OUTCOME = {
  RESOLVE_REFUND_USER: {
    label: 'disputes.outcome.RESOLVE_REFUND_USER.label',
    hint: 'disputes.outcome.RESOLVE_REFUND_USER.hint',
    split: 'disputes.outcome.RESOLVE_REFUND_USER.split',
  },
  RESOLVE_PAY_EXPERT: {
    label: 'disputes.outcome.RESOLVE_PAY_EXPERT.label',
    hint: 'disputes.outcome.RESOLVE_PAY_EXPERT.hint',
    split: 'disputes.outcome.RESOLVE_PAY_EXPERT.split',
  },
  RESOLVE_PARTIAL: {
    label: 'disputes.outcome.RESOLVE_PARTIAL.label',
    hint: 'disputes.outcome.RESOLVE_PARTIAL.hint',
    split: 'disputes.outcome.RESOLVE_PARTIAL.split',
  },
} as const
export type DisputeOutcome = keyof typeof DISPUTE_OUTCOME

/* Ma trận chấm dứt hồ sơ: % hoàn Client / Chuyên gia / Nền tảng.
 * Reason names and splits come from the settlement policy shared with the client case page. */
export const TERMINATION_MATRIX = {
  USER_NON_RESPONSE: {
    label: 'escrow.termination.USER_NON_RESPONSE.label',
    short: 'escrow.termination.USER_NON_RESPONSE.short',
    split: SETTLEMENT_POLICY.USER_NON_RESPONSE.split,
  },
  USER_CANCELLED: {
    label: 'escrow.termination.USER_CANCELLED.label',
    short: 'escrow.termination.USER_CANCELLED.short',
    split: SETTLEMENT_POLICY.USER_CANCELLED.split,
  },
  USER_CANCELLED_BEFORE_START: {
    label: 'escrow.termination.USER_CANCELLED_BEFORE_START.label',
    short: 'escrow.termination.USER_CANCELLED_BEFORE_START.short',
    split: SETTLEMENT_POLICY.USER_CANCELLED_BEFORE_START.split,
  },
  EXPERT_ABANDON: {
    label: 'escrow.termination.EXPERT_ABANDON.label',
    short: 'escrow.termination.EXPERT_ABANDON.short',
    split: SETTLEMENT_POLICY.EXPERT_ABANDON.split,
  },
  SYSTEM_ERROR: {
    label: 'escrow.termination.SYSTEM_ERROR.label',
    short: 'escrow.termination.SYSTEM_ERROR.short',
    split: SETTLEMENT_POLICY.SYSTEM_ERROR.split,
  },
  EXPERT_START_TIMEOUT: {
    label: 'escrow.termination.EXPERT_START_TIMEOUT.label',
    short: 'escrow.termination.EXPERT_START_TIMEOUT.short',
    split: SETTLEMENT_POLICY.EXPERT_START_TIMEOUT.split,
  },
} as const
export type TerminationReason = keyof typeof TERMINATION_MATRIX

/* Chữ đứng trước ngày ở cột "Mốc tiếp theo" của Escrow */
export const ESCROW_NEXT_LABEL = {
  DISPUTE_LOCKED: 'escrow.nextLabel.DISPUTE_LOCKED',
  HELD: 'escrow.nextLabel.HELD',
  PAYOUT_SCHEDULED: 'escrow.nextLabel.PAYOUT_SCHEDULED',
  PAID: 'escrow.nextLabel.PAID',
  REFUNDED: 'escrow.nextLabel.REFUNDED',
  PAYOUT_FAILED: 'escrow.nextLabel.PAYOUT_FAILED',
  REFUND_PENDING: 'escrow.nextLabel.REFUND_PENDING',
  REFUND_FAILED: 'escrow.nextLabel.REFUND_FAILED',
} as const
