/* SHFT UI config (FE/docs/UI-CONFIG.md).
 * Nhãn trạng thái và câu chữ cố định chỉ khai báo ở đây, component không tự viết. */

/* ── §6 Bảng trạng thái ── */
export type Tone = 'neutral' | 'accent' | 'warning' | 'success' | 'danger' | 'plain'
//   plain = trạng thái bình thường trong bảng → chữ xám, KHÔNG badge

export interface StatusMeta {
  label: string
  tone: Tone
}

/* Flow 1 · Đơn đăng ký Expert */
export const APPLICATION_STATUS = {
  DRAFT: { label: 'Bản nháp', tone: 'neutral' },
  SUBMITTED: { label: 'Đã nộp', tone: 'neutral' },
  AI_SCREENING: { label: 'AI sàng lọc', tone: 'neutral' },
  NEED_MORE_INFORMATION: { label: 'Cần bổ sung', tone: 'warning' },
  NOT_ELIGIBLE: { label: 'Không đủ điều kiện', tone: 'danger' },
  CAPABILITY_REVIEW: { label: 'Đang đánh giá năng lực', tone: 'accent' },
  APPROVED: { label: 'Được duyệt', tone: 'success' },
  REJECTED: { label: 'Bị từ chối', tone: 'danger' },
} as const satisfies Record<string, StatusMeta>

/* Flow 1 · Dịch vụ Expert (2 trạng thái độc lập) */
export const SERVICE_STATUS = {
  INACTIVE: { label: 'Chưa hoạt động', tone: 'neutral' },
  ACTIVE: { label: 'Đang hoạt động · hiện trên Marketplace', tone: 'plain' },
  SUSPENDED: { label: 'Tạm ngưng', tone: 'warning' },
} as const satisfies Record<string, StatusMeta>
export const AVAILABILITY = {
  AVAILABLE: { label: 'Có lịch nhận việc', tone: 'plain' },
  UNAVAILABLE: { label: 'Hết lịch nhận', tone: 'neutral' },
} as const satisfies Record<string, StatusMeta>

/* Flow 2 · Văn bản tri thức */
export const DOCUMENT_STATUS = {
  PENDING: { label: 'Chờ duyệt', tone: 'neutral' },
  APPROVED: { label: 'Đang index', tone: 'accent' },
  INDEXED: { label: 'Đã index', tone: 'success' },
  INDEX_FAILED: { label: 'Index lỗi', tone: 'danger' },
  PARSE_FAILED: { label: 'Lỗi bóc tách', tone: 'danger' },
  REJECTED: { label: 'Từ chối', tone: 'danger' },
  SUPERSEDED: { label: 'Đã thay thế', tone: 'neutral' },
} as const satisfies Record<string, StatusMeta>

/* Flow 5 · Hồ sơ rà soát (case) */
export const CASE_STATUS = {
  PENDING_EXPERT_RESPONSE: { label: 'Chờ chuyên gia nhận', tone: 'neutral' },
  AWAITING_PAYMENT: { label: 'Chờ thanh toán', tone: 'warning' },
  CANCELLED_UNPAID: { label: 'Đã hủy · chưa thanh toán', tone: 'plain' },
  PAYMENT_CONFIRMED: { label: 'Chờ bắt đầu rà soát', tone: 'neutral' },
  EXPERT_TIMEOUT: { label: 'Đã hủy · hoàn tiền', tone: 'plain' },
  IN_REVIEW: { label: 'Đang rà soát', tone: 'accent' },
  AWAITING_USER_INFORMATION: { label: 'Chờ bạn bổ sung', tone: 'warning' },
  AWAITING_ACCEPTANCE: { label: 'Chờ nghiệm thu', tone: 'warning' },
  DISPUTED: { label: 'Đang tranh chấp', tone: 'warning' },
  COMPLETED: { label: 'Hoàn tất', tone: 'success' },
  AUTO_CONFIRMED: { label: 'Hoàn tất · tự xác nhận', tone: 'success' },
  TERMINATED: { label: 'Đã chấm dứt', tone: 'neutral' },
} as const satisfies Record<string, StatusMeta>

/* Flow 5 · Escrow (khoản tiền giữ hộ của hồ sơ) */
export const ESCROW_STATUS = {
  HELD: { label: 'Giữ · chờ nghiệm thu', tone: 'neutral' },
  DISPUTE_LOCKED: { label: 'Khóa · tranh chấp', tone: 'warning' },
  PAID: { label: 'Đã chi trả 80/20', tone: 'plain' },
  REFUNDED: { label: 'Đã hoàn tiền', tone: 'plain' },
  PAYOUT_FAILED: { label: 'Chi trả lỗi · thử lại', tone: 'danger' },
} as const satisfies Record<string, StatusMeta>

export const REVIEW_RESULT = {
  VERIFIED: { label: 'Đã xác thực', tone: 'success' },
  CANNOT_VERIFY: { label: 'Không thể xác thực', tone: 'danger' },
} as const satisfies Record<string, StatusMeta>

/* Kết luận → kiểu dòng kết luận */
export type VerdictKind = 'final' | 'waiting' | 'refund' | 'negative'

/* ── §7 Các bước Status Rail ── */
export const RAIL_APPLICATION = ['Nộp hồ sơ', 'AI sàng lọc', 'Kiểm tra giấy tờ pháp lý', 'Đánh giá năng lực', 'Kết quả'] as const
export const RAIL_DOCUMENT = ['Thu thập', 'Kiểm tra phiên bản', 'Bóc tách', 'Rà soát', 'Index'] as const
export const RAIL_DRAFT = ['Mẫu biểu', 'Nhập liệu', 'Xác nhận snapshot', 'Tạo nháp', 'Xem trước'] as const
export const RAIL_CASE_CLIENT = ['Chuyên gia nhận', 'Thanh toán', 'Bắt đầu rà soát', 'Rà soát', 'Nghiệm thu'] as const
export const RAIL_CASE_EXPERT = ['Yêu cầu mới', 'Chờ thanh toán', 'Bắt đầu rà soát', 'Rà soát', 'Nghiệm thu'] as const
export const TRACE_ANSWER = ['Kiểm tra phạm vi', 'Tìm văn bản pháp lý', 'Soạn câu trả lời'] as const

/* Ánh xạ trạng thái case → bước hiện tại trên rail Client */
export const CASE_RAIL_STEP: Record<keyof typeof CASE_STATUS, number> = {
  PENDING_EXPERT_RESPONSE: 0, AWAITING_PAYMENT: 1, CANCELLED_UNPAID: 1,
  PAYMENT_CONFIRMED: 2, EXPERT_TIMEOUT: 2,
  IN_REVIEW: 3, AWAITING_USER_INFORMATION: 3,
  AWAITING_ACCEPTANCE: 4, DISPUTED: 4,
  COMPLETED: 5, AUTO_CONFIRMED: 5, TERMINATED: 3,
}

/* Ánh xạ trạng thái đơn Expert → bước hiện tại trên RAIL_APPLICATION.
 * (Config chưa có bảng này; thêm theo cùng mẫu CASE_RAIL_STEP.) */
export const APPLICATION_RAIL_STEP: Record<keyof typeof APPLICATION_STATUS, number> = {
  DRAFT: 0, SUBMITTED: 0, AI_SCREENING: 1,
  NEED_MORE_INFORMATION: 2, NOT_ELIGIBLE: 2,
  CAPABILITY_REVIEW: 3,
  APPROVED: 5, REJECTED: 5,
}

/* ── §8 Câu chữ cố định ── */
export const COPY = {
  aiDraftDisclaimer: 'Nội dung do AI tạo, chưa được chuyên gia xác thực.',
  aiAnswerNote: 'Câu trả lời do AI tạo từ văn bản pháp lý đã duyệt; không thay thế ý kiến chuyên gia cho hồ sơ cụ thể.',
  aiScreeningNote: 'Gợi ý để xem xét, không phải quyết định.',
  creditHold: 'Mỗi câu hỏi giữ tạm 1 credit, chỉ trừ khi trả lời thành công',
  exportCredit: 'Tải về dùng ngay · 1 credit',
  escrowClient: 'Khoản thanh toán được SHFT giữ hộ tới khi bạn nghiệm thu.',
  noChatForExpert: 'Chuyên gia không xem được lịch sử trò chuyện với trợ lý AI.',
  snapshotImmutable: 'Snapshot không sửa được sau khi tạo. Muốn thay đổi, bạn sửa form và xác nhận lại.',
} as const
