/** The signed-in user's credit wallet (billing WalletResponse); one credit is one VND */
export interface Wallet {
  /** Spendable credits */
  balance: number
  /** Credits held for review cases still in progress */
  held: number
  /** null while the user has never topped up */
  updatedAt: string | null
}

/** TOPUP from the API, HOLD…RESTORE in demo data */
export type LedgerType =
  | 'TOPUP'
  | 'ESCROW_HOLD'
  | 'ESCROW_RELEASE'
  | 'ESCROW_REFUND'
  | 'HOLD'
  | 'CAPTURE'
  | 'RELEASE'
  | 'RESTORE'

/** One wallet movement; amount is negative for debits */
export interface LedgerEntry {
  id: string
  type: LedgerType
  amount: number
  balanceAfter: number
  note: string | null
  at: string
}

export interface LedgerPage {
  items: LedgerEntry[]
  page: number
  pageSize: number
  total: number
}

/** A started top-up (billing TopupResponse); credits arrive only when PayOS confirms the transfer */
export interface Topup {
  paymentId: string
  orderCode: number
  amount: number
  checkoutUrl: string
  /** VietQR payload to draw as a QR code */
  qrCode: string
  expiresAt: string
  /** Receiving account; null when PayOS did not return it (then use the QR code or checkoutUrl) */
  bankBin: string | null
  accountNumber: string | null
  accountName: string | null
  /** Must be kept exactly on a manual transfer: PayOS matches the payment by it */
  transferNote: string | null
}

export interface TopupStatus {
  paymentId: string
  orderCode: number
  amount: number
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED'
  expiresAt: string
  paidAt: string | null
}
