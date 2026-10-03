/* ════════════════════════════════════════════════════════════════════
 * MOCK DATA — đang dùng dữ liệu giả, chưa nối API.
 * TODO(api): thay bằng API, đặt trong features/admin/api/, gọi bằng useQuery của @tanstack/react-query:
 *   - mockApplications        → GET danh sách hồ sơ expert (vd. /api/admin/expert-applications)
 *   - getMockApplicationDetail → GET chi tiết hồ sơ (vd. /api/admin/expert-applications/:id)
 *   - mockCriteria            → GET tiêu chí đánh giá năng lực từ cấu hình
 * ════════════════════════════════════════════════════════════════════ */
import type { ApplicationDetail, Criterion, ExpertApplication } from './types'

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

export const mockCriteria: Criterion[] = [1, 2, 3, 4, 5].map((n) => ({
  id: `C${n}`,
  name: `[Tên tiêu chí C${n}]`,
  description: '[Mô tả ngắn tiêu chí từ cấu hình]',
}))

const flagTemplates = [
  {
    title: 'Cần xem lại: giai đoạn công tác 07/2017 – 02/2021',
    detail:
      'CV kê khai giai đoạn 07/2017 – 02/2021 tại Công ty Kiểm toán Sao Việt nhưng hồ sơ không có giấy xác nhận cho giai đoạn này. Giấy tờ hiện có chỉ xác nhận giai đoạn từ 03/2021.',
  },
  {
    title: 'Cần xem lại: số chứng chỉ không đọc được',
    detail: 'Ảnh chụp chứng chỉ bị mờ, AI không đọc được số hiệu.',
  },
  {
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
  const flags = flagTemplates
    .slice(0, app.aiFlags)
    .map((f, i) => ({ id: `F${i + 1}`, ...f }))
  return {
    ...app,
    phone: '0912 345 678',
    jobTitle: 'Trưởng phòng Tư vấn Thuế',
    company: 'Công ty TNHH Tư vấn An Phát',
    bio: 'Chuyên tư vấn thuế doanh nghiệp, quyết toán thuế TNDN và TNCN.',
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
      { at: app.submittedAt, text: 'Nộp hồ sơ' },
      { at: app.submittedAt, text: 'AI sàng lọc hoàn tất' },
      {
        at: app.submittedAt,
        text: 'Đối soát tài liệu và giấy tờ pháp lý hoàn tất',
      },
    ],
  }
}
