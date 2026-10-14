import { DISPUTE_ESCALATION_HOURS, DISPUTE_SLA_HOURS } from '../constants'
import type { Dispute } from '../types'

/** Decision time of a dispute: 48 hours, plus 48 hours once it is escalated */
export const disputeSlaHours = (d: Pick<Dispute, 'escalatedAt'>) =>
  DISPUTE_SLA_HOURS + (d.escalatedAt ? DISPUTE_ESCALATION_HOURS : 0)

/** Số giờ còn lại trước hạn trọng tài (không âm) */
export const disputeHoursLeft = (
  d: Pick<Dispute, 'openedAt' | 'escalatedAt'>,
  now: number
) =>
  Math.max(
    0,
    disputeSlaHours(d) -
      Math.floor((now - new Date(d.openedAt).getTime()) / 3_600_000)
  )

/** Badge of a dispute row: a USER_NON_RESPONSE challenge leaves the case TERMINATED, so it is not shown as DISPUTED */
export const disputeBadgeKey = (
  d: Pick<Dispute, 'kind' | 'escalatedAt' | 'resolvedAt'>
) =>
  d.resolvedAt
    ? ('disputes.resolved' as const)
    : d.escalatedAt
      ? ('disputes.badge.escalated' as const)
      : d.kind === 'USER_NON_RESPONSE_CHALLENGE'
        ? ('disputes.badge.challenge' as const)
        : ('disputes.badge.open' as const)
