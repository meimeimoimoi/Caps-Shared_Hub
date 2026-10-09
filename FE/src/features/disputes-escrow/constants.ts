/* Quyết định trọng tài khiếu nại: kết quả → tỷ lệ phân chia tiền Escrow */
export const DISPUTE_SLA_HOURS = 48
/** Trạng thái hiển thị khi khiếu nại đã có quyết định trọng tài */
export const DISPUTE_RESOLVED = {
  label: 'disputes.resolved',
  tone: 'plain',
} as const
export const DISPUTE_OUTCOME = {
  UPHELD: {
    label: 'disputes.outcome.UPHELD.label',
    hint: 'disputes.outcome.UPHELD.hint',
    split: 'disputes.outcome.UPHELD.split',
  },
  DISMISSED: {
    label: 'disputes.outcome.DISMISSED.label',
    hint: 'disputes.outcome.DISMISSED.hint',
    split: 'disputes.outcome.DISMISSED.split',
  },
  SETTLED: {
    label: 'disputes.outcome.SETTLED.label',
    hint: 'disputes.outcome.SETTLED.hint',
    split: 'disputes.outcome.SETTLED.split',
  },
} as const
export type DisputeOutcome = keyof typeof DISPUTE_OUTCOME

/* Ma trận chấm dứt hồ sơ: % hoàn Client / Chuyên gia / Nền tảng */
export const TERMINATION_MATRIX = {
  CLIENT_NO_RESPONSE: {
    label: 'escrow.termination.CLIENT_NO_RESPONSE.label',
    short: 'escrow.termination.CLIENT_NO_RESPONSE.short',
    split: [0, 80, 20],
  },
  CLIENT_CANCEL_EARLY: {
    label: 'escrow.termination.CLIENT_CANCEL_EARLY.label',
    short: 'escrow.termination.CLIENT_CANCEL_EARLY.short',
    split: [50, 40, 10],
  },
  EXPERT_OVERDUE: {
    label: 'escrow.termination.EXPERT_OVERDUE.label',
    short: 'escrow.termination.EXPERT_OVERDUE.short',
    split: [100, 0, 0],
  },
  SYSTEM_ERROR: {
    label: 'escrow.termination.SYSTEM_ERROR.label',
    short: 'escrow.termination.SYSTEM_ERROR.short',
    split: [100, 0, 0],
  },
  EXPERT_NOT_STARTED: {
    label: 'escrow.termination.EXPERT_NOT_STARTED.label',
    short: 'escrow.termination.EXPERT_NOT_STARTED.short',
    split: [100, 0, 0],
  },
} as const
export type TerminationReason = keyof typeof TERMINATION_MATRIX

/* Chữ đứng trước ngày ở cột "Mốc tiếp theo" của Escrow */
export const ESCROW_NEXT_LABEL = {
  DISPUTE_LOCKED: 'escrow.nextLabel.DISPUTE_LOCKED',
  HELD: 'escrow.nextLabel.HELD',
  PAID: 'escrow.nextLabel.PAID',
  REFUNDED: 'escrow.nextLabel.REFUNDED',
  PAYOUT_FAILED: 'escrow.nextLabel.PAYOUT_FAILED',
  REFUND_PENDING: 'escrow.nextLabel.REFUND_PENDING',
  REFUND_FAILED: 'escrow.nextLabel.REFUND_FAILED',
} as const
