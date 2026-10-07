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

export const mockEscrows: Escrow[] = [
  {
    caseId: 'HS-2026-0314',
    client: 'Tân Tiến',
    expert: 'Đặng Mỹ Linh',
    amount: 2_000_000,
    status: 'DISPUTE_LOCKED',
    nextAt: hoursFromNow(31), // hạn 48 giờ kể từ khi mở khiếu nại
  },
  {
    caseId: 'HS-2026-0311',
    client: 'Sao Mai',
    expert: 'Phan Quốc Bảo',
    amount: 2_500_000,
    status: 'HELD',
    nextAt: hoursFromNow(48),
  },
  {
    caseId: 'HS-2026-0305',
    client: 'Hòa Bình',
    expert: 'Lâm Chí Kiên',
    amount: 2_200_000,
    status: 'REFUNDED',
    termination: 'CLIENT_CANCEL_EARLY',
    nextAt: daysAgo(3),
  },
  {
    caseId: 'HS-2026-0298',
    client: 'Nhựa Việt Tiến',
    expert: 'Võ Thị Hạnh',
    amount: 1_800_000,
    status: 'REFUNDED',
    termination: 'EXPERT_OVERDUE',
    nextAt: daysAgo(4),
  },
  {
    caseId: 'HS-2026-0290',
    client: 'Thép Nam Á',
    expert: 'Đặng Mỹ Linh',
    amount: 2_000_000,
    status: 'PAYOUT_FAILED',
    nextAt: daysAgo(4),
  },
]
