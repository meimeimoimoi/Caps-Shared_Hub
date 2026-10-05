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
    title: 'Duyệt đơn đăng ký của',
    notice:
      'Người đăng ký sẽ nhận email và có thể thiết lập dịch vụ. Hồ sơ chỉ hiển thị trên Marketplace khi dịch vụ đang hoạt động.',
    noteLabel: 'Ghi chú nội bộ',
    placeholder: 'Không bắt buộc. Chỉ System Admin xem được.',
    required: false,
    confirm: 'Duyệt đơn đăng ký',
    showScores: true,
  },
  reject: {
    title: 'Từ chối đơn đăng ký của',
    notice:
      'Người đăng ký sẽ nhận email kèm lý do bạn nhập. Không thể hoàn tác.',
    noteLabel: 'Lý do từ chối (bắt buộc)',
    placeholder: 'Nêu rõ tiêu chí chưa đáp ứng để người đăng ký hiểu',
    required: true,
    confirm: 'Từ chối đơn đăng ký',
    showScores: false,
  },
}

export const SUPPLEMENT_DIALOG = {
  title: 'Yêu cầu bổ sung',
  notice:
    'Đơn chuyển sang Cần bổ sung. Người đăng ký nhận email kèm các mục dưới đây.',
  itemsLabel: 'Mục cần bổ sung (chọn ít nhất 1)',
  messageLabel: 'Lời nhắn',
  defaultMessage:
    'Anh/chị vui lòng bổ sung các nội dung trên để hoàn tất đánh giá năng lực.',
  confirm: 'Gửi yêu cầu bổ sung',
}

/* Nhãn ghi chú hiển thị lại trên thẻ quyết định */
export const DECISION_NOTE_LABEL: Record<ReviewDecision, string> = {
  approve: 'Ghi chú nội bộ',
  reject: 'Lý do gửi người đăng ký',
  supplement: 'Nội dung gửi người đăng ký',
}

/* Quyết định → trạng thái đơn, dòng lịch sử, thông báo toast */
export const DECISION_STATUS: Record<ReviewDecision, ApplicationStatus> = {
  approve: 'APPROVED',
  reject: 'REJECTED',
  supplement: 'NEED_MORE_INFORMATION',
}
export const DECISION_LOG: Record<ReviewDecision, string> = {
  approve: 'Duyệt đơn đăng ký.',
  reject: 'Từ chối đơn đăng ký. Đã gửi email kèm lý do.',
  supplement: 'Yêu cầu bổ sung hồ sơ. Đã gửi email kèm nội dung cần bổ sung.',
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
