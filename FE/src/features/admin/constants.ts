import type { ApplicationStatus, ReviewDecision } from './types'

/* Cấu hình dialog xác nhận cho từng loại quyết định */
export const DECISION_DIALOG: Record<
  Exclude<ReviewDecision, 'supplement'>,
  {
    title: string // nối thêm tên người đăng ký + "?"
    notice: string
    noteLabel: string
    placeholder: string
    required: boolean
    confirm: string
    showScores: boolean
  }
> = {
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
}

export const SUPPLEMENT_DIALOG = {
  title: 'decision.supplement.title',
  notice: 'decision.supplement.notice',
  itemsLabel: 'decision.supplement.itemsLabel',
  messageLabel: 'decision.supplement.messageLabel',
  defaultMessage: 'decision.supplement.defaultMessage',
  confirm: 'decision.supplement.confirm',
}

/* Nhãn ghi chú hiển thị lại trên thẻ quyết định */
export const DECISION_NOTE_LABEL: Record<ReviewDecision, string> = {
  approve: 'decision.approve.noteLabel',
  reject: 'decision.reject.noteLabel',
  supplement: 'decision.supplement.noteLabel',
}

/* Quyết định → trạng thái đơn, dòng lịch sử, thông báo toast */
export const DECISION_STATUS: Record<ReviewDecision, ApplicationStatus> = {
  approve: 'APPROVED',
  reject: 'REJECTED',
  supplement: 'NEED_MORE_INFORMATION',
}
export const DECISION_LOG: Record<ReviewDecision, string> = {
  approve: 'decision.log.approve',
  reject: 'decision.log.reject',
  supplement: 'decision.log.supplement',
}
export const DECISION_TOAST: Record<ReviewDecision, string> = {
  approve: 'decision.toast.approve',
  reject: 'decision.toast.reject',
  supplement: 'decision.toast.supplement',
}

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

export const DECISION_LABEL: Record<ReviewDecision, string> = {
  approve: 'decision.label.approve',
  reject: 'decision.label.reject',
  supplement: 'decision.label.supplement',
}
