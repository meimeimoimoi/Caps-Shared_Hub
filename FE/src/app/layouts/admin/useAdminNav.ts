import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { ShellNotification } from '../NotificationBell'
import { getApplications } from '@/features/expert-vetting/api/adminApi'
import { adminKeys } from '@/features/expert-vetting/api/queryKeys'
import { SLA_DAYS, waitedDays } from '@/features/expert-vetting/utils/applications'
import { getDisputes, getEscrows } from '@/features/disputes-escrow/api/disputesApi'
import { disputesKeys } from '@/features/disputes-escrow/api/queryKeys'
import { disputeHoursLeft } from '@/features/disputes-escrow/utils/disputes'
import { usePricing } from '@/features/service-pricing/hooks/usePricing'

/** Badge sidebar + chuông cho System Admin, gom từ nhiều feature; truyền thẳng vào AdminLayout.
 * Chuông là nơi duy nhất báo việc gấp (dashboard không lặp lại). Cùng query key với các màn chi tiết nên dùng chung cache. */
export function useAdminNav() {
  const { t } = useTranslation('admin')
  const [now] = useState(() => Date.now())
  const applications = useQuery({
    queryKey: adminKeys.applications(),
    queryFn: ({ signal }) => getApplications(signal),
  })
  const disputes = useQuery({
    queryKey: disputesKeys.disputes(),
    queryFn: ({ signal }) => getDisputes(signal),
  })
  const escrows = useQuery({
    queryKey: disputesKeys.escrows(),
    queryFn: ({ signal }) => getEscrows(signal),
  })
  const tiers = usePricing().data?.tiers ?? []

  const pending = (applications.data ?? []).filter((a) => a.status === 'CAPABILITY_REVIEW')
  const overdue = pending.filter((a) => waitedDays(a.submittedAt, now) > SLA_DAYS).length
  const open = (disputes.data ?? []).filter((d) => !d.resolvedAt)
  const nearestHours = open.length ? Math.min(...open.map((d) => disputeHoursLeft(d.openedAt, now))) : 0
  const payoutFailed = (escrows.data ?? []).filter((e) => e.status === 'PAYOUT_FAILED').length
  const refundFailed = (escrows.data ?? []).filter((e) => e.status === 'REFUND_FAILED').length
  const outsideRange = tiers.reduce((s, tier) => s + tier.outsideRange, 0)

  // ponytail: thông báo suy ra từ số đếm; thay bằng API thông báo khi BE có
  // Thứ tự theo mức độ: hạn trọng tài và tiền trước, cảnh báo nhẹ sau
  const notifications: ShellNotification[] = [
    open.length > 0 && {
      id: 'disputes',
      text: t('dashboard.attention.dispute', { count: open.length, hours: nearestHours }),
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
      text: t('dashboard.attention.slaOverdue', { count: overdue, days: SLA_DAYS }),
      to: '/admin/experts/pending',
      tone: 'warning' as const,
    },
    pending.length > 0 && {
      id: 'pending',
      text: t('notifications.pending', { count: pending.length }),
      to: '/admin/experts/pending',
    },
    outsideRange > 0 && {
      id: 'outside-range',
      text: t('dashboard.attention.outsideRange', { count: outsideRange }),
      to: '/admin/pricing',
    },
  ].filter((n): n is ShellNotification => !!n)

  return { pendingCount: pending.length, disputeCount: open.length, notifications }
}
