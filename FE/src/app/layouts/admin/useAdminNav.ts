import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { ShellNotification } from '../NotificationBell'
import { getApplications } from '@/features/expert-vetting/api/adminApi'
import { getReviewQueueCounts } from '@/features/expert-vetting/api/reviewQueueApi'
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
import { isMissingEndpoint } from '@/lib/api-client'
import { getUsers } from '@/features/user-management/api/usersApi'
import { usersKeys } from '@/features/user-management/api/queryKeys'

/** Shared staff badges only request APIs the current account can access. */
export function useAdminNav(enabled = true) {
  const { t } = useTranslation('admin')
  const [now] = useState(() => Date.now())
  const user = useAuthStore((s) => s.user)
  const canReview = enabled && hasAnyPermission(user, [Permission.ExpertReview])
  const canApprove = enabled && hasAnyPermission(user, [Permission.ExpertApprove])
  const canViewDemoOperations = enabled && isExpertDemo && hasAnyPermission(user, [Permission.UserManage])
  // Disputes and payouts have no backend yet outside the demo; say so instead of implying all-clear
  const operationsUnavailable = enabled && !isExpertDemo && hasAnyPermission(user, [Permission.UserManage])
  // Waiting limit comes from the expert policy (System Admin setting), never a constant here
  const slaDays = useReviewSlaDays(canReview)
  const applications = useQuery({
    queryKey: adminKeys.applications(),
    queryFn: ({ signal }) => getApplications(signal),
    enabled: canReview,
  })
  // Final approvals past their due time (policy); same cache as the approval queue tabs
  const approvalCounts = useQuery({
    queryKey: adminKeys.queueCounts('approval'),
    queryFn: ({ signal }) => getReviewQueueCounts('approval', signal),
    enabled: canApprove,
  })
  const approvalOverdue = canApprove ? approvalCounts.data?.finalApprovalOverdue ?? 0 : 0
  // The System Admin's own queue: everything waiting for final approval, not only what is overdue
  // The server omits statuses with no files, so a loaded response without the key means zero
  const approvalPending =
    canApprove && approvalCounts.data
      ? (approvalCounts.data.qualifications?.PENDING_FINAL_APPROVAL ?? 0)
      : undefined
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
  // Same cache as the users page; only asks whether the endpoint exists yet
  const users = useQuery({
    queryKey: usersKeys.all,
    queryFn: ({ signal }) => getUsers(signal),
    enabled: enabled && hasAnyPermission(user, [Permission.UserManage]),
    retry: (count, error) => !isMissingEndpoint(error) && count < 2,
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
    approvalOverdue > 0 && {
      id: 'final-approval-overdue',
      text: t('dashboard.attention.finalApprovalOverdue', { count: approvalOverdue }),
      to: '/admin/experts/approvals',
      tone: 'warning' as const,
    },
    approvalOverdue === 0 &&
      !!approvalPending && {
        id: 'final-approval-pending',
        text: t('dashboard.attention.finalApprovalPending', {
          count: approvalPending,
        }),
        to: '/admin/experts/approvals',
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
    approvalOverdueCount: approvalOverdue,
    /** undefined while loading or without permission */
    approvalPendingCount: approvalPending,
    // A failed badge query must not read as an empty queue
    queuesFailed:
      (canReview && applications.isError) ||
      (canApprove && approvalCounts.isError),
    payoutFailedCount: payoutFailed + refundFailed,
    operationsUnavailable,
    usersUnavailable: isMissingEndpoint(users.error),
    notifications,
  }
}
