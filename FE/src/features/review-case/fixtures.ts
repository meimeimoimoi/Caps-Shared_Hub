import type { SettlementRule } from './settlement'
import type { Actor, ReviewCase, TimelineEvent } from './types'

/* Demo Flow 5 phía User: mỗi kịch bản dựng một Review Case ở đúng trạng thái.
 * Mốc giờ tính lùi từ hiện tại để đồng hồ đếm ngược chạy thật. Thay bằng API khi BE có review-case. */

export const SCENARIOS = [
  'PENDING_EXPERT_RESPONSE',
  'EXPERT_DECLINED',
  'AWAITING_PAYMENT',
  'CANCELLED_UNPAID',
  'PAYMENT_CONFIRMED',
  'CANCELLED',
  'IN_REVIEW',
  'AWAITING_USER_INFORMATION',
  'VERIFIED',
  'CANNOT_VERIFY',
  'COMPLETED',
  'AUTO_CONFIRMED',
  'DISPUTED',
  'RESOLVED',
  'USER_CANCELLED',
  'USER_NON_RESPONSE',
  'EXPERT_ABANDON',
  'SYSTEM_ERROR',
] as const
export type Scenario = (typeof SCENARIOS)[number]

export const isScenario = (v: string | null): v is Scenario =>
  SCENARIOS.includes(v as Scenario)

/** Số giờ đã trôi qua kể từ lúc gửi yêu cầu, theo từng kịch bản */
const ELAPSED: Record<Scenario, number> = {
  PENDING_EXPERT_RESPONSE: 0.8,
  EXPERT_DECLINED: 3,
  AWAITING_PAYMENT: 1.556,
  CANCELLED_UNPAID: 3,
  PAYMENT_CONFIRMED: 2.5,
  CANCELLED: 30,
  IN_REVIEW: 20,
  AWAITING_USER_INFORMATION: 34,
  VERIFIED: 75,
  CANNOT_VERIFY: 75,
  COMPLETED: 100,
  AUTO_CONFIRMED: 160,
  DISPUTED: 90,
  RESOLVED: 150,
  USER_CANCELLED: 30,
  USER_NON_RESPONSE: 110,
  EXPERT_ABANDON: 130,
  SYSTEM_ERROR: 24,
}

/** Hồ sơ của client demo; mỗi mã mở ở kịch bản mặc định, đổi được bằng ?scenario= */
export const DEMO_CASES: {
  id: string
  scenario: Scenario
  title: string
  amount: number
}[] = [
  {
    id: 'RC-2026-0419',
    scenario: 'PENDING_EXPERT_RESPONSE',
    title: 'Hồ sơ hoàn thuế GTGT hàng xuất khẩu quý II/2026',
    amount: 2_400_000,
  },
  {
    id: 'RC-2026-0418',
    scenario: 'AWAITING_PAYMENT',
    title: 'Quyết toán thuế TNDN năm 2025 · Công ty TNHH Cơ khí Tân Định Phát',
    amount: 6_500_000,
  },
  {
    id: 'RC-2026-0412',
    scenario: 'AWAITING_USER_INFORMATION',
    title: 'Tạm nộp TNDN quý III/2026 · Cơ khí Tân Định Phát',
    amount: 1_800_000,
  },
  {
    id: 'RC-2026-0397',
    scenario: 'VERIFIED',
    title: 'Giải trình chi phí lãi vay vượt ngưỡng EBITDA 2025',
    amount: 2_500_000,
  },
  {
    id: 'RC-2026-0371',
    scenario: 'IN_REVIEW',
    title: 'Thuyết minh quyết toán TNDN 2025 · Chi nhánh Bình Dương',
    amount: 2_200_000,
  },
  {
    id: 'RC-2026-0350',
    scenario: 'COMPLETED',
    title: 'Quyết toán thuế TNDN năm 2024 · Cơ khí Tân Định Phát',
    amount: 6_500_000,
  },
  {
    id: 'RC-2026-0322',
    scenario: 'RESOLVED',
    title: 'Ưu đãi thuế dự án mở rộng nhà xưởng Long Hậu',
    amount: 3_200_000,
  },
  {
    id: 'RC-2026-0301',
    scenario: 'CANCELLED_UNPAID',
    title: 'Hồ sơ hoàn thuế GTGT quý I/2026',
    amount: 2_400_000,
  },
]

export function demoCase(
  id: string | undefined,
  scenario?: Scenario
): ReviewCase | null {
  const d = DEMO_CASES.find((c) => c.id === id)
  if (!d) return null
  const c = caseFor(scenario ?? d.scenario)
  return {
    ...c,
    id: d.id,
    title: d.title,
    amount: d.amount,
    package: c.package && { ...c.package, version: `RP-${d.id.slice(8)} · v3` },
    settlement: c.settlement && {
      ...c.settlement,
      ref: `STL-${d.id.slice(3)}-01`,
    },
  }
}

export function caseFor(s: Scenario, now = Date.now()): ReviewCase {
  const t = (h: number) =>
    new Date(now - (ELAPSED[s] - h) * 3_600_000).toISOString()
  const c: ReviewCase = {
    id: 'RC-2026-0418',
    title: 'Quyết toán thuế TNDN năm 2025 · Công ty TNHH Cơ khí Tân Định Phát',
    status: 'PENDING_EXPERT_RESPONSE',
    expert: {
      name: 'Đỗ Hoàng Long',
      initials: 'ĐL',
      color: '#C2410C',
      role: 'Đại lý thuế Bộ Tài chính',
    },
    serviceName: 'Soát xét toàn diện bộ hồ sơ quyết toán',
    slaDays: 5,
    amount: 6_500_000,
    requestedAt: t(0),
    tasks: [],
    timeline: [],
  }
  const log = (h: number, actor: Actor, event: TimelineEvent) =>
    c.timeline.unshift({ at: t(h), actor, event })
  const close = (
    h: number,
    status: ReviewCase['status'],
    rule: SettlementRule
  ) => {
    c.status = status
    c.due = undefined
    c.settlement = { rule, settledAt: t(h + 0.1), ref: 'STL-2026-0418-01' }
    return c
  }

  log(0, 'USER', 'requested')
  if (s === 'PENDING_EXPERT_RESPONSE') return c
  if (s === 'EXPERT_DECLINED') {
    log(1.5, 'EXPERT', 'declined')
    c.status = 'EXPERT_DECLINED'
    return c
  }

  log(1.5, 'EXPERT', 'accepted')
  c.package = {
    version: 'RP-0418 · v3',
    lockedAt: t(1.5),
    aiDraft: 'AI Draft v4',
    snapshot: 'Snapshot đầu vào v2',
    template: 'Mẫu 03/TNDN · TT 80/2021 · v1.3',
    citations: 14,
    documents: [
      'BCTC kiểm toán 2025.pdf',
      'Sổ chi tiết TK 635 - 642.xlsx',
      'Hợp đồng vay liên kết HĐ-07.pdf',
    ],
  }
  c.status = 'AWAITING_PAYMENT'
  c.due = { payment: t(1.75) }
  if (s === 'AWAITING_PAYMENT') return c
  if (s === 'CANCELLED_UNPAID') {
    log(1.75, 'SYSTEM', 'paymentExpired')
    c.status = 'CANCELLED_UNPAID'
    c.due = undefined
    return c
  }

  log(1.7, 'USER', 'paid')
  c.status = 'PAYMENT_CONFIRMED'
  c.due = { start: t(25.7) }
  if (s === 'PAYMENT_CONFIRMED') return c
  if (s === 'CANCELLED') {
    log(25.7, 'SYSTEM', 'startTimeout')
    return close(25.7, 'CANCELLED', 'EXPERT_START_TIMEOUT')
  }

  log(4, 'EXPERT', 'started')
  c.status = 'IN_REVIEW'
  c.due = { delivery: t(124) }
  c.tasks = ['T1', 'T2']
  if (s === 'IN_REVIEW') return c
  if (s === 'SYSTEM_ERROR') {
    log(18, 'SYSTEM', 'terminated')
    return close(18, 'TERMINATED', 'SYSTEM_ERROR')
  }
  if (s === 'USER_CANCELLED') {
    log(22, 'USER', 'terminated')
    return close(22, 'TERMINATED', 'USER_CANCELLED')
  }

  log(30, 'EXPERT', 'infoRequested')
  c.tasks = ['T1', 'T2', 'T3', 'T4']
  c.infoRequest = {
    message:
      'Bảng phân bổ chi phí lãi vay chưa có số liệu EBITDA năm 2025. Vui lòng bổ sung để tôi đối chiếu ngưỡng 30% theo Nghị định 132/2020.',
    items: [
      'Bảng tính EBITDA 2025, có đối chiếu với BCTC kiểm toán',
      'Phụ lục I · Mẫu 01 Nghị định 132 đã ký',
    ],
    sentAt: t(30),
  }
  c.status = 'AWAITING_USER_INFORMATION'
  c.due = { info: t(102), delivery: t(124) }
  if (s === 'AWAITING_USER_INFORMATION') return c
  if (s === 'USER_NON_RESPONSE') {
    log(102, 'SYSTEM', 'terminated')
    return close(102, 'TERMINATED', 'USER_NON_RESPONSE')
  }

  log(40, 'USER', 'infoAnswered')
  c.infoRequest.response =
    'Đã tải lên bảng EBITDA 2025 (đối chiếu BCTC trang 14-17) và Phụ lục I có chữ ký giám đốc. Lưu ý thêm khoản trích trước chi phí bảo hành 186.200.000đ.'
  c.status = 'IN_REVIEW'
  c.due = { delivery: t(124) }
  c.tasks = ['T1', 'T2', 'T3', 'T4', 'T5']
  if (s === 'EXPERT_ABANDON') {
    log(124, 'SYSTEM', 'terminated')
    return close(124, 'TERMINATED', 'EXPERT_ABANDON')
  }

  log(70, 'EXPERT', 'delivered')
  c.tasks = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6']
  c.result =
    s === 'CANNOT_VERIFY'
      ? {
          outcome: 'CANNOT_VERIFY',
          summary:
            'Đã rà soát đủ 6 nhiệm vụ trên gói RP-0418 v3. Doanh thu và chi phí khớp BCTC kiểm toán; riêng khoản vay liên kết HĐ-07 thiếu hồ sơ xác định giá giao dịch liên kết.',
          rationale:
            'Gói hồ sơ không có tài liệu chuyển giá cho khoản vay 18,4 tỷ đồng từ công ty mẹ, nên không đủ căn cứ xác định phần chi phí lãi vay được trừ. Kết luận xác minh sẽ vượt quá bằng chứng hiện có.',
          findings: [
            {
              ref: 'Điều 18 NĐ 132/2020/NĐ-CP',
              note: 'Thiếu hồ sơ xác định giá giao dịch liên kết cho khoản vay HĐ-07.',
            },
            {
              ref: 'Điều 16.3 NĐ 132/2020/NĐ-CP',
              note: 'Chưa xác định được phần lãi vay vượt ngưỡng khi EBITDA chưa chuẩn hóa.',
            },
          ],
          deliveredAt: t(70),
        }
      : {
          outcome: 'VERIFIED',
          verifiedVersion: 'Expert Revision v4-E2',
          conclusion:
            'Tờ khai 03/TNDN sau hiệu chỉnh phản ánh đúng thu nhập chịu thuế năm 2025. Chi phí lãi vay vượt ngưỡng 30% EBITDA (412.680.000đ) đã được loại khỏi chi phí được trừ và chuyển sang kỳ sau. Không phát hiện sai lệch trọng yếu khác trong phạm vi dịch vụ.',
          notes: [
            {
              ref: 'Điều 16.3 NĐ 132/2020/NĐ-CP',
              note: 'Ngưỡng 30% EBITDA áp dụng cho kỳ tính thuế 2025; phần vượt được chuyển tối đa 5 năm.',
            },
            {
              ref: 'Điều 4 TT 96/2015/TT-BTC',
              note: 'Trích trước chi phí bảo hành 186.200.000đ có chứng từ hợp lệ, giữ nguyên.',
            },
            {
              ref: 'Phụ lục 03-1A/TNDN',
              note: 'Chỉ tiêu B4 tăng 412.680.000đ; AI Draft v4 để trống chỉ tiêu này.',
            },
          ],
          deliveredAt: t(70),
        }
  c.status = 'AWAITING_ACCEPTANCE'
  c.due = { acceptance: t(142) }
  if (s === 'VERIFIED' || s === 'CANNOT_VERIFY') return c
  if (s === 'COMPLETED') {
    log(80, 'USER', 'userAccepted')
    return close(80, 'COMPLETED', 'USER_ACCEPTED')
  }
  if (s === 'AUTO_CONFIRMED') {
    log(142, 'SYSTEM', 'autoConfirmed')
    return close(142, 'COMPLETED', 'AUTO_CONFIRMED')
  }

  log(85, 'USER', 'disputed')
  c.dispute = {
    issue: 'DELIVERABLE_INCOMPLETE',
    description:
      'Kết luận không nêu cách xử lý khoản trích trước chi phí bảo hành mà tôi đã đề cập trong phần phản hồi bổ sung.',
    openedAt: t(85),
  }
  c.status = 'DISPUTED'
  c.due = undefined
  if (s === 'DISPUTED') return c

  log(120, 'ADMIN', 'resolved')
  c.dispute.decision = {
    outcome: 'RESOLVE_PARTIAL',
    reason:
      'Chuyên gia đã bàn giao kết luận và căn cứ cho 5/6 nội dung; nội dung trích trước bảo hành nêu trong phản hồi bổ sung chưa được xử lý.',
    decidedBy: 'Phan Gia Khiêm · Dispute Admin',
    decidedAt: t(120),
  }
  return close(120, 'RESOLVED', 'RESOLVE_PARTIAL')
}

/** Hồ sơ AI của User có thể gửi thẩm định (trang gửi Review Request) */
export const REVIEWABLE_DRAFTS: {
  id: string
  name: string
  aiDraft: string
  snapshot: string
  template: string
  citations: number
  documents: number
}[] = [
  {
    id: 'ws-tdp-2025',
    name: 'Quyết toán TNDN 2025 · Cơ khí Tân Định Phát',
    aiDraft: 'AI Draft v4',
    snapshot: 'Snapshot v2',
    template: 'Mẫu 03/TNDN · v1.3',
    citations: 14,
    documents: 3,
  },
  {
    id: 'ws-tdp-q3',
    name: 'Tạm nộp TNDN quý III/2026 · Cơ khí Tân Định Phát',
    aiDraft: 'AI Draft v2',
    snapshot: 'Snapshot v1',
    template: 'Mẫu 01A/TNDN · v2.0',
    citations: 6,
    documents: 1,
  },
]
