import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  getDocuments,
  getPipelineSummary,
} from '@/features/knowledgeAdmin-review-approval/api/knowledgeApi'
import { REVIEW_SLA_DAYS } from '@/features/knowledgeAdmin-review-approval/constants'
import { useCollection } from '@/features/knowledgeAdmin-sources/hooks/useCollection'
import { knowledgeKeys } from '@/features/knowledgeAdmin-review-approval/api/queryKeys'
import type { ShellNotification } from '../NotificationBell'

/** Badge sidebar + thông báo chuông cho Knowledge Admin; truyền thẳng vào KnowledgeLayout */
export function useKnowledgeNav() {
  const { data } = useQuery({
    queryKey: knowledgeKeys.summary(),
    queryFn: ({ signal }) => getPipelineSummary(signal),
  })
  // Cùng cache với hàng đợi và Nguồn thu thập nên không gọi thêm API khi đã mở các màn đó
  const review = useQuery({
    queryKey: knowledgeKeys.documents('review'),
    queryFn: ({ signal }) => getDocuments('review', signal),
  })
  const schedule = useCollection().data?.schedule
  const [now] = useState(() => Date.now())
  // Cùng cách tính với dashboard (số ngày làm tròn xuống) để hai nơi ra cùng một số
  const overdue = (review.data ?? []).filter(
    (d) =>
      Math.floor((now - new Date(d.queuedAt).getTime()) / 86_400_000) >
      REVIEW_SLA_DAYS
  ).length
  // ponytail: thông báo suy ra từ số đếm; thay bằng API thông báo khi BE có
  // Chuông là nơi duy nhất báo việc gấp (dashboard không lặp lại): lỗi trước, quá hạn sau, việc thường cuối
  const notifications: ShellNotification[] = [
    ...(data && data.indexFailed + data.parseFailed
      ? [
          {
            id: 'failed',
            text: `${data.indexFailed + data.parseFailed} văn bản lỗi cần xử lý`,
            to: '/knowledge/queue?stage=failed',
            tone: 'warning' as const,
          },
        ]
      : []),
    ...(schedule && !schedule.lastRunOk
      ? [
          {
            id: 'collect-failed',
            text: 'Lần thu thập định kỳ gần nhất bị lỗi',
            to: '/knowledge/sources',
            tone: 'warning' as const,
          },
        ]
      : []),
    ...(overdue
      ? [
          {
            id: 'overdue',
            text: `${overdue} văn bản chờ rà soát quá ${REVIEW_SLA_DAYS} ngày`,
            to: '/knowledge/queue?stage=review',
            tone: 'warning' as const,
          },
        ]
      : []),
    ...(data?.pending
      ? [
          {
            id: 'pending',
            text: `${data.pending} văn bản chờ bạn rà soát`,
            to: '/knowledge/queue',
          },
        ]
      : []),
  ]
  return { queueCount: data?.pending ?? 0, notifications }
}
