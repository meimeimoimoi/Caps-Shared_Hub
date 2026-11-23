import { DISPUTE_ESCALATION_DAYS, DISPUTE_SLA_DAYS } from '../constants'
import type { Dispute } from '../types'
import { foldVietnamese } from '@/lib/utils'

export type DisputeStatusFilter = 'all' | 'open' | 'escalated' | 'resolved'
export type DisputeSlaFilter = 'all' | 'overdue' | 'dueSoon' | 'onTime'

/** Apply filters before pagination so every loaded case participates in the search. */
export function filterDisputes<
  T extends Dispute & { hoursLeft: number | null },
>(
  rows: T[],
  query: string,
  status: DisputeStatusFilter,
  sla: DisputeSlaFilter,
  kindLabel: (kind: Dispute['kind']) => string
): T[] {
  const search = foldVietnamese(query.trim())
  return rows.filter((row) => {
    const matchesSearch =
      !search ||
      foldVietnamese(
        [
          row.id,
          row.code,
          row.title,
          row.client,
          row.expert,
          row.ground,
          kindLabel(row.kind),
        ]
          .filter(Boolean)
          .join(' ')
      ).includes(search)
    const matchesStatus =
      status === 'all' ||
      (status === 'resolved'
        ? !!row.resolvedAt
        : status === 'escalated'
          ? !row.resolvedAt && !!row.escalatedAt
          : !row.resolvedAt && !row.escalatedAt)
    const matchesSla =
      sla === 'all' ||
      (row.hoursLeft !== null &&
        (sla === 'overdue'
          ? row.hoursLeft <= 0
          : sla === 'dueSoon'
            ? row.hoursLeft > 0 && row.hoursLeft <= 12
            : row.hoursLeft > 12))
    return matchesSearch && matchesStatus && matchesSla
  })
}

/** Decision time of a dispute in hours: the server's deadline when known (working days skip weekends), else the base window */
export const disputeSlaHours = (
  d: Pick<Dispute, 'openedAt' | 'escalatedAt' | 'decideBy'>
) =>
  d.decideBy
    ? Math.round((Date.parse(d.decideBy) - Date.parse(d.openedAt)) / 3_600_000)
    : (DISPUTE_SLA_DAYS + (d.escalatedAt ? DISPUTE_ESCALATION_DAYS : 0)) * 24

/** Số giờ còn lại trước hạn trọng tài (không âm) */
export const disputeHoursLeft = (
  d: Pick<Dispute, 'openedAt' | 'escalatedAt' | 'decideBy'>,
  now: number
) =>
  Math.max(
    0,
    d.decideBy
      ? Math.ceil((new Date(d.decideBy).getTime() - now) / 3_600_000)
      : disputeSlaHours(d) -
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
