/* Dữ liệu demo cho disputesApi.ts khi chạy dev (isExpertDemo).
 * Chỉ disputesApi.ts được import file này; component/hook đi qua disputesApi. */
import type { Dispute, Escrow } from '../types'

const hoursAgo = (n: number) =>
  new Date(Date.now() - n * 3_600_000).toISOString()
const hoursFromNow = (n: number) => hoursAgo(-n)
const daysAgo = (n: number) => hoursAgo(n * 24)

export const mockDisputes: Dispute[] = [
  {
    id: 'HS-2026-0314',
    title: 'Giải trình chi phí khấu hao ô tô 2025',
    client: 'Công ty TNHH Cơ khí Tân Tiến',
    expert: 'Đặng Mỹ Linh',
    ground: 'Sao chép bản nháp AI',
    openedAt: hoursAgo(17),
    evidence: {
      draft: {
        label: 'Bản nháp AI · đoạn 4',
        text: '… phần khấu hao tương ứng với nguyên giá 1,6 tỷ đồng ',
        change: '320.000.000 đồng …',
      },
      revision: {
        label: 'Expert Revision · đoạn 4',
        text: '… và phân bổ theo ',
        change: 'tỷ lệ sử dụng cho kinh doanh là 85% …',
      },
      note: '1 đoạn sửa trên 10 đoạn · T1–T6 đều có ghi nhận thời gian',
    },
    complaint: {
      issue: 'Kết luận sai căn cứ pháp lý',
      description:
        'Tỷ lệ 85% chuyên gia đưa vào không có trong dữ liệu đã xác nhận.',
      attachment: 'so_hanh_trinh_2025.xlsx',
    },
    history: [
      { at: hoursAgo(17), actor: 'Công ty Tân Tiến', text: 'Gửi khiếu nại: kết luận sai căn cứ pháp lý' },
      { at: hoursAgo(19), actor: 'Đặng Mỹ Linh', text: 'Gửi kết luận Xác thực; tạo bản chính thức V-0314-1' },
      { at: hoursAgo(21), actor: 'Đặng Mỹ Linh', text: 'Sửa đoạn 4 (Expert Revision)' },
      { at: hoursAgo(42), actor: 'Công ty Tân Tiến', text: 'Trả lời yêu cầu làm rõ, tải sổ hành trình' },
      { at: hoursAgo(48), actor: 'Đặng Mỹ Linh', text: 'Gửi yêu cầu làm rõ (T4)' },
      { at: hoursAgo(70), actor: 'PayOS', text: 'Thanh toán 2.000.000 đ vào Escrow' },
      { at: hoursAgo(72), actor: 'Đặng Mỹ Linh', text: 'Nhận yêu cầu' },
    ],
  },
  {
    id: 'HS-2026-0302',
    title: 'Hồ sơ hoàn thuế GTGT hàng xuất khẩu quý II',
    client: 'Công ty CP Nông sản Mekong',
    expert: 'Võ Thanh Tùng',
    ground: 'Bàn giao trễ hạn',
    openedAt: hoursAgo(39),
    evidence: {
      draft: {
        label: 'Bản nháp AI · đoạn 2',
        text: '… số thuế đề nghị hoàn là ',
        change: '412.500.000 đồng …',
      },
      revision: {
        label: 'Expert Revision · đoạn 2',
        text: '… số thuế đề nghị hoàn sau khi loại hóa đơn không hợp lệ là ',
        change: '398.200.000 đồng …',
      },
      note: '3 đoạn sửa trên 8 đoạn · bàn giao sau hạn 26 giờ',
    },
    complaint: {
      issue: 'Bàn giao quá hạn đã cam kết',
      description: 'Chuyên gia bàn giao muộn hơn một ngày so với hạn trong yêu cầu, làm lỡ hạn nộp hồ sơ.',
      attachment: 'email_cam_ket_han.pdf',
    },
    history: [
      { at: hoursAgo(39), actor: 'Nông sản Mekong', text: 'Gửi khiếu nại: bàn giao quá hạn đã cam kết' },
      { at: hoursAgo(44), actor: 'Võ Thanh Tùng', text: 'Gửi kết luận Xác thực; tạo bản chính thức V-0302-1' },
      { at: hoursAgo(96), actor: 'PayOS', text: 'Thanh toán 3.200.000 đ vào Escrow' },
      { at: hoursAgo(98), actor: 'Võ Thanh Tùng', text: 'Nhận yêu cầu' },
    ],
  },
  {
    id: 'HS-2026-0287',
    title: 'Rà soát hợp đồng thuê nhà và thuế TNCN cho thuê tài sản',
    client: 'Nguyễn Thị Hồng Nhung',
    expert: 'Phan Quốc Bảo',
    ground: 'Thiếu căn cứ pháp lý',
    openedAt: daysAgo(6),
    resolvedAt: daysAgo(5),
    evidence: {
      draft: {
        label: 'Bản nháp AI · đoạn 3',
        text: '… doanh thu cho thuê dưới ',
        change: '100 triệu đồng/năm không phải nộp thuế …',
      },
      revision: {
        label: 'Expert Revision · đoạn 3',
        text: '… doanh thu cho thuê dưới ',
        change: '100 triệu đồng/năm không phải nộp thuế GTGT và TNCN …',
      },
      note: '1 đoạn sửa trên 6 đoạn',
    },
    complaint: {
      issue: 'Không dẫn văn bản pháp luật',
      description: 'Kết luận không nêu điều khoản áp dụng cho ngưỡng doanh thu.',
      attachment: 'hop_dong_thue_nha.pdf',
    },
    history: [
      { at: daysAgo(5), actor: 'Trần An', text: 'Ra quyết định: Bác khiếu nại. Kết luận đúng, đã dẫn Thông tư 40/2021/TT-BTC ở phụ lục.' },
      { at: daysAgo(6), actor: 'Nguyễn Thị Hồng Nhung', text: 'Gửi khiếu nại: không dẫn văn bản pháp luật' },
      { at: daysAgo(7), actor: 'Phan Quốc Bảo', text: 'Gửi kết luận Xác thực; tạo bản chính thức V-0287-1' },
    ],
  },
]

/* Khoản Escrow mẫu: đủ mọi trạng thái, 2 kiểu chi trả lỗi (thử lại được / phải sửa tài khoản) */
const escrow = (
  caseId: string,
  client: string,
  expert: string,
  amount: number,
  status: Escrow['status'],
  paidDaysAgo: number,
  nextAt: string,
  extra: Partial<Escrow> = {}
): Escrow => ({
  caseId,
  client,
  expert,
  amount,
  status,
  nextAt,
  paidAt: daysAgo(paidDaysAgo),
  payosRef: `PO${caseId.replace(/\D/g, '')}${String(amount).slice(0, 2)}`,
  payoutAccount: `Vietcombank ···· ${caseId.slice(-4)}`,
  history: [
    { at: daysAgo(paidDaysAgo), actor: 'PayOS', text: `Thanh toán ${amount.toLocaleString('vi-VN')} đ vào Escrow` },
  ],
  ...extra,
})

export const mockEscrows: Escrow[] = [
  escrow('HS-2026-0314', 'Tân Tiến', 'Đặng Mỹ Linh', 2_000_000, 'DISPUTE_LOCKED', 3, hoursFromNow(31)), // hạn 48 giờ kể từ khi mở khiếu nại
  escrow('HS-2026-0302', 'Nông sản Mekong', 'Võ Thanh Tùng', 3_200_000, 'DISPUTE_LOCKED', 4, hoursFromNow(9)),
  escrow('HS-2026-0311', 'Sao Mai', 'Phan Quốc Bảo', 2_500_000, 'HELD', 2, hoursFromNow(48)),
  escrow('HS-2026-0316', 'Hồng Nhung', 'Lý Gia Hân', 1_500_000, 'HELD', 1, hoursFromNow(70)),
  escrow('HS-2026-0309', 'Thép Nam Á', 'Phan Quốc Bảo', 2_800_000, 'PAID', 9, daysAgo(2), {
    history: [
      { at: daysAgo(2), actor: 'Hệ thống', text: 'Chi trả 2.240.000 đ cho chuyên gia, giữ 560.000 đ phí nền tảng' },
      { at: daysAgo(3), actor: 'Thép Nam Á', text: 'Nghiệm thu hồ sơ' },
      { at: daysAgo(9), actor: 'PayOS', text: 'Thanh toán 2.800.000 đ vào Escrow' },
    ],
  }),
  escrow('HS-2026-0301', 'Tân Tiến', 'Đặng Mỹ Linh', 1_900_000, 'PAID', 14, daysAgo(6)),
  escrow('HS-2026-0287', 'Hồng Nhung', 'Phan Quốc Bảo', 1_600_000, 'PAID', 9, daysAgo(5)),
  escrow('HS-2026-0305', 'Hòa Bình', 'Lâm Chí Kiên', 2_200_000, 'REFUNDED', 8, daysAgo(3), {
    termination: 'CLIENT_CANCEL_EARLY',
    refundAccount: 'BIDV ···· 5521',
    refundRef: 'FT26278193052',
  }),
  escrow('HS-2026-0298', 'Nhựa Việt Tiến', 'Võ Thị Hạnh', 1_800_000, 'REFUNDED', 10, daysAgo(4), {
    termination: 'EXPERT_OVERDUE',
    refundAccount: 'ACB ···· 7740',
    refundRef: 'FT26277048816',
  }),
  escrow('HS-2026-0293', 'Nông sản Mekong', 'Lý Gia Hân', 1_700_000, 'REFUND_PENDING', 5, daysAgo(1), {
    termination: 'SYSTEM_ERROR',
    refundAccount: 'Vietinbank ···· 3086',
  }),
  escrow('HS-2026-0279', 'Hồng Nhung', 'Võ Thanh Tùng', 1_400_000, 'REFUND_FAILED', 13, daysAgo(2), {
    termination: 'EXPERT_NOT_STARTED',
    refundAccount: 'Sacombank ···· 6612',
    failure: { reason: 'Tài khoản nhận hoàn đã đóng', retryable: false },
  }),
  escrow('HS-2026-0290', 'Thép Nam Á', 'Đặng Mỹ Linh', 2_000_000, 'PAYOUT_FAILED', 12, daysAgo(4), {
    failure: { reason: 'Ngân hàng nhận không phản hồi (hết thời gian chờ)', retryable: true },
  }),
  escrow('HS-2026-0284', 'Sao Mai', 'Võ Thanh Tùng', 2_400_000, 'PAYOUT_FAILED', 15, daysAgo(6), {
    payoutAccount: 'Techcombank ···· 0193',
    failure: { reason: 'Số tài khoản nhận không tồn tại', retryable: false },
  }),
]
