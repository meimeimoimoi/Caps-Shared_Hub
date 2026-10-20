/** Ví Credit (bảng credit_wallet, billing service) */
export interface CreditWallet {
  balance: number
  /** Đang giữ tạm cho câu hỏi AI / lượt xuất chưa xong */
  held: number
}

/* MOCK: BE chưa chốt enum credit_ledger_entry_type (xem SHFT_PostgreSQL.sql mục 8).
 * Các loại dưới đây chỉ để dựng giao diện; đổi theo BE khi có đặc tả. */
export type LedgerEntryType = 'TOP_UP' | 'AI_QUESTION' | 'EXPORT' | 'REFUND'

export interface CreditLedgerEntry {
  id: string
  entryType: LedgerEntryType
  /** Số Credit, âm là trừ */
  amount: number
  balanceAfter: number
  note?: string
  createdAt: string
}

/** Giao dịch thanh toán qua PayOS (bảng payment_transaction) */
export interface PaymentTransaction {
  id: string
  purpose: 'CREDIT_TOP_UP' | 'REVIEW_FEE'
  /** VND */
  amount: number
  orderCode: string
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED'
  createdAt: string
}

export interface CreditOverview {
  wallet: CreditWallet
  ledger: CreditLedgerEntry[]
  payments: PaymentTransaction[]
}
