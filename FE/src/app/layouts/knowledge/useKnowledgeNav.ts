import { REVIEW_SLA_DAYS } from '@/features/knowledgeAdmin-review-approval/constants'
import { useKnowledgeStats } from '@/features/knowledgeAdmin-analytics/hooks/useKnowledgeStats'
import type { ShellNotification } from '../NotificationBell'

/** Sidebar badge and bell notifications for Knowledge Admin; passed straight into KnowledgeLayout.
 * Same cached statistics as the dashboard, so both show the same numbers. */
export function useKnowledgeNav() {
  const { data } = useKnowledgeStats()
  const pipeline = data?.pipeline
  const failed = pipeline ? pipeline.parseFailed + pipeline.indexFailed : 0
  const overdue = (data?.pendingAges ?? [])
    .filter((a) => a.days > REVIEW_SLA_DAYS)
    .reduce((sum, a) => sum + a.count, 0)
  const lastRun = data?.recentRuns[0]
  // Notifications are derived from the counts; the bell is the only place for urgent work: failures first,
  // then overdue reviews, then ordinary work
  const notifications: ShellNotification[] = [
    ...(failed
      ? [
          {
            id: 'failed',
            text: `${failed} văn bản lỗi cần xử lý`,
            to: '/knowledge/queue?stage=failed',
            tone: 'warning' as const,
          },
        ]
      : []),
    ...(lastRun?.status === 'FAILED'
      ? [
          {
            id: 'collect-failed',
            text: 'Lần thu thập gần nhất bị lỗi',
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
    ...(pipeline?.awaitingReview
      ? [
          {
            id: 'pending',
            text: `${pipeline.awaitingReview} văn bản chờ bạn rà soát`,
            to: '/knowledge/queue',
          },
        ]
      : []),
  ]
  return { queueCount: pipeline?.awaitingReview ?? 0, notifications }
}
