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
