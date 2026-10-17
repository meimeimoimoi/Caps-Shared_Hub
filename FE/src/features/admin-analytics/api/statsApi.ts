import { api } from '@/lib/api-client'
import { isExpertDemo } from '@/lib/expert-data-source'
import type { Granularity, StatPeriod } from '../types'

/* Thống kê theo kỳ cho dashboard System Admin, cũ nhất trước.
 * TODO(api): đối chiếu endpoint với BE khi có Swagger. BE phải gắn partial: true cho kỳ
 * đang chạy, nếu không thẻ so sánh sẽ lấy kỳ dở so với kỳ đủ và luôn báo giảm. */
export async function getAdminStats(
  granularity: Granularity,
  signal?: AbortSignal
): Promise<StatPeriod[]> {
  if (isExpertDemo) {
    return (await import('./fixtures')).mockStats(granularity)
  }
  return api.get<StatPeriod[]>('/api/admin/stats', { params: { granularity }, signal })
}
