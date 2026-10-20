import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { getAdminStats } from '../api/statsApi'
import type { Granularity } from '../types'

export function useAdminStats(granularity: Granularity) {
  return useQuery({
    queryKey: ['private', 'admin', 'stats', granularity],
    queryFn: ({ signal }) => getAdminStats(granularity, signal),
    // Đổi tháng/quý thì giữ biểu đồ cũ (mờ) tới khi có số mới, không nháy khung trống
    placeholderData: keepPreviousData,
  })
}
