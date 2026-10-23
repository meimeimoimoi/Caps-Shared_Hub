import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { ShellNotification } from '../NotificationBell'
import { getApplications } from '@/features/expert-vetting/api/adminApi'
import { adminKeys } from '@/features/expert-vetting/api/queryKeys'
import { PENDING_STATUS } from '@/features/expert-vetting/constants'
import { waitedDays } from '@/features/expert-vetting/utils/applications'
import { isOverdue, useReviewSlaDays } from '@/features/expert-vetting/hooks/useReviewSlaDays'
import {
  getDisputes,
  getEscrows,
} from '@/features/disputes-escrow/api/disputesApi'
import { disputesKeys } from '@/features/disputes-escrow/api/queryKeys'
import { disputeHoursLeft } from '@/features/disputes-escrow/utils/disputes'
import { usePricing } from '@/features/service-pricing/hooks/usePricing'
import { hasAnyPermission, Permission, useAuthStore } from '@/features/auth'
import { isExpertDemo } from '@/lib/expert-data-source'

/** Shared staff badges only request APIs the current account can access. */
export function useAdminNav(enabled = true) {
  const { t } = useTranslation('admin')
  const [now] = useState(() => Date.now())
  const user = useAuthStore((s) => s.user)
  const canReview = enabled && hasAnyPermission(user, [Permission.ExpertReview])
  const canViewDemoOperations = enabled && isExpertDemo && hasAnyPermission(user, [Permission.UserManage])
  // Waiting limit comes from the expert policy (System Admin setting), never a constant here
  const slaDays = useReviewSlaDays(canReview)
  const applications = useQuery({
    queryKey: adminKeys.applications(),
    queryFn: ({ signal }) => getApplications(signal),
    enabled: canReview,
  })
  const disputes = useQuery({
    queryKey: disputesKeys.disputes(),
    queryFn: ({ signal }) => getDisputes(signal),
    enabled: canViewDemoOperations,
  })
  const escrows = useQuery({
    queryKey: disputesKeys.escrows(),
    queryFn: ({ signal }) => getEscrows(signal),
    enabled: canViewDemoOperations,
  })
  const pricing = usePricing(canViewDemoOperations)
  const tiers = canViewDemoOperations ? pricing.data?.tiers ?? [] : []

  const pending = (canReview ? applications.data ?? [] : []).filter(
    (a) => a.status === PENDING_STATUS
  )
  const overdue = pending.filter((a) =>
    isOverdue(waitedDays(a.submittedAt, now), slaDays)
  ).length
  const open = (canViewDemoOperations ? disputes.data ?? [] : []).filter((d) => !d.resolvedAt)
  const nearestHours = open.length
    ? Math.min(...open.map((d) => disputeHoursLeft(d, now)))
    : 0
  const payoutFailed = (canViewDemoOperations ? escrows.data ?? [] : []).filter(
    (e) => e.status === 'PAYOUT_FAILED'
  ).length
  const refundFailed = (canViewDemoOperations ? escrows.data ?? [] : []).filter(
    (e) => e.status === 'REFUND_FAILED'
  ).length
  const outsideRange = tiers.reduce((s, tier) => s + tier.outsideRange, 0)

  // Derive notifications from accessible queues, ordered by urgency.
  const notifications: ShellNotification[] = [
    open.length > 0 && {
      id: 'disputes',
      text: t('dashboard.attention.dispute', {
        count: open.length,
        hours: nearestHours,
      }),
      to: '/admin/disputes',
      tone: 'warning' as const,
    },
    payoutFailed > 0 && {
      id: 'payout-failed',
      text: t('dashboard.attention.payoutFailed', { count: payoutFailed }),
      to: '/admin/escrow',
      tone: 'warning' as const,
    },
    refundFailed > 0 && {
      id: 'refund-failed',
      text: t('notifications.refundFailed', { count: refundFailed }),
      to: '/admin/escrow',
      tone: 'warning' as const,
    },
    overdue > 0 && {
      id: 'sla-overdue',
      text: t('dashboard.attention.slaOverdue', {
        count: overdue,
        days: slaDays,
      }),
      to: '/reviewer/gate-1',
      tone: 'warning' as const,
    },
    pending.length > 0 && {
      id: 'pending',
      text: t('notifications.pending', { count: pending.length }),
      to: '/reviewer/gate-1',
    },
    outsideRange > 0 && {
      id: 'outside-range',
      text: t('dashboard.attention.outsideRange', { count: outsideRange }),
      to: '/admin/pricing',
    },
  ].filter((n): n is ShellNotification => !!n)

  return {
    pendingCount: pending.length,
    disputeCount: open.length,
    notifications,
  }
}
