/** A linked payout account (billing BankAccountResponse); only the last 4 digits leave the server */
export interface BankAccount {
  id: string
  /** 6-digit NAPAS bank code (VietQR BIN) */
  bankBin: string
  bankName: string
  accountLast4: string
  accountHolderName: string
  /** Payouts go to the default account */
  isDefault: boolean
  /** Set once by staff review; payouts only go to VERIFIED accounts */
  status: 'UNVERIFIED' | 'VERIFIED' | 'REJECTED'
  /** Why staff rejected it, shown to the expert */
  rejectionReason: string | null
  createdAt: string
}

export interface NewBankAccount {
  bankBin: string
  bankName: string
  /** 6–19 digits; spaces and dashes are ignored by the server */
  accountNumber: string
  accountHolderName: string
  isDefault: boolean
}
