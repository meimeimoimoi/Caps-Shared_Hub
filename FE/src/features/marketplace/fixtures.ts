/* Dữ liệu mock Sàn Chuyên gia (lấy từ mẫu FE/code.html): danh sách ở /marketplace và hồ sơ /experts/:id (chế độ demo).
   Thay bằng API khi BE có endpoint marketplace. */

export type RoleKey = 'tax' | 'chief' | 'legal' | 'cit'

export type Expert = {
  id: number
  name: string
  initials: string
  color: string
  role: RoleKey
  roleTitle: string
  subtitle: string
  years: number
  rating: number
  reviews: number
  price: number
  tags: string[]
  desc: string
  bio: string
}

export const EXPERTS: Expert[] = [
  {
    id: 1,
    name: 'Đỗ Hoàng Long',
    initials: 'ĐL',
    color: '#C2410C',
    role: 'tax',
    roleTitle: 'ĐẠI LÝ THUẾ BỘ TÀI CHÍNH',
    subtitle: 'Bộ Tài chính cấp CCHN · 16 năm KN',
    years: 16,
    rating: 4.95,
    reviews: 58,
    price: 1800000,
    tags: ['Thanh tra thuế TNDN', 'Chuyển giá & GD liên kết', 'Hoàn thuế VAT'],
    desc: 'Chỉ đạo giải trình thanh tra thuế cho 240+ FDI & khối sản xuất, xử lý chi phí lãi vay NĐ 132.',
    bio: 'Chuyên gia có hơn 16 năm chỉ đạo các chuyên án giải trình thanh tra thuế cho hơn 240 doanh nghiệp FDI và khối sản xuất. Thành thạo xử lý chi phí lãi vay theo Nghị định 132, tranh chấp chuyển giá và thủ tục hoàn thuế xuất khẩu.',
  },
  {
    id: 2,
    name: 'ThS. Nguyễn Mai Phương',
    initials: 'MP',
    color: '#2563EB',
    role: 'chief',
    roleTitle: 'KẾ TOÁN TRƯỞNG BIG4 & FDI',
    subtitle: 'Cựu Trưởng nhóm PwC · 14 năm KN',
    years: 14,
    rating: 4.9,
    reviews: 46,
    price: 1500000,
    tags: ['Soát xét rủi ro BCTC', 'Chi phí hợp lý', 'Tối ưu TNDN FDI'],
    desc: 'Tốt nghiệp Thạc sĩ tại Anh, 14 năm kinh nghiệm kiểm toán BCTC và tái thiết hệ thống kế toán nội bộ chuỗi.',
    bio: 'Chuyên gia tài chính doanh nghiệp tốt nghiệp Thạc sĩ tại Anh, 14 năm kinh nghiệm kiểm toán BCTC và tái thiết hệ thống kế toán nội bộ cho các tập đoàn bán lẻ quy mô lớn.',
  },
  {
    id: 3,
    name: 'LS. Vũ Trọng Nghĩa',
    initials: 'TN',
    color: '#006C4E',
    role: 'legal',
    roleTitle: 'LUẬT SƯ TRANH CHẤP THUẾ',
    subtitle: 'Đoàn Luật sư TP.HCM · 18 năm KN',
    years: 18,
    rating: 5,
    reviews: 62,
    price: 2200000,
    tags: ['Khiếu nại thuế', 'Miễn giảm ưu đãi ĐT', 'Pháp lý M&A'],
    desc: 'Hơn 18 năm đại diện bảo vệ quyền lợi doanh nghiệp trước quyết định xử phạt vi phạm hành chính về thuế và ưu đãi.',
    bio: 'Hơn 18 năm kinh nghiệm đại diện bảo vệ quyền lợi hợp pháp của doanh nghiệp trước các quyết định xử phạt vi phạm hành chính về thuế, đàm phán truy thu và ưu đãi đầu tư.',
  },
  {
    id: 4,
    name: 'Trần Thị Thu Hằng',
    initials: 'TH',
    color: '#B45309',
    role: 'tax',
    roleTitle: 'ĐẠI LÝ THUẾ & THẨM ĐỊNH',
    subtitle: 'Chi hội Kế toán thuế HN · 11 năm KN',
    years: 11,
    rating: 4.85,
    reviews: 34,
    price: 1200000,
    tags: ['Quyết toán thuế năm', 'Kế toán xây dựng', 'Hóa đơn điện tử'],
    desc: 'Rà soát số liệu quyết toán thuế thường niên cho các nhà thầu thi công xây dựng và đơn vị thương mại điện tử.',
    bio: 'Chuyên gia rà soát số liệu quyết toán thuế thường niên cho các nhà thầu thi công xây dựng và đơn vị thương mại điện tử. Tối ưu việc đối soát hóa đơn điện tử tự động.',
  },
  {
    id: 5,
    name: 'Lê Khắc Tuấn',
    initials: 'KT',
    color: '#2563EB',
    role: 'chief',
    roleTitle: 'TRƯỞNG BAN KIỂM SOÁT THUẾ',
    subtitle: 'Tập đoàn Bán lẻ Đa quốc gia · 15 năm KN',
    years: 15,
    rating: 4.92,
    reviews: 41,
    price: 1600000,
    tags: ['Tối ưu dòng tiền thuế', 'Thanh tra liên ngành', 'Chuẩn hóa BCTC'],
    desc: 'Cân đối dòng tiền, chuẩn bị hồ sơ thanh tra liên ngành thuế - hải quan và chuẩn hóa hệ thống báo cáo kiểm toán tuân thủ.',
    bio: 'Chuyên sâu về cân đối dòng tiền, chuẩn bị hồ sơ thanh tra liên ngành thuế - hải quan và chuẩn hóa hệ thống báo cáo kiểm toán tuân thủ cho doanh nghiệp chuỗi.',
  },
  {
    id: 6,
    name: 'Bùi Minh Triết',
    initials: 'BT',
    color: '#C2410C',
    role: 'cit',
    roleTitle: 'TƯ VẤN THUẾ QUỐC TẾ',
    subtitle: 'Chuyên gia Chuyển giá OECD · 19 năm KN',
    years: 19,
    rating: 4.98,
    reviews: 79,
    price: 2500000,
    tags: [
      'Tránh đánh thuế 2 lần',
      'Chuyển giá OECD',
      'Logistics & E-commerce',
    ],
    desc: '19 năm cố vấn hiệp định thuế song phương, chuyển giá quốc tế theo OECD và giá thị trường GD liên kết.',
    bio: 'Kinh nghiệm 19 năm cố vấn hiệp định thuế song phương, quy chuẩn chuyển giá quốc tế theo hướng dẫn OECD và thiết lập giá thị trường trong giao dịch liên kết xuyên biên giới.',
  },
  {
    id: 7,
    name: 'Phạm Thanh Thảo',
    initials: 'PT',
    color: '#006C4E',
    role: 'cit',
    roleTitle: 'RÀ SOÁT & QUYẾT TOÁN THUẾ',
    subtitle: 'Chuyên viên Kiểm toán cấp cao · 10 năm KN',
    years: 10,
    rating: 4.88,
    reviews: 29,
    price: 1200000,
    tags: [
      'Thuế Sản xuất & Gia công',
      'Chi phí trích trước',
      'Rà soát tự động AI',
    ],
    desc: 'Chuyên môn cao về chi phí hợp lý của may mặc và gia công, ứng dụng quy trình SHUB AI Audit phát hiện sai lệch.',
    bio: 'Chuyên môn cao về chi phí hợp lý của các doanh nghiệp gia công may mặc và sản xuất công nghiệp nhẹ. Ứng dụng quy trình SHUB AI Audit để phát hiện sai lệch chỉ số nhanh chóng.',
  },
  {
    id: 8,
    name: 'LS. Hoàng Quốc Hưng',
    initials: 'HQ',
    color: '#B45309',
    role: 'legal',
    roleTitle: 'TÁI CẤU TRÚC VỐN & THUẾ',
    subtitle: 'Luật sư InvestLaw · 13 năm KN',
    years: 13,
    rating: 4.9,
    reviews: 37,
    price: 1700000,
    tags: [
      'Tái cơ cấu doanh nghiệp',
      'Vốn đầu tư nước ngoài',
      'Thuế TNCN & ESOP',
    ],
    desc: 'Tư vấn cấu trúc thuế trong các thương vụ M&A, chính sách quyền chọn cổ phần ESOP và dòng vốn FDI.',
    bio: 'Tư vấn cấu trúc thuế trong các thương vụ M&A, giải quyết quyền lợi thuế thu nhập cá nhân đối với chính sách quyền chọn mua cổ phần ESOP và dòng vốn đầu tư trực tiếp nước ngoài.',
  },
]

const currency = new Intl.NumberFormat('vi-VN')
export const money = (n: number) => `${currency.format(n)}đ`

export function packagesFor(e: Expert) {
  return [
    {
      title: 'Tư vấn trực tuyến qua Video (60 phút)',
      desc: 'Giải đáp tình huống khẩn cấp, rà soát văn bản sơ bộ.',
      price: e.price,
    },
    {
      title: 'Soát xét toàn diện bộ hồ sơ quyết toán',
      desc: 'Lập bảng phân tích rủi ro 28 tiêu chí và báo cáo kiến nghị.',
      price: 6500000,
    },
    {
      title: 'Đại diện làm việc cùng đoàn kiểm tra thuế',
      desc: 'Soạn công văn bảo vệ số liệu và trực tiếp đối thoại tại cơ quan thuế.',
      price: 15000000,
    },
  ]
}
