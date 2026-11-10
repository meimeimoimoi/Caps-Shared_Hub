export type Granularity = 'month' | 'quarter'

/** Figures for one period (month or quarter). Money is in VND. */
export interface StatPeriod {
  /** First day of the period, YYYY-MM-DD */
  start: string
  /** Quarter 1-4; only when granularity = 'quarter' */
  quarter?: number
  /** Period still running: never used for up/down comparisons */
  partial?: boolean
  /** Paid to experts from released escrows */
  expertPayout: number
  /** Platform fee kept from released escrows */
  platformFee: number
  refunds: number
  /** Verified accounts created in the period */
  newUsers: number
  /** Verified accounts at the end of the period */
  totalUsers: number
}

/** Count and total VND of the records in one status */
export interface StatusTotal {
  status: string
  count: number
  amount: number
}

/** GET /api/v1/admin/users/stats */
export interface UserStats {
  periods: { start: string; partial: boolean; newUsers: number; totalUsers: number }[]
}

/** GET /api/v1/admin/billing/stats */
export interface BillingStats {
  periods: {
    start: string
    partial: boolean
    expertPayout: number
    platformFee: number
    refunds: number
  }[]
  escrows: StatusTotal[]
  payouts: StatusTotal[]
}

/** GET /api/v1/admin/experts/stats */
export interface ExpertStats {
  periods: { start: string; partial: boolean; newExperts: number }[]
  servingExperts: number
  suspendedExperts: number
}
