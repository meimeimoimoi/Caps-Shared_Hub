import { useQuery } from '@tanstack/react-query'
import type { ShellNotification } from '../NotificationBell'
import { getApplications } from '@/features/expert-vetting/api/adminApi'
import { adminKeys } from '@/features/expert-vetting/api/queryKeys'
import { getDisputes } from '@/features/disputes-escrow/api/disputesApi'
import { disputesKeys } from '@/features/disputes-escrow/api/queryKeys'

/** Số đếm cho badge sidebar admin, gom từ nhiều feature; truyền thẳng vào AdminLayout */
export function useAdminNav() {
  const applications = useQuery({
    queryKey: adminKeys.applications(),
    queryFn: ({ signal }) => getApplications(signal),
  })
  const disputes = useQuery({
    queryKey: disputesKeys.disputes(),
    queryFn: ({ signal }) => getDisputes(signal),
  })
  const pendingCount =
    applications.data?.filter((a) => a.status === 'CAPABILITY_REVIEW').length ??
    0
  const disputeCount = disputes.data?.filter((d) => !d.resolvedAt).length ?? 0
  // ponytail: thông báo suy ra từ số đếm; thay bằng API thông báo khi BE có
  const notifications: ShellNotification[] = [
    ...(disputeCount
      ? [{ id: 'disputes', text: `${disputeCount} khiếu nại đang chờ quyết định trọng tài`, to: '/admin/disputes', tone: 'warning' as const }]
      : []),
    ...(pendingCount
      ? [{ id: 'pending', text: `${pendingCount} hồ sơ Expert chờ đánh giá năng lực`, to: '/admin/experts/pending' }]
      : []),
  ]
  return { pendingCount, disputeCount, notifications }
}
