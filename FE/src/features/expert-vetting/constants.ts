import type {
  ApplicationStatus,
  EligibilityOutcome,
  EligibilityResult,
} from './types'

// MOCK: admin đang đăng nhập. TODO(api): lấy từ authStore khi có đăng nhập admin
export const CURRENT_ADMIN = 'Trần An'

/** Applications waiting for the Gate 1 decision */
export const PENDING_STATUS: ApplicationStatus = 'SUBMITTED'

export const SUPPLEMENT_DIALOG = {
  title: 'decision.supplement.title',
  notice: 'decision.supplement.notice',
  itemsLabel: 'decision.supplement.itemsLabel',
  messageLabel: 'decision.supplement.messageLabel',
  defaultMessage: 'decision.supplement.defaultMessage',
  confirm: 'decision.supplement.confirm',
} as const

/* Gate 1 requirements in display order (POL-EXP-01); EV-06 is the declared experience */
export const ELIGIBILITY_CODES = [
  'EV-01',
  'EV-02',
  'EV-03',
  'EV-04',
  'EV-05',
  'EV-06',
] as const
export const EXPERIENCE_CODE = 'EV-06'

export const ELIGIBILITY_RESULTS = [
  'PASS',
  'NEED_MORE_INFORMATION',
  'FAIL',
] as const satisfies readonly EligibilityResult[]

/* Derived outcome → wording of the confirm button, dialog notice and toast */
export const ELIGIBILITY_OUTCOME = {
  ELIGIBLE: {
    confirm: 'eligibility.outcome.ELIGIBLE.confirm',
    notice: 'eligibility.outcome.ELIGIBLE.notice',
    toast: 'eligibility.outcome.ELIGIBLE.toast',
    tone: 'success',
  },
  NEED_MORE_INFORMATION: {
    confirm: 'eligibility.outcome.NEED_MORE_INFORMATION.confirm',
    notice: 'eligibility.outcome.NEED_MORE_INFORMATION.notice',
    toast: 'eligibility.outcome.NEED_MORE_INFORMATION.toast',
    tone: 'warning',
  },
  NOT_ELIGIBLE: {
    confirm: 'eligibility.outcome.NOT_ELIGIBLE.confirm',
    notice: 'eligibility.outcome.NOT_ELIGIBLE.notice',
    toast: 'eligibility.outcome.NOT_ELIGIBLE.toast',
    tone: 'danger',
  },
} as const satisfies Record<
  EligibilityOutcome,
  { confirm: string; notice: string; toast: string; tone: string }
>

/* Tab hàng đợi xét duyệt: một tab có thể gom nhiều trạng thái (APPLICATION_STATUS) */
export const QUEUE_TABS = [
  {
    key: 'review',
    label: 'queue.tabs.review',
    statuses: [PENDING_STATUS],
    showCount: true,
  },
  {
    key: 'more-info',
    label: 'queue.tabs.moreInfo',
    statuses: ['NEED_MORE_INFORMATION'],
    showCount: true,
  },
  {
    key: 'not-eligible',
    label: 'queue.tabs.notEligible',
    statuses: ['NOT_ELIGIBLE'],
    showCount: true,
  },
  {
    key: 'eligible',
    label: 'queue.tabs.eligible',
    statuses: ['ELIGIBLE'],
    showCount: false,
  },
] as const satisfies readonly {
  key: string
  label: string
  statuses: readonly ApplicationStatus[]
  showCount: boolean
}[]

export type QueueTab = (typeof QUEUE_TABS)[number]['key']

/** Every status the queue tabs show; the review API lists one status per request */
export const QUEUE_STATUSES = [
  ...new Set(QUEUE_TABS.flatMap((t) => t.statuses)),
] as ApplicationStatus[]
