import { useQuery } from '@tanstack/react-query'
import { getPipelineSummary } from '@/features/knowledgeAdmin-review-approval/api/knowledgeApi'
import { knowledgeKeys } from '@/features/knowledgeAdmin-review-approval/api/queryKeys'
import type { ShellNotification } from '../NotificationBell'

/** Badge sidebar + thông báo chuông cho Knowledge Admin; truyền thẳng vào KnowledgeLayout */
export function useKnowledgeNav() {
  const { data } = useQuery({
    queryKey: knowledgeKeys.summary(),
    queryFn: ({ signal }) => getPipelineSummary(signal),
  })
  // ponytail: thông báo suy ra từ số đếm; thay bằng API thông báo khi BE có
  const notifications: ShellNotification[] = [
    ...(data && data.indexFailed + data.parseFailed
      ? [{ id: 'failed', text: `${data.indexFailed + data.parseFailed} văn bản lỗi cần xử lý`, to: '/knowledge/queue?stage=failed', tone: 'warning' as const }]
      : []),
    ...(data?.pending
      ? [{ id: 'pending', text: `${data.pending} văn bản chờ bạn rà soát`, to: '/knowledge/queue' }]
      : []),
  ]
  return { queueCount: data?.pending ?? 0, notifications }
}
