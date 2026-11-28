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

const accessChanges = {
  APPROVED: 'notifications.serviceAccess.APPROVED',
  RETURNED_FOR_REVIEW: 'notifications.serviceAccess.RETURNED_FOR_REVIEW',
  SUSPENDED: 'notifications.serviceAccess.SUSPENDED',
  REINSTATED: 'notifications.serviceAccess.REINSTATED',
} as const

// One bell line per review case step; IN_REVIEW reads differently for the client and the expert
const caseSteps = {
  accepted: 'notifications.reviewCase.status.accepted',
  answered: 'notifications.reviewCase.status.answered',
  EXPERT_DECLINED: 'notifications.reviewCase.status.EXPERT_DECLINED',
  expertWithdrew: 'notifications.reviewCase.status.expertWithdrew',
  EXPERT_TIMEOUT: 'notifications.reviewCase.status.EXPERT_TIMEOUT',
  AWAITING_ACCEPTANCE: 'notifications.reviewCase.status.AWAITING_ACCEPTANCE',
  COMPLETED: 'notifications.reviewCase.status.COMPLETED',
  AUTO_CONFIRMED: 'notifications.reviewCase.status.AUTO_CONFIRMED',
  DELIVERY_OVERDUE: 'notifications.reviewCase.status.DELIVERY_OVERDUE',
  DISPUTED: 'notifications.reviewCase.status.DISPUTED',
  RESOLVED: 'notifications.reviewCase.status.RESOLVED',
  TERMINATED: 'notifications.reviewCase.status.TERMINATED',
  WITHDRAWN: 'notifications.reviewCase.status.WITHDRAWN',
  withdrawnClient: 'notifications.reviewCase.status.withdrawnClient',
} as const

const warningSteps = new Set([
  'EXPERT_DECLINED',
  'expertWithdrew',
  'EXPERT_TIMEOUT',
  'DELIVERY_OVERDUE',
  'DISPUTED',
  'TERMINATED',
])

/**
 * The signed-in account's notifications for the header bell, rendered as shell items. New ones arrive
 * through NotificationStream (SignalR); polling every minute is the fallback. Read state lives on the server.
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

  // Final approval, return for review, suspension or reinstatement of one service
  const payoutChanges = {
    RECORDED: 'notifications.payout.RECORDED',
    SUCCEEDED: 'notifications.payout.SUCCEEDED',
    FAILED: 'notifications.payout.FAILED',
    ACCOUNT_NEEDED: 'notifications.payout.ACCOUNT_NEEDED',
    ACCOUNT_MISSING: 'notifications.payout.ACCOUNT_MISSING',
    HELD: 'notifications.payout.HELD',
    RELEASED: 'notifications.payout.RELEASED',
  } as const

  const accessItem = (n: AppNotification): ShellNotification | null => {
    const change = n.data.change as keyof typeof accessChanges
    if (!(change in accessChanges)) return null
    return {
      id: n.id,
      text: t(accessChanges[change], {
        service: typeof n.data.serviceName === 'string' ? n.data.serviceName : '',
      }),
      to:
        typeof n.data.link === 'string' ? n.data.link : '/expert/qualifications',
      tone:
        change === 'APPROVED' || change === 'REINSTATED' ? undefined : 'warning',
      read: n.readAt != null,
    }
  }

  // A review case moved on: the text comes from the new status
  const caseStepItem = (n: AppNotification): ShellNotification | null => {
    const step =
      n.data.toStatus === 'IN_REVIEW'
        ? n.data.fromStatus === 'AWAITING_USER_INFORMATION'
          ? 'answered'
          : 'accepted'
        : n.data.note === 'EXPERT_WITHDREW'
          ? 'expertWithdrew'
          : // The client gets their own copy of a withdrawal (their link is /cases/…, the expert's /expert/cases/…)
            n.data.toStatus === 'WITHDRAWN' &&
              typeof n.data.link === 'string' &&
              n.data.link.startsWith('/cases/')
            ? 'withdrawnClient'
            : (n.data.toStatus as keyof typeof caseSteps)
    if (!(step in caseSteps)) return null
    return {
      id: n.id,
      text: t(caseSteps[step]),
      to: typeof n.data.link === 'string' ? n.data.link : '/cases',
      tone: warningSteps.has(step) ? 'warning' : undefined,
      read: n.readAt != null,
    }
  }

  const toShell = (n: AppNotification): ShellNotification | null => {
    // The admin took the one extension: the decision is now due later
    if (n.type === 'REVIEW_CASE_DISPUTE_EXTENDED')
      return {
        id: n.id,
        text: t('notifications.reviewCase.disputeExtended', {
          at:
            typeof n.data.decideBy === 'string'
              ? new Date(n.data.decideBy).toLocaleString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })
              : '',
        }),
        to: typeof n.data.link === 'string' ? n.data.link : '/cases',
        read: n.readAt != null,
      }
    // The admin has not decided a dispute by its deadline; the fee stays held
    if (n.type === 'REVIEW_CASE_DISPUTE_OVERDUE')
      return {
        id: n.id,
        text: t('notifications.reviewCase.disputeOverdue'),
        to: typeof n.data.link === 'string' ? n.data.link : '/cases',
        tone: 'warning',
        read: n.readAt != null,
      }
    // A case counted against the expert; points by kind as in ViolationRules (late 1, withdrew 2, never delivered 3)
    if (n.type === 'EXPERT_VIOLATION_RECORDED') {
      const kind = n.data.kind === 'WITHDREW' || n.data.kind === 'NO_DELIVERY' ? n.data.kind : 'LATE'
      return {
        id: n.id,
        text: t(`notifications.violation.${kind}`),
        to: typeof n.data.link === 'string' ? n.data.link : '/expert/availability',
        tone: 'warning',
        read: n.readAt != null,
      }
    }
    // The expert's dispute statement window ends in a few hours
    if (n.type === 'REVIEW_CASE_STATEMENT_DUE')
      return {
        id: n.id,
        text: t('notifications.reviewCase.statementDue'),
        to: typeof n.data.link === 'string' ? n.data.link : '/expert/cases',
        tone: 'warning',
        read: n.readAt != null,
      }
    if (
      n.type === 'REVIEW_CASE_REQUESTED' ||
      n.type === 'REVIEW_CASE_RESPONSE_DUE'
    )
      return {
        id: n.id,
        text: t(
          n.type === 'REVIEW_CASE_REQUESTED'
            ? 'notifications.reviewCase.requested'
            : 'notifications.reviewCase.responseDue',
        ),
        to: typeof n.data.link === 'string' ? n.data.link : '/expert/cases',
        tone: n.type === 'REVIEW_CASE_RESPONSE_DUE' ? 'warning' : undefined,
        read: n.readAt != null,
      }
    if (n.type === 'REVIEW_CASE_STATUS_CHANGED') return caseStepItem(n)
    // The expert asked for more working days (client), or the client answered (expert)
    if (
      n.type === 'REVIEW_CASE_EXTENSION_REQUESTED' ||
      n.type === 'REVIEW_CASE_EXTENSION_DECIDED'
    ) {
      const days = typeof n.data.days === 'number' ? n.data.days : 0
      const requested = n.type === 'REVIEW_CASE_EXTENSION_REQUESTED'
      return {
        id: n.id,
        text: t(
          requested
            ? 'notifications.reviewCase.extensionRequested'
            : n.data.accepted === true
              ? 'notifications.reviewCase.extensionAccepted'
              : 'notifications.reviewCase.extensionDeclined',
          { days }
        ),
        to:
          typeof n.data.link === 'string'
            ? n.data.link
            : requested
              ? '/cases'
              : '/expert/cases',
        tone: requested || n.data.accepted !== true ? 'warning' : undefined,
        read: n.readAt != null,
      }
    }
    if (
      n.type === 'REVIEW_CASE_INFO_REQUESTED' ||
      n.type === 'REVIEW_CASE_ACCEPTANCE_DUE'
    )
      return {
        id: n.id,
        text: t(
          n.type === 'REVIEW_CASE_INFO_REQUESTED'
            ? 'notifications.reviewCase.infoRequested'
            : 'notifications.reviewCase.acceptanceDue'
        ),
        to: typeof n.data.link === 'string' ? n.data.link : '/cases',
        tone: 'warning',
        read: n.readAt != null,
      }
    if (n.type === 'EXPERT_COMPETENCY_DECIDED') return competencyItem(n)
    if (n.type === 'EXPERT_SERVICE_ACCESS_CHANGED') return accessItem(n)
    if (n.type === 'EXPERT_BANK_ACCOUNT_REJECTED')
      return {
        id: n.id,
        text: t('notifications.bankAccountRejected', {
          account: `${String(n.data.bankName ?? '')} •••• ${String(n.data.accountLast4 ?? '')}`,
          reason: typeof n.data.reason === 'string' ? n.data.reason : '',
        }),
        to: typeof n.data.link === 'string' ? n.data.link : '/expert/income',
        tone: 'warning',
        read: n.readAt != null,
      }
    if (n.type === 'EXPERT_PAYOUT_NOTICE') {
      const change = n.data.change as keyof typeof payoutChanges
      if (!(change in payoutChanges)) return null
      return {
        id: n.id,
        text: t(payoutChanges[change], {
          amount: Number(n.data.amount).toLocaleString('vi-VN'),
          date:
            typeof n.data.transferableFrom === 'string'
              ? new Date(n.data.transferableFrom).toLocaleDateString('vi-VN', {
                  timeZone: 'Asia/Ho_Chi_Minh',
                })
              : '',
        }),
        to: typeof n.data.link === 'string' ? n.data.link : '/expert/income',
        tone: change === 'RECORDED' || change === 'SUCCEEDED' ? undefined : 'warning',
        read: n.readAt != null,
      }
    }
    if (n.type === 'EXPERT_PRICE_OUT_OF_RANGE')
      return {
        id: n.id,
        text: t('notifications.priceOutOfRange', {
          service: typeof n.data.serviceName === 'string' ? n.data.serviceName : '',
          min: Number(n.data.minFee).toLocaleString('vi-VN'),
          max: Number(n.data.maxFee).toLocaleString('vi-VN'),
        }),
        to: typeof n.data.link === 'string' ? n.data.link : '/expert/services',
        tone: 'warning',
        read: n.readAt != null,
      }
    if (
      n.type === 'PLATFORM_FEE_CHANGE_ANNOUNCED' ||
      n.type === 'PLATFORM_FEE_CHANGE_CANCELLED'
    ) {
      const announced = n.type === 'PLATFORM_FEE_CHANGE_ANNOUNCED'
      return {
        id: n.id,
        text: t(
          announced
            ? 'notifications.platformFee.announced'
            : 'notifications.platformFee.cancelled',
          {
            service: typeof n.data.serviceName === 'string' ? n.data.serviceName : '',
            from: n.data.currentPercent,
            to: n.data.newPercent,
            // The effective day starts at 00:00 Vietnam time, stored in UTC
            date:
              typeof n.data.effectiveFrom === 'string'
                ? new Date(n.data.effectiveFrom).toLocaleDateString('vi-VN', {
                    timeZone: 'Asia/Ho_Chi_Minh',
                  })
                : '',
          }
        ),
        to: typeof n.data.link === 'string' ? n.data.link : '/expert/services',
        tone: announced ? 'warning' : undefined,
        read: n.readAt != null,
      }
    }
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
