/* ════════════════════════════════════════════════════════════════════
 * MOCK DATA — đang dùng dữ liệu giả, chưa nối API.
 * TODO(api): thay bằng API, đặt trong features/admin/api/, gọi bằng useQuery của @tanstack/react-query:
 *   - mockApplications        → GET danh sách hồ sơ expert (vd. /api/admin/expert-applications)
 *   - getMockApplicationDetail → GET chi tiết hồ sơ (vd. /api/admin/expert-applications/:id)
 *   - mockCriteria            → GET tiêu chí đánh giá năng lực từ cấu hình
 *   - mockExperts             → GET danh sách Expert đã duyệt (vd. /api/admin/experts)
 *   - mockDisputes            → GET chi tiết khiếu nại (vd. /api/admin/disputes/:id)
 * ════════════════════════════════════════════════════════════════════ */
import type {
  ApplicationDetail,
  Criterion,
  Dispute,
  Expert,
  ExpertApplication,
} from './types'

// MOCK: admin đang đăng nhập. TODO(api): lấy từ authStore khi có đăng nhập admin
export const CURRENT_ADMIN = 'Trần An'

const daysAgo = (n: number) =>
  new Date(Date.now() - n * 86_400_000).toISOString()

export const mockApplications: ExpertApplication[] = [
  {
    id: 'EXP-0139',
    name: 'Lê Quốc Huy',
    email: 'huy.le@anphat.vn',
    years: 12,
    aiFlags: 0,
    submittedAt: daysAgo(8),
    status: 'CAPABILITY_REVIEW',
  },
  {
    id: 'EXP-0142',
    name: 'Nguyễn Minh Anh',
    email: 'minhanh.tax@gmail.com',
    years: 8,
    aiFlags: 1,
    submittedAt: daysAgo(7),
    status: 'CAPABILITY_REVIEW',
  },
  {
    id: 'EXP-0145',
    name: 'Trịnh Bảo Ngọc',
    email: 'ngoc.tb@gmail.com',
    years: 10,
    aiFlags: 0,
    submittedAt: daysAgo(4),
    status: 'CAPABILITY_REVIEW',
  },
  {
    id: 'EXP-0147',
    name: 'Phạm Thu Hà',
    email: 'ha.pham@ketoanviet.vn',
    years: 6,
    aiFlags: 0,
    submittedAt: daysAgo(2),
    status: 'AI_SCREENING',
  },
  {
    id: 'EXP-0136',
    name: 'Đỗ Văn Khánh',
    email: 'khanh.do@gmail.com',
    years: 5,
    aiFlags: 2,
    submittedAt: daysAgo(10),
    status: 'NEED_MORE_INFORMATION',
  },
  {
    id: 'EXP-0131',
    name: 'Vũ Hoàng Long',
    email: 'long.vh@gmail.com',
    years: 1,
    aiFlags: 3,
    submittedAt: daysAgo(15),
    status: 'NOT_ELIGIBLE',
  },
]

// Lịch sử mock: duyệt đơn → (kích hoạt dịch vụ) → (tạm ngưng)
function expert(
  e: Omit<Expert, 'reviewer' | 'history' | 'approvedAt'> & {
    approvedDaysAgo: number
  }
): Expert {
  const { approvedDaysAgo, ...rest } = e
  const approvedAt = daysAgo(approvedDaysAgo)
  const later = (h: number) =>
    new Date(
      Date.now() - approvedDaysAgo * 86_400_000 + h * 3_600_000
    ).toISOString()
  const history = [
    { at: approvedAt, actor: CURRENT_ADMIN, text: 'duyệt đơn đăng ký.' },
    ...(rest.serviceStatus !== 'INACTIVE'
      ? [{ at: later(15), actor: rest.name, text: 'kích hoạt dịch vụ.' }]
      : []),
    ...(rest.serviceStatus === 'SUSPENDED'
      ? [
          {
            at: later(24 * 9),
            actor: CURRENT_ADMIN,
            text: 'tạm ngưng dịch vụ.',
          },
        ]
      : []),
  ]
  return {
    ...rest,
    approvedAt,
    reviewer: CURRENT_ADMIN,
    history: history.reverse(),
  }
}

export const mockExperts: Expert[] = [
  expert({
    id: 'EXP-0118',
    name: 'Đặng Mỹ Linh',
    email: 'linh.dang@outlook.com',
    fields: ['Thuế TNDN', 'Kiểm toán'],
    serviceStatus: 'ACTIVE',
    fee: 2_000_000,
    activeCases: 3,
    capacity: 4,
    approvedDaysAgo: 18,
    experienceYears: 15,
    schedule: 'Thứ 2 – Thứ 6',
  }),
  expert({
    id: 'EXP-0142',
    name: 'Nguyễn Minh Anh',
    email: 'minhanh.tax@gmail.com',
    fields: ['Thuế TNDN', 'Quyết toán thuế'],
    serviceStatus: 'INACTIVE',
    fee: null,
    activeCases: 0,
    capacity: 3,
    approvedDaysAgo: 6,
    experienceYears: 8,
    schedule: 'Chưa thiết lập',
  }),
  expert({
    id: 'EXP-0109',
    name: 'Phan Quốc Bảo',
    email: 'bao.pq@taxvn.vn',
    fields: ['Thuế TNDN', 'Chuyển giá'],
    serviceStatus: 'ACTIVE',
    fee: 2_500_000,
    activeCases: 1,
    capacity: 2,
    approvedDaysAgo: 31,
    experienceYears: 11,
    schedule: 'Thứ 2 – Thứ 7',
  }),
  expert({
    id: 'EXP-0097',
    name: 'Võ Thị Hạnh',
    email: 'hanh.vt@gmail.com',
    fields: ['Thuế TNDN'],
    serviceStatus: 'SUSPENDED',
    fee: 1_800_000,
    activeCases: 0,
    capacity: 3,
    approvedDaysAgo: 44,
    experienceYears: 7,
    schedule: 'Thứ 3 – Thứ 5',
  }),
  expert({
    id: 'EXP-0088',
    name: 'Lâm Chí Kiên',
    email: 'kien.lam@kiemtoan.vn',
    fields: ['Thuế TNDN', 'Soát xét BCTC'],
    serviceStatus: 'ACTIVE',
    fee: 2_200_000,
    activeCases: 2,
    capacity: 3,
    approvedDaysAgo: 53,
    experienceYears: 9,
    schedule: 'Thứ 2 – Thứ 6',
  }),
]

const hoursAgo = (n: number) =>
  new Date(Date.now() - n * 3_600_000).toISOString()

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
]

export const mockCriteria: Criterion[] = [1, 2, 3, 4, 5].map((n) => ({
  id: `C${n}`,
  name: `[Tên tiêu chí C${n}]`,
  description: '[Mô tả ngắn tiêu chí từ cấu hình]',
}))

const flagTemplates = [
  {
    document: 'EV-03',
    documentName: 'Giấy xác nhận công tác',
    request:
      'Bổ sung xác nhận công tác giai đoạn 2017-2021 tại Công ty Kiểm toán Sao Việt.',
    title: 'Cần xem lại: giai đoạn công tác 07/2017 – 02/2021',
    detail:
      'CV kê khai giai đoạn 07/2017 – 02/2021 tại Công ty Kiểm toán Sao Việt nhưng hồ sơ không có giấy xác nhận cho giai đoạn này. Giấy tờ hiện có chỉ xác nhận giai đoạn từ 03/2021.',
  },
  {
    document: 'EV-01',
    documentName: 'Chứng chỉ hành nghề',
    request: 'Bổ sung ảnh chụp rõ nét chứng chỉ hành nghề.',
    title: 'Cần xem lại: số chứng chỉ không đọc được',
    detail: 'Ảnh chụp chứng chỉ bị mờ, AI không đọc được số hiệu.',
  },
  {
    document: 'EV-02',
    documentName: 'Bằng cử nhân',
    request: 'Bổ sung giấy tờ xác nhận thay đổi họ tên.',
    title: 'Cần xem lại: họ tên không khớp',
    detail: 'Họ tên trên bằng cấp khác với họ tên đăng ký.',
  },
]

const mockPage = (text: string) => ({ paragraphs: [text], notes: [] })

export function getMockApplicationDetail(
  id: string
): ApplicationDetail | undefined {
  const app = mockApplications.find((a) => a.id === id)
  if (!app) return undefined
  const at = (minutes: number) =>
    new Date(
      new Date(app.submittedAt).getTime() + minutes * 60_000
    ).toISOString()
  const flags = flagTemplates
    .slice(0, app.aiFlags)
    .map((f, i) => ({ id: `F${i + 1}`, ...f }))
  return {
    ...app,
    birthDate: '1988-04-12',
    jobTitle: 'Trưởng phòng Tư vấn Thuế',
    company: 'Công ty TNHH Tư vấn Thuế An Phát',
    location: 'TP. Hồ Chí Minh',
    bio: `${app.years} năm tư vấn và quyết toán thuế TNDN cho doanh nghiệp vừa và nhỏ.`,
    fields: ['Thuế TNDN', 'Quyết toán thuế', 'Kế toán doanh nghiệp'],
    highlights:
      'Phụ trách quyết toán thuế TNDN cho khoảng 40 doanh nghiệp; rà soát chi phí được trừ, ưu đãi thuế.',
    screening: {
      ranAt: app.submittedAt,
      rerunAt: flags.length
        ? new Date(
            new Date(app.submittedAt).getTime() + 2 * 86_400_000
          ).toISOString()
        : undefined,
      checkedCount: 10,
      flags,
      legalChecks: [
        {
          item: 'Số năm kinh nghiệm kê khai',
          result: 'declared',
          note: `${app.years} năm; điều kiện tối thiểu 5 năm.`,
        },
        {
          item: 'EV-01 [Tên giấy tờ]',
          result: 'present',
          note: 'Đọc được số hiệu và ngày cấp.',
          document: 'ChungChiHanhNgheThue.pdf',
        },
        {
          item: 'EV-02 [Tên giấy tờ]',
          result: 'present',
          note: '2 file, cùng một văn bằng.',
          document: 'BangCuNhan (2 file)',
        },
        {
          item: 'EV-03 [Tên giấy tờ]',
          result: flags.length ? 'review' : 'present',
          note: flags.length
            ? 'Chỉ xác nhận giai đoạn tại An Phát.'
            : 'Xác nhận đủ các giai đoạn công tác.',
          document: 'XacNhanCongTac.pdf',
        },
      ],
    },
    documents: [
      {
        code: 'CV',
        name: 'CV_NguyenMinhAnh_2026.pdf',
        pages: [
          mockPage('Sơ yếu lý lịch và quá trình công tác của người đăng ký.'),
        ],
      },
      {
        code: 'EV-01',
        name: 'ChungChiHanhNgheThue_NMA.pdf',
        pages: [
          mockPage(
            'Chứng chỉ hành nghề dịch vụ làm thủ tục về thuế, còn hiệu lực.'
          ),
        ],
      },
      {
        code: 'EV-02',
        name: 'BangCuNhan_KeToan (2 file)',
        pages: [mockPage('Bằng cử nhân chuyên ngành Kế toán.')],
      },
      {
        code: 'EV-03',
        name: 'XacNhanCongTac_AnPhat.pdf',
        pages: [
          {
            title: 'GIẤY XÁC NHẬN CÔNG TÁC',
            paragraphs: [
              `Công ty TNHH Tư vấn Thuế An Phát xác nhận bà ${app.name} công tác tại công ty từ tháng 03/2021 đến nay, chức danh Trưởng phòng Tư vấn Thuế.`,
              'Nhiệm vụ chính: phụ trách quyết toán thuế TNDN, rà soát chi phí được trừ và ưu đãi thuế cho khách hàng doanh nghiệp.',
            ],
            notes: [
              ...flags.slice(0, 1).map((f) => ({
                kind: 'ai' as const,
                label: 'AI · Cần xem lại',
                text: 'Giai đoạn công tác ở giấy này ngắn hơn CV kê khai; CV có thêm 07/2017 – 02/2021 tại Sao Việt nhưng không có giấy xác nhận.',
                flagId: f.id,
              })),
              {
                kind: 'ai',
                label: 'AI · Khớp',
                text: "Nhiệm vụ trên giấy khớp mô tả 'Kinh nghiệm nổi bật' trong hồ sơ.",
              },
            ],
          },
        ],
      },
      {
        code: 'EV-04',
        name: 'EV04_scan.pdf',
        pages: [mockPage('Bản scan giấy tờ bổ sung.')],
      },
      { code: 'EV-05', name: '[Giấy tờ EV-05].pdf', pages: [] },
    ],
    history: [
      { at: app.submittedAt, actor: app.name, text: 'Nộp hồ sơ.' },
      {
        at: at(3),
        actor: 'AI',
        text: 'Kiểm tra giấy tờ pháp lý: thiếu EV-05, EV-04 không đọc được. Chuyển Cần bổ sung.',
      },
      {
        at: at(2 * 1440 + 4 * 60),
        actor: app.name,
        text: 'Gửi bổ sung EV-04, EV-05.',
      },
      {
        at: at(2 * 1440 + 4 * 60 + 7),
        actor: 'AI',
        text: `Chạy lại đối soát sau bổ sung. ${flags.length} mục cần xem lại.`,
      },
    ],
  }
}
