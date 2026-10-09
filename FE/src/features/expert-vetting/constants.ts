import type { ApplicationStatus, ReviewDecision } from './types'

// MOCK: admin đang đăng nhập. TODO(api): lấy từ authStore khi có đăng nhập admin
export const CURRENT_ADMIN = 'Trần An'

/* Cấu hình dialog xác nhận cho từng loại quyết định */
export const DECISION_DIALOG = {
  approve: {
    title: 'decision.approve.title',
    notice: 'decision.approve.notice',
    noteLabel: 'decision.approve.noteLabel',
    placeholder: 'decision.approve.placeholder',
    required: false,
    confirm: 'decision.approve.confirm',
    showScores: true,
  },
  reject: {
    title: 'decision.reject.title',
    notice: 'decision.reject.notice',
    noteLabel: 'decision.reject.noteLabel',
    placeholder: 'decision.reject.placeholder',
    required: true,
    confirm: 'decision.reject.confirm',
    showScores: false,
  },
} as const satisfies Record<
  Exclude<ReviewDecision, 'supplement'>,
  {
    title: string
    notice: string
    noteLabel: string
    placeholder: string
    required: boolean
    confirm: string
    showScores: boolean
  }
>

export const SUPPLEMENT_DIALOG = {
  title: 'decision.supplement.title',
  notice: 'decision.supplement.notice',
  itemsLabel: 'decision.supplement.itemsLabel',
  messageLabel: 'decision.supplement.messageLabel',
  defaultMessage: 'decision.supplement.defaultMessage',
  confirm: 'decision.supplement.confirm',
} as const

/* Nhãn ghi chú hiển thị lại trên thẻ quyết định */
export const DECISION_NOTE_LABEL = {
  approve: 'decision.approve.noteLabel',
  reject: 'decision.reject.noteLabel',
  supplement: 'decision.supplement.noteLabel',
} as const satisfies Record<ReviewDecision, string>

/* Quyết định → trạng thái đơn, dòng lịch sử, thông báo toast */
export const DECISION_STATUS: Record<ReviewDecision, ApplicationStatus> = {
  approve: 'APPROVED',
  reject: 'REJECTED',
  supplement: 'NEED_MORE_INFORMATION',
}
export const DECISION_LOG = {
  approve: 'decision.log.approve',
  reject: 'decision.log.reject',
  supplement: 'decision.log.supplement',
} as const satisfies Record<ReviewDecision, string>
export const DECISION_TOAST = {
  approve: 'decision.toast.approve',
  reject: 'decision.toast.reject',
  supplement: 'decision.toast.supplement',
} as const satisfies Record<ReviewDecision, string>

/* Tab hàng đợi xét duyệt: một tab có thể gom nhiều trạng thái (APPLICATION_STATUS) */
export const QUEUE_TABS = [
  {
    key: 'review',
    label: 'queue.tabs.review',
    statuses: ['CAPABILITY_REVIEW'],
    showCount: true,
  },
  {
    key: 'screening',
    label: 'queue.tabs.screening',
    statuses: ['SUBMITTED', 'AI_SCREENING'],
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
    key: 'done',
    label: 'queue.tabs.done',
    statuses: ['APPROVED', 'REJECTED'],
    showCount: false,
  },
] as const satisfies readonly {
  key: string
  label: string
  statuses: readonly ApplicationStatus[]
  showCount: boolean
}[]

export type QueueTab = (typeof QUEUE_TABS)[number]['key']

export const DECISION_LABEL = {
  approve: 'decision.label.approve',
  reject: 'decision.label.reject',
  supplement: 'decision.label.supplement',
} as const satisfies Record<ReviewDecision, string>
