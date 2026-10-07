import { useTranslation } from 'react-i18next'
import { useFormatters } from '@/hooks/useFormatters'
import type { ParseKeys } from 'i18next'
import type { WorkStatus, ActivityType } from '../types'
import { isExpertDemo } from '@/lib/expert-data-source'

export const workStatusKeys = {
  PENDING_EXPERT_RESPONSE: 'responseNeeded',
  PAYMENT_CONFIRMED: 'readyToStart',
  IN_REVIEW: 'inReview',
  AWAITING_USER_INFORMATION: 'waitingForInformation',
  AWAITING_ACCEPTANCE: 'awaitingAcceptance',
  DISPUTED: 'disputeResponse',
} as const satisfies Record<WorkStatus, ParseKeys<'expert'>>
const activityKeys = {
  case_created: 'newCase',
  case_completed: 'caseCompleted',
  payment_received: 'paymentReceived',
  review_submitted: 'reviewSubmitted',
  status_changed: 'statusChanged',
  deadline_extended: 'deadlineExtended',
  dispute_opened: 'disputeOpened',
  pricing_approved: 'pricingApproved',
} as const satisfies Record<ActivityType, ParseKeys<'expert'>>
const qualificationKeys = {
  APPROVED_FOR_SERVICE: 'approvedForService',
  PENDING_APPROVAL: 'pendingApproval',
  NOT_ELIGIBLE: 'notEligible',
} as const
const serviceKeys = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  PENDING: 'pending',
} as const
const deadlineKeys = {
  'Delivery due': 'deliveryDue',
  'Expert response due': 'expertResponseDue',
  'Review start due': 'reviewStartDue',
  'User information due': 'userInformationDue',
  'User acceptance due': 'userAcceptanceDue',
} as const
const actionKeys = {
  'Review request': 'reviewRequest',
  'Start review': 'startReview',
  'Wait for user response': 'waitForUserResponse',
  'Open case': 'openCase',
} as const
const demoCopyKeys = {
  'The read projection is delayed. These are the last available values.':
    'demoProjectionDelayed',
  'Work queue is temporarily unavailable. Counts and service readiness are still available.':
    'demoQueueUnavailable',
  'Server totals across all active cases; closed cases excluded. Paused delivery SLAs are excluded from overdue.':
    'demoCountsDefinition',
  'Illustrative daily history · demo data': 'demoHistorySource',
  'Availability is off for this service. Existing cases remain accessible.':
    'demoAvailabilityOff',
  'Service qualification is awaiting approval.': 'demoQualificationPending',
  'This account does not have access to the operational Expert Portal.':
    'demoAccessDenied',
} as const
function ownKey<T extends Record<string, ParseKeys<'expert'>>>(
  map: T,
  value: string
) {
  return Object.hasOwn(map, value) ? map[value as keyof T] : undefined
}

/** Presentation only: identifiers, fixtures, query keys and payloads stay unchanged. */
export function useExpertPresentation() {
  const { t } = useTranslation('expert')
  const format = useFormatters()
  const translate = (
    map: Record<string, ParseKeys<'expert'>>,
    value: string
  ) => {
    const key = ownKey(map, value)
    return key ? t(key) : value
  }
  return {
    ...format,
    relativeTime: (timestamp: string) => {
      const elapsed = Date.now() - Date.parse(timestamp)
      if (!Number.isFinite(elapsed)) return '—'
      const absolute = Math.abs(elapsed)
      if (absolute < 60_000) return t('justNow')
      if (absolute < 3_600_000)
        return format.relativeTime(-Math.floor(elapsed / 60_000), 'minute')
      if (absolute < 86_400_000)
        return format.relativeTime(-Math.floor(elapsed / 3_600_000), 'hour')
      return format.relativeTime(-Math.floor(elapsed / 86_400_000), 'day')
    },
    status: (value: WorkStatus) => translate(workStatusKeys, value),
    activityType: (value: string) => translate(activityKeys, value),
    qualification: (value: string) => translate(qualificationKeys, value),
    serviceStatus: (value: string) => translate(serviceKeys, value),
    deadlineKind: (value: string) => translate(deadlineKeys, value),
    actionLabel: (value: string) => translate(actionKeys, value),
    demoCopy: (value: string) =>
      isExpertDemo ? translate(demoCopyKeys, value) : value,
    deadline: (at: string | null, timezone: string) => {
      if (!at) return t('noDeadlineSupplied')
      if (!Number.isFinite(Date.parse(at))) return t('deadlineUnavailable')
      const result = format.timestamp(at, timezone, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      })
      return result === '—' ? t('deadlineTimezoneUnavailable') : result
    },
  }
}
