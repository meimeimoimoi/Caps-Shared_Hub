import type { ApplicationStatus, ReviewDecision } from './types'

export const APPROVE_NOTICE =
  'Người đăng ký sẽ nhận email và có thể thiết lập dịch vụ. Hồ sơ chỉ hiển thị trên Marketplace khi dịch vụ đang hoạt động.'

/* Quyết định → trạng thái đơn, dòng lịch sử, thông báo toast */
export const DECISION_STATUS: Record<ReviewDecision, ApplicationStatus> = {
  approve: 'APPROVED',
  reject: 'REJECTED',
  supplement: 'NEED_MORE_INFORMATION',
}
export const DECISION_LOG: Record<ReviewDecision, string> = {
  approve: 'Duyệt đơn đăng ký.',
  reject: 'Từ chối đơn đăng ký.',
  supplement: 'Yêu cầu bổ sung hồ sơ.',
}
export const DECISION_TOAST: Record<ReviewDecision, string> = {
  approve: 'Đã duyệt đơn đăng ký',
  reject: 'Đã từ chối đơn đăng ký',
  supplement: 'Đã gửi yêu cầu bổ sung',
}

/* Tab hàng đợi xét duyệt: một tab có thể gom nhiều trạng thái (APPLICATION_STATUS) */
export const QUEUE_TABS = [
  {
    key: 'review',
    label: 'Chờ đánh giá',
    statuses: ['CAPABILITY_REVIEW'],
    showCount: true,
  },
  {
    key: 'screening',
    label: 'Đang đối soát',
    statuses: ['SUBMITTED', 'AI_SCREENING'],
    showCount: true,
  },
  {
    key: 'more-info',
    label: 'Cần bổ sung',
    statuses: ['NEED_MORE_INFORMATION'],
    showCount: true,
  },
  {
    key: 'not-eligible',
    label: 'Không đủ điều kiện',
    statuses: ['NOT_ELIGIBLE'],
    showCount: true,
  },
  {
    key: 'done',
    label: 'Đã xử lý',
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
  approve: 'Duyệt',
  reject: 'Từ chối',
  supplement: 'Yêu cầu bổ sung',
}
