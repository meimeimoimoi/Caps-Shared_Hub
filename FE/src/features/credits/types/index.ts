/** Ví Credit (bảng credit_wallet, billing service) */
export interface CreditWallet {
  balance: number
  /** Đang giữ tạm cho câu hỏi AI / lượt xuất chưa xong */
  held: number
}

/** Billing's movements (LedgerEntryType), then the demo's AI credit steps that billing does not record yet. */
export type LedgerEntryType =
  | 'TOPUP'
  | 'ESCROW_HOLD'
  | 'ESCROW_RELEASE'
  | 'ESCROW_REFUND'
  | 'HOLD'
  | 'CAPTURE'
  | 'RELEASE'
  | 'RESTORE'

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

/** A started top-up (billing TopupResponse); credits arrive only when PayOS confirms the transfer */
export interface Topup {
  paymentId: string
  orderCode: number
  amount: number
  checkoutUrl: string
  expiresAt: string
  /** Receiving account; null when PayOS did not return it (then use checkoutUrl) */
  accountNumber: string | null
  accountName: string | null
  /** Must be kept exactly on a manual transfer: PayOS matches the payment by it */
  transferNote: string | null
}

export interface TopupStatus {
  paymentId: string
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED'
  expiresAt: string
}

export interface CreditOverview {
  wallet: CreditWallet
  ledger: CreditLedgerEntry[]
  payments: PaymentTransaction[]
}
