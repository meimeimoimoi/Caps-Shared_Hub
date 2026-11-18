import type { Escrow } from '../types/index.ts'

/** An escrow as billing returns it (EscrowResponse) */
export interface EscrowDto {
  id: string
  reviewCaseId: string
  userId: string
  amount: number
  status: string
  createdAt: string
  updatedAt: string
}

// Released credits wait in a PENDING payout, so they read as a scheduled payout here.
// Unknown states never map to HELD, the only state that offers release and refund.
const STATUS: Record<string, Escrow['status']> = {
  HELD: 'HELD',
  RELEASED: 'PAYOUT_SCHEDULED',
  REFUNDED: 'REFUNDED',
}

/** Billing knows the payer by id only, not the expert or the PayOS order: those cells show a dash */
export function toEscrow(e: EscrowDto): Escrow {
  return {
    caseId: e.reviewCaseId,
    client: e.userId,
    expert: '—',
    amount: e.amount,
    status: STATUS[e.status] ?? 'PAYOUT_SCHEDULED',
    nextAt: e.updatedAt,
    paidAt: e.createdAt,
    payosRef: '—',
    payoutAccount: '—',
    history: [],
  }
}

/** Billing's split on release: the fee is rounded down, the expert gets the rest */
export function releaseSplit(amount: number, platformFeePct: number) {
  const fee = Math.floor((amount * platformFeePct) / 100)
  return { fee, expert: amount - fee }
}
