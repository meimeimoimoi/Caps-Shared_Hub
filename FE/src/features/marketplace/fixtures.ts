/* Dữ liệu mock Sàn Chuyên gia: danh sách ở /marketplace và hồ sơ /experts/:id (chế độ demo).
   Mô hình theo Flow 5 / POL-MKT-01: một chuyên gia chỉ xuất hiện cho một dịch vụ khi đã
   APPROVED_FOR_SERVICE (Gate 2 theo dịch vụ) và có Pricing Version APPROVED còn hiệu lực;
   giá + Delivery SLA thuộc cặp Chuyên gia–Dịch vụ. Thay bằng API khi BE có endpoint marketplace. */

/* Ảnh chân dung minh họa (chọn từ bộ ảnh mẫu của nhóm, thu về 240×240 WebP); thay bằng ảnh chuyên gia tải lên khi có API. */
import avatarDoHoangLong from './assets/avatars/do-hoang-long.webp'
import avatarNguyenMaiPhuong from './assets/avatars/nguyen-mai-phuong.webp'
import avatarVuTrongNghia from './assets/avatars/vu-trong-nghia.webp'
import avatarTranThiThuHang from './assets/avatars/tran-thi-thu-hang.webp'
import avatarLeKhacTuan from './assets/avatars/le-khac-tuan.webp'
import avatarBuiMinhTriet from './assets/avatars/bui-minh-triet.webp'
import avatarPhamThanhThao from './assets/avatars/pham-thanh-thao.webp'
import avatarHoangQuocHung from './assets/avatars/hoang-quoc-hung.webp'

export const SERVICE_IDS = [
  'cit-review',
  'cit-compliance',
  'cit-consultation',
] as const
export type ServiceId = (typeof SERVICE_IDS)[number]

/** Tên gốc khớp danh mục dịch vụ của Expert Portal; giao diện hiển thị bản dịch theo serviceId. */
export const SERVICE_NAMES: Record<ServiceId, string> = {
  'cit-review': 'CIT draft verification',
  'cit-compliance': 'CIT compliance assessment',
  'cit-consultation': 'CIT consultation',
}

export const isServiceId = (value: unknown): value is ServiceId =>
  SERVICE_IDS.includes(value as ServiceId)

/** Ưu đãi đã được duyệt cho một cặp Chuyên gia–Dịch vụ. */
export type ServiceOffer = {
  price: number
  /** Delivery SLA (giờ lịch) tính từ khi chuyên gia START review. */
  slaHours: number
  pricingVersion: string
  /** Ngày Gate 2 = PASS và Final Approval cho dịch vụ này. */
  approvedAt: string
}

export type Availability =
  | { state: 'open'; responseHours: number }
  | { state: 'full'; reopensAt: string }
  | { state: 'paused' }

export type Expert = {
  id: number
  name: string
  initials: string
  /** Ảnh đại diện (URL); thiếu thì giao diện hiện chữ viết tắt */
  avatar?: string
  headline: string
  credential: string
  location: string
  years: number
  rating: number
  reviews: number
  completedCases: number
  /** Ngày Gate 1 (điều kiện tham gia ở cấp Expert) = PASS. */
  eligibleSince: string
  availability: Availability
  offers: Partial<Record<ServiceId, ServiceOffer>>
  topics: string[]
  summary: string
  bio: string
  highlights: string[]
}

export const EXPERTS: Expert[] = [
  {
    id: 1,
    name: 'Đỗ Hoàng Long',
    initials: 'ĐL',
    avatar: avatarDoHoangLong,
    headline: 'Đại lý thuế · Nguyên trưởng nhóm thuế doanh nghiệp FDI',
    credential: 'Chứng chỉ hành nghề dịch vụ thuế (2012)',
    location: 'TP. Hồ Chí Minh',
    years: 16,
    rating: 4.95,
    reviews: 58,
    completedCases: 212,
    eligibleSince: '2026-03-04',
    availability: { state: 'open', responseHours: 4 },
    offers: {
      'cit-review': {
        price: 2400000,
        slaHours: 48,
        pricingVersion: 'v3',
        approvedAt: '2026-03-19',
      },
      'cit-compliance': {
        price: 6800000,
        slaHours: 120,
        pricingVersion: 'v2',
        approvedAt: '2026-04-02',
      },
    },
    topics: ['Chi phí lãi vay', 'Giao dịch liên kết', 'Chi phí được trừ'],
    summary:
      'Rà soát quyết toán TNDN cho doanh nghiệp FDI sản xuất, trọng tâm chi phí lãi vay và giao dịch liên kết.',
    bio: 'Hơn 16 năm làm thuế doanh nghiệp cho khối FDI sản xuất. Mỗi bản thẩm định đều chỉ rõ Điều, Khoản được áp dụng để kế toán có thể điều chỉnh ngay trên tờ khai.',
    highlights: [
      'Đã thẩm định hơn 200 hồ sơ quyết toán TNDN trên Shared Hub',
      'Chứng chỉ hành nghề dịch vụ làm thủ tục về thuế',
    ],
  },
  {
    id: 2,
    name: 'ThS. Nguyễn Mai Phương',
    initials: 'MP',
    avatar: avatarNguyenMaiPhuong,
    headline: 'Kế toán trưởng · Nguyên trưởng nhóm kiểm toán Big Four',
    credential: 'Chứng chỉ Kế toán trưởng · ACCA',
    location: 'Hà Nội',
    years: 14,
    rating: 4.9,
    reviews: 46,
    completedCases: 167,
    eligibleSince: '2026-02-11',
    availability: { state: 'open', responseHours: 6 },
    offers: {
      'cit-review': {
        price: 1900000,
        slaHours: 72,
        pricingVersion: 'v2',
        approvedAt: '2026-02-27',
      },
      'cit-consultation': {
        price: 1500000,
        slaHours: 24,
        pricingVersion: 'v1',
        approvedAt: '2026-03-10',
      },
    },
    topics: ['Chi phí phúc lợi', 'Trích lập dự phòng', 'Doanh thu tính thuế'],
    summary:
      'Thẩm định bản nháp tờ khai 03/TNDN cho chuỗi bán lẻ, đối chiếu chi phí với chứng từ và hạn mức.',
    bio: 'Mười bốn năm kiểm toán báo cáo tài chính và xây dựng lại hệ thống kế toán nội bộ cho các chuỗi bán lẻ. Tập trung vào điều kiện chi phí được trừ và hạn mức chi phúc lợi.',
    highlights: [
      'Thạc sĩ Tài chính, Đại học Leeds',
      'Trưởng nhóm kiểm toán 6 năm tại Big Four',
    ],
  },
  {
    id: 3,
    name: 'LS. Vũ Trọng Nghĩa',
    initials: 'TN',
    avatar: avatarVuTrongNghia,
    headline: 'Luật sư thuế · Đoàn Luật sư TP. Hồ Chí Minh',
    credential: 'Thẻ luật sư · Đoàn Luật sư TP.HCM',
    location: 'TP. Hồ Chí Minh',
    years: 18,
    rating: 5,
    reviews: 62,
    completedCases: 141,
    eligibleSince: '2026-01-20',
    availability: { state: 'full', reopensAt: '2026-10-16' },
    offers: {
      'cit-consultation': {
        price: 2600000,
        slaHours: 48,
        pricingVersion: 'v2',
        approvedAt: '2026-02-05',
      },
      'cit-compliance': {
        price: 8500000,
        slaHours: 168,
        pricingVersion: 'v1',
        approvedAt: '2026-02-05',
      },
    },
    topics: ['Ưu đãi thuế TNDN', 'Xử phạt vi phạm', 'Giải trình cơ quan thuế'],
    summary:
      'Đánh giá rủi ro pháp lý của hồ sơ ưu đãi thuế TNDN trước khi doanh nghiệp làm việc với cơ quan thuế.',
    bio: 'Hơn 18 năm đại diện doanh nghiệp trong các vụ việc về ưu đãi thuế TNDN và quyết định xử phạt. Kết luận luôn tách rõ căn cứ pháp lý, dữ kiện doanh nghiệp cung cấp và nhận định chuyên môn.',
    highlights: [
      'Đại diện hơn 60 doanh nghiệp trong giải trình ưu đãi đầu tư',
      'Giảng viên thỉnh giảng Luật Thuế',
    ],
  },
  {
    id: 4,
    name: 'Trần Thị Thu Hằng',
    initials: 'TH',
    avatar: avatarTranThiThuHang,
    headline: 'Đại lý thuế · Quyết toán cho nhà thầu xây dựng',
    credential: 'Chứng chỉ hành nghề dịch vụ thuế (2016)',
    location: 'Hà Nội',
    years: 11,
    rating: 4.85,
    reviews: 34,
    completedCases: 96,
    eligibleSince: '2026-04-08',
    availability: { state: 'open', responseHours: 3 },
    offers: {
      'cit-review': {
        price: 1500000,
        slaHours: 48,
        pricingVersion: 'v1',
        approvedAt: '2026-04-21',
      },
    },
    topics: ['Doanh thu theo tiến độ', 'Chi phí công trình', 'Quyết toán năm'],
    summary:
      'Thẩm định bản nháp quyết toán TNDN cho nhà thầu xây dựng, xử lý doanh thu và chi phí theo tiến độ.',
    bio: 'Chuyên rà soát số liệu quyết toán TNDN hằng năm cho nhà thầu thi công xây dựng, nơi doanh thu và chi phí ghi nhận theo tiến độ dễ lệch kỳ tính thuế.',
    highlights: ['Hơn 90 hồ sơ quyết toán ngành xây dựng đã bàn giao'],
  },
  {
    id: 5,
    name: 'Lê Khắc Tuấn',
    initials: 'KT',
    avatar: avatarLeKhacTuan,
    headline: 'Trưởng ban kiểm soát thuế · Tập đoàn bán lẻ đa quốc gia',
    credential: 'CPA Việt Nam',
    location: 'Đà Nẵng',
    years: 15,
    rating: 4.92,
    reviews: 41,
    completedCases: 118,
    eligibleSince: '2026-02-24',
    availability: { state: 'open', responseHours: 8 },
    offers: {
      'cit-review': {
        price: 2100000,
        slaHours: 72,
        pricingVersion: 'v2',
        approvedAt: '2026-03-12',
      },
      'cit-compliance': {
        price: 7200000,
        slaHours: 144,
        pricingVersion: 'v2',
        approvedAt: '2026-03-30',
      },
    },
    topics: ['Chuyển lỗ', 'Chi phí quản lý tập đoàn', 'Hồ sơ kiểm tra thuế'],
    summary:
      'Đánh giá mức độ tuân thủ TNDN của bộ hồ sơ trước kỳ kiểm tra, lập danh mục rủi ro có căn cứ.',
    bio: 'Mười lăm năm kiểm soát thuế cho doanh nghiệp chuỗi đa quốc gia. Kinh nghiệm sâu về chuyển lỗ, phân bổ chi phí quản lý của công ty mẹ và chuẩn bị hồ sơ trước kiểm tra thuế.',
    highlights: ['Chuẩn bị hồ sơ cho 30+ đợt kiểm tra thuế tại doanh nghiệp'],
  },
  {
    id: 6,
    name: 'Bùi Minh Triết',
    initials: 'BT',
    avatar: avatarBuiMinhTriet,
    headline: 'Tư vấn thuế quốc tế · Chuyên gia giao dịch liên kết',
    credential: 'Chứng chỉ hành nghề dịch vụ thuế · ADIT',
    location: 'TP. Hồ Chí Minh',
    years: 19,
    rating: 4.98,
    reviews: 79,
    completedCases: 254,
    eligibleSince: '2026-01-15',
    availability: { state: 'open', responseHours: 12 },
    offers: {
      'cit-review': {
        price: 3200000,
        slaHours: 72,
        pricingVersion: 'v4',
        approvedAt: '2026-01-29',
      },
      'cit-consultation': {
        price: 2800000,
        slaHours: 24,
        pricingVersion: 'v3',
        approvedAt: '2026-01-29',
      },
      'cit-compliance': {
        price: 9800000,
        slaHours: 168,
        pricingVersion: 'v2',
        approvedAt: '2026-02-16',
      },
    },
    topics: ['Giao dịch liên kết', 'Hiệp định thuế', 'Giá thị trường'],
    summary:
      'Thẩm định phần giao dịch liên kết trong hồ sơ TNDN, đối chiếu phương pháp xác định giá thị trường.',
    bio: 'Mười chín năm tư vấn hiệp định tránh đánh thuế hai lần và xác định giá giao dịch liên kết cho doanh nghiệp có công ty mẹ ở nước ngoài.',
    highlights: [
      'Hơn 250 vụ việc giao dịch liên kết đã hoàn tất',
      'Advanced Diploma in International Taxation (ADIT)',
    ],
  },
  {
    id: 7,
    name: 'Phạm Thanh Thảo',
    initials: 'PT',
    avatar: avatarPhamThanhThao,
    headline: 'Kiểm toán viên cấp cao · Ngành sản xuất và gia công',
    credential: 'CPA Việt Nam',
    location: 'Bình Dương',
    years: 10,
    rating: 4.88,
    reviews: 29,
    completedCases: 74,
    eligibleSince: '2026-05-06',
    availability: { state: 'paused' },
    offers: {
      'cit-review': {
        price: 1400000,
        slaHours: 48,
        pricingVersion: 'v1',
        approvedAt: '2026-05-20',
      },
      'cit-consultation': {
        price: 1100000,
        slaHours: 24,
        pricingVersion: 'v1',
        approvedAt: '2026-05-20',
      },
    },
    topics: ['Chi phí trích trước', 'Gia công xuất khẩu', 'Khấu hao TSCĐ'],
    summary:
      'Thẩm định bản nháp TNDN cho doanh nghiệp gia công, trọng tâm chi phí trích trước và khấu hao.',
    bio: 'Chuyên môn về điều kiện chi phí được trừ của doanh nghiệp gia công may mặc và sản xuất công nghiệp nhẹ, đặc biệt là chi phí trích trước và khấu hao tài sản cố định.',
    highlights: ['Kiểm toán viên cấp cao 7 năm tại công ty kiểm toán độc lập'],
  },
  {
    id: 8,
    name: 'LS. Hoàng Quốc Hưng',
    initials: 'HQ',
    avatar: avatarHoangQuocHung,
    headline: 'Luật sư · Tái cấu trúc doanh nghiệp và thuế TNDN',
    credential: 'Thẻ luật sư · Đoàn Luật sư Hà Nội',
    location: 'Hà Nội',
    years: 13,
    rating: 4.9,
    reviews: 37,
    completedCases: 88,
    eligibleSince: '2026-03-18',
    availability: { state: 'open', responseHours: 6 },
    offers: {
      'cit-consultation': {
        price: 2200000,
        slaHours: 48,
        pricingVersion: 'v1',
        approvedAt: '2026-04-01',
      },
      'cit-compliance': {
        price: 7800000,
        slaHours: 144,
        pricingVersion: 'v1',
        approvedAt: '2026-04-14',
      },
    },
    topics: ['Sáp nhập, chia tách', 'Chuyển nhượng vốn', 'Thu nhập khác'],
    summary:
      'Tư vấn hệ quả TNDN của sáp nhập, chia tách và chuyển nhượng vốn, kết luận kèm căn cứ.',
    bio: 'Tư vấn hệ quả thuế TNDN trong sáp nhập, chia tách doanh nghiệp và chuyển nhượng vốn, gồm xác định thu nhập khác và nghĩa vụ kê khai sau giao dịch.',
    highlights: ['Tư vấn thuế cho 40+ thương vụ tái cấu trúc'],
  },
]

export const findExpert = (id: string | undefined) =>
  EXPERTS.find((e) => String(e.id) === id)

/** Chỉ được gửi yêu cầu khi chuyên gia đang nhận việc (Availability tại thời điểm tìm kiếm). */
export const canRequest = (e: Expert) => e.availability.state === 'open'

/** Phí thấp nhất trong các dịch vụ chuyên gia đã được duyệt */
export const lowestFee = (e: Expert) =>
  Math.min(...Object.values(e.offers).map((offer) => offer.price))

/** Chuyên gia đang nhận việc có đánh giá cao nhất (trừ excludeId nếu có) */
export const featuredExperts = (count: number, excludeId?: string) =>
  EXPERTS.filter((e) => canRequest(e) && String(e.id) !== excludeId)
    .sort((a, b) => b.rating - a.rating || b.reviews - a.reviews)
    .slice(0, count)
