import type { ESCROW_STATUS } from '@/lib/constants'

/* Quyết định trọng tài khiếu nại: kết quả → tỷ lệ phân chia tiền Escrow */
export const DISPUTE_SLA_HOURS = 48
export const DISPUTE_OUTCOME = {
  UPHELD: {
    label: 'Chấp thuận khiếu nại',
    hint: 'Chuyên gia vi phạm nghĩa vụ hoặc quy trình',
    split: 'Hoàn Client 100% · Chuyên gia 0% · Nền tảng 0%',
  },
  DISMISSED: {
    label: 'Bác khiếu nại',
    hint: 'Chuyên gia làm đúng, đủ trách nhiệm',
    split: 'Hoàn Client 0% · Chuyên gia 80% · Nền tảng 20%',
  },
  SETTLED: {
    label: 'Hòa giải',
    hint: 'Có thiếu sót một phần từ cả hai phía',
    split: 'Hoàn Client 50% · Chuyên gia 40% · Nền tảng 10%',
  },
}
export type DisputeOutcome = keyof typeof DISPUTE_OUTCOME

/* Ma trận chấm dứt hồ sơ: % hoàn Client / Chuyên gia / Nền tảng */
export const TERMINATION_MATRIX = {
  CLIENT_NO_RESPONSE: { label: 'Client không phản hồi 72 giờ', short: 'Client không phản hồi', split: [0, 80, 20] },
  CLIENT_CANCEL_EARLY: { label: 'Client hủy sớm khi đang rà soát', short: 'Hủy sớm', split: [50, 40, 10] },
  EXPERT_OVERDUE: { label: 'Chuyên gia bỏ dở quá hạn bàn giao', short: 'Chuyên gia quá hạn', split: [100, 0, 0] },
  SYSTEM_ERROR: { label: 'Lỗi hệ thống', short: 'Lỗi hệ thống', split: [100, 0, 0] },
  EXPERT_NOT_STARTED: { label: 'Chuyên gia quá 24 giờ chưa bắt đầu', short: 'Chuyên gia chưa bắt đầu', split: [100, 0, 0] },
} as const
export type TerminationReason = keyof typeof TERMINATION_MATRIX

/* Chữ đứng trước ngày ở cột "Mốc tiếp theo" của Escrow */
export const ESCROW_NEXT_LABEL: Partial<Record<keyof typeof ESCROW_STATUS, string>> = {
  DISPUTE_LOCKED: 'quyết định trước',
  HELD: 'tự xác nhận',
}
