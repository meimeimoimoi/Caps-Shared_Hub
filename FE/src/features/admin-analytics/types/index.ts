export type Granularity = 'month' | 'quarter'

/** Số liệu một kỳ (tháng hoặc quý). Tiền tính bằng VND. */
export interface StatPeriod {
  /** Ngày đầu kỳ, dạng YYYY-MM-DD */
  start: string
  /** Quý 1-4; chỉ có khi granularity = 'quarter' */
  quarter?: number
  /** Kỳ đang diễn ra (chưa chốt): không dùng để so sánh tăng/giảm */
  partial?: boolean
  /** Phần chi trả cho chuyên gia (80% sau hoàn tiền) */
  expertPayout: number
  /** Phí nền tảng giữ lại (20% sau hoàn tiền) */
  platformFee: number
  refunds: number
  newClients: number
  newExperts: number
  /** Tổng tài khoản tại cuối kỳ */
  totalUsers: number
}
