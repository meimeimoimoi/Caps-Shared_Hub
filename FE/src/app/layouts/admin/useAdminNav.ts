import { useQuery } from '@tanstack/react-query'
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
  return {
    pendingCount:
      applications.data?.filter((a) => a.status === 'CAPABILITY_REVIEW')
        .length ?? 0,
    disputeCount: disputes.data?.filter((d) => !d.resolvedAt).length ?? 0,
  }
}
