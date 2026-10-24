import { useQuery } from '@tanstack/react-query'
import { hasAnyPermission, Permission, useAuthStore } from '@/features/auth'
import { getReviewQueueCounts } from '../api/reviewQueueApi'
import { adminKeys } from '../api/queryKeys'

/**
 * Days a review may wait before it is flagged, from the expert policy (System Admin setting). Undefined
 * until loaded or when the account cannot read the queues: then nothing is flagged rather than a guess.
 */
export function useReviewSlaDays(enabled = true): number | undefined {
  const user = useAuthStore((s) => s.user)
  const scope = hasAnyPermission(user, [Permission.ExpertReview]) ? 'review' : 'approval'
  const canRead = hasAnyPermission(user, [Permission.ExpertReview, Permission.ExpertApprove])
  const { data } = useQuery({
    queryKey: adminKeys.queueCounts(scope),
    queryFn: ({ signal }) => getReviewQueueCounts(scope, signal),
    enabled: enabled && canRead,
  })
  return data?.slaDays
}

/** True when the review has waited longer than the policy allows; never true while the limit is unknown */
export const isOverdue = (waited: number, slaDays: number | undefined) =>
  slaDays !== undefined && waited > slaDays
