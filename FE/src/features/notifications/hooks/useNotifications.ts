import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/features/auth'
import type { ShellNotification } from '@/components/ui/layout/notification-bell'
import {
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationsRead,
} from '../api/notificationApi'
import type { AppNotification } from '../types'

const notificationsKey = (scope: string) =>
  ['private', scope, 'notifications'] as const

const outcomes = {
  ELIGIBLE: 'notifications.eligibility.ELIGIBLE',
  NEED_MORE_INFORMATION: 'notifications.eligibility.NEED_MORE_INFORMATION',
  NOT_ELIGIBLE: 'notifications.eligibility.NOT_ELIGIBLE',
} as const

const competencyOutcomes = {
  PENDING_FINAL_APPROVAL: 'notifications.competency.PENDING_FINAL_APPROVAL',
  NEED_MORE_INFORMATION: 'notifications.competency.NEED_MORE_INFORMATION',
  FAIL: 'notifications.competency.FAIL',
} as const

/**
 * The signed-in account's notifications for the header bell, rendered as shell items. Polled every
 * minute until real-time push exists; read state lives on the server.
 */
export function useNotifications() {
  const { t } = useTranslation('common')
  const client = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const token = useAuthStore((s) => s.token)
  const key = notificationsKey(userId ?? 'anonymous')
  const query = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => getMyNotifications(signal),
    enabled: Boolean(token && userId),
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    retry: false,
  })
  const refresh = () => client.invalidateQueries({ queryKey: key })
  const markRead = useMutation({
    mutationFn: markNotificationsRead,
    onSettled: refresh,
  })
  const markAllRead = useMutation({
    mutationFn: markAllNotificationsRead,
    onSettled: refresh,
  })

  // Gate 2 result for one service; the link opens that qualification
  const competencyItem = (n: AppNotification): ShellNotification | null => {
    const outcome = n.data.outcome as keyof typeof competencyOutcomes
    if (!(outcome in competencyOutcomes)) return null
    return {
      id: n.id,
      text: t(competencyOutcomes[outcome], {
        service: typeof n.data.serviceName === 'string' ? n.data.serviceName : '',
      }),
      to:
        typeof n.data.link === 'string' ? n.data.link : '/expert/qualifications',
      tone: outcome === 'PENDING_FINAL_APPROVAL' ? undefined : 'warning',
      read: n.readAt != null,
    }
  }

  const toShell = (n: AppNotification): ShellNotification | null => {
    if (n.type === 'EXPERT_COMPETENCY_DECIDED') return competencyItem(n)
    if (n.type !== 'EXPERT_ELIGIBILITY_DECIDED') return null
    const outcome = n.data.outcome as keyof typeof outcomes
    if (!(outcome in outcomes)) return null
    return {
      id: n.id,
      text: t(outcomes[outcome]),
      to: typeof n.data.link === 'string' ? n.data.link : '/expert/application',
      tone: outcome === 'ELIGIBLE' ? undefined : 'warning',
      read: n.readAt != null,
    }
  }

  return {
    notifications: (query.data?.items ?? []).flatMap((n) => toShell(n) ?? []),
    onMarkRead: (ids: string[]) => markRead.mutate(ids),
    onMarkAllRead: () => markAllRead.mutate(),
  }
}
