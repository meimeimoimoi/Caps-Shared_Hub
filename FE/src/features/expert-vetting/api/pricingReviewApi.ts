import { api } from '@/lib/api-client'

interface Envelope<T> {
  success: boolean
  data: T
  message?: string
}

export type PricingReviewStatus =
  'PENDING_APPROVAL' | 'RETURN_FOR_REVISION' | 'REJECTED'
export type PricingDecision = 'APPROVE' | 'RETURN_FOR_REVISION' | 'REJECT'

/** A price change above the auto-approval threshold */
export interface PricingReviewItem {
  id: string
  qualificationId: string
  expertUserId: string
  displayName: string | null
  serviceCode: string
  sequence: number
  amount: number
  /** The approved price the change is measured against */
  currentAmount: number | null
  changePercent: number | null
  effectiveFrom: string
  reason: string | null
  status: PricingReviewStatus
  submittedAt: string | null
  decisionNote: string | null
}

const BASE = '/api/v1/admin/experts/pricing'

/** Price changes in the given statuses */
export async function getPricingReviews(
  statuses: readonly PricingReviewStatus[],
  signal?: AbortSignal
) {
  const lists = await Promise.all(
    statuses.map((status) =>
      api.get<Envelope<PricingReviewItem[]>>(BASE, {
        params: { status },
        signal,
      })
    )
  )
  return lists.flatMap((l) => l.data)
}

/** APPROVE, RETURN_FOR_REVISION or REJECT (note required unless approving) */
export async function decidePricing(
  id: string,
  decision: PricingDecision,
  note: string
) {
  await api.post(`${BASE}/${id}/decision`, {
    decision,
    note: note.trim() || null,
  })
}
