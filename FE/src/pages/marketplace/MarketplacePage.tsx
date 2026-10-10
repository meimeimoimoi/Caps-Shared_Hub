import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import './marketplace.css'

/* Trang Sàn Chuyên gia, theo mẫu FE/code.html (Stitch).
   Dữ liệu là mock lấy từ mẫu, thay bằng API khi có. */

type RoleKey = 'tax' | 'chief' | 'legal' | 'cit'
type SortKey = 'rating' | 'exp' | 'price-asc' | 'price-desc'
type ExpKey = 'all' | 'under12' | '12to15' | 'over15'
type PriceKey = 'all' | 'under1.5' | '1.5to2.0' | 'over2.0'

type Expert = {
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
  benchmark: boolean
  tags: string[]
  desc: string
  bio: string
}

const EXPERTS: Expert[] = [
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
    benchmark: true,
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
    benchmark: true,
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
    benchmark: true,
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
    benchmark: true,
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
    benchmark: true,
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
    benchmark: true,
    tags: ['Tránh đánh thuế 2 lần', 'Chuyển giá OECD', 'Logistics & E-commerce'],
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
    benchmark: true,
    tags: ['Thuế Sản xuất & Gia công', 'Chi phí trích trước', 'Rà soát tự động AI'],
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
    benchmark: true,
    tags: ['Tái cơ cấu doanh nghiệp', 'Vốn đầu tư nước ngoài', 'Thuế TNCN & ESOP'],
    desc: 'Tư vấn cấu trúc thuế trong các thương vụ M&A, chính sách quyền chọn cổ phần ESOP và dòng vốn FDI.',
    bio: 'Tư vấn cấu trúc thuế trong các thương vụ M&A, giải quyết quyền lợi thuế thu nhập cá nhân đối với chính sách quyền chọn mua cổ phần ESOP và dòng vốn đầu tư trực tiếp nước ngoài.',
  },
]

const ROLE_OPTIONS: { value: RoleKey | 'all'; label: string }[] = [
  { value: 'all', label: 'Tất cả vai trò' },
  { value: 'tax', label: 'Đại lý thuế' },
  { value: 'chief', label: 'Kế toán trưởng' },
  { value: 'legal', label: 'Luật sư / Pháp lý' },
  { value: 'cit', label: 'Rà soát TNDN & Chuyển giá' },
]

const EXP_OPTIONS: { value: ExpKey; label: string }[] = [
  { value: 'all', label: 'Tất cả số năm' },
  { value: 'under12', label: 'Dưới 12 năm' },
  { value: '12to15', label: '12 - 15 năm' },
  { value: 'over15', label: 'Trên 15 năm' },
]

const PRICE_OPTIONS: { value: PriceKey; label: string }[] = [
  { value: 'all', label: 'Tất cả mức phí' },
  { value: 'under1.5', label: 'Dưới 1.500.000đ' },
  { value: '1.5to2.0', label: '1.500.000đ - 2.000.000đ' },
  { value: 'over2.0', label: 'Trên 2.000.000đ' },
]

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'rating', label: 'Đánh giá cao nhất' },
  { value: 'exp', label: 'Năm kinh nghiệm (Cao - Thấp)' },
  { value: 'price-asc', label: 'Phí tư vấn (Thấp - Cao)' },
  { value: 'price-desc', label: 'Phí tư vấn (Cao - Thấp)' },
]

const PAGE_SIZE = 8

const currency = new Intl.NumberFormat('vi-VN')
const money = (n: number) => `${currency.format(n)}đ`

function matchesExp(years: number, key: ExpKey) {
  if (key === 'under12') return years < 12
  if (key === '12to15') return years >= 12 && years <= 15
  if (key === 'over15') return years > 15
  return true
}

function matchesPrice(price: number, key: PriceKey) {
  if (key === 'under1.5') return price < 1500000
  if (key === '1.5to2.0') return price >= 1500000 && price <= 2000000
  if (key === 'over2.0') return price > 2000000
  return true
}

function packagesFor(e: Expert) {
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

function Icon({ name, className, filled }: { name: string; className?: string; filled?: boolean }) {
  return (
    <span
      className={`material-symbols-outlined mk-icon${className ? ` ${className}` : ''}`}
      style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
      aria-hidden="true"
    >
      {name}
    </span>
  )
}

function ShieldMark() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 13c0 5-3.5 7.5-7.7 9a1 1 0 0 1-.7 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1.2 1.2 0 0 1 1.5 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

type CardProps = {
  expert: Expert
  onProfile: (e: Expert) => void
  onBook: (e: Expert) => void
}

function ExpertCard({ expert: e, onProfile, onBook }: CardProps) {
  const accent = { color: e.color } as CSSProperties
  return (
    <article className="mk-card" data-role={e.role}>
      <div className="mk-card-who">
        <div className="mk-avatar-wrap">
          <div className="mk-avatar" style={{ backgroundColor: e.color }} aria-hidden="true">
            {e.initials}
          </div>
          <span className="mk-online" title="Đang nhận việc" aria-hidden="true">
            <span />
          </span>
        </div>
        <div className="mk-card-id">
          <div className="mk-name-row">
            <h3 className="mk-name">{e.name}</h3>
            <Icon name="verified" filled className="mk-verified" />
            <span className="mk-sr">Đã qua Cổng 2: Năng lực chuyên môn</span>
          </div>
          <p className="mk-role-title" style={accent}>
            {e.roleTitle}
          </p>
          <p className="mk-meta">{e.subtitle}</p>
        </div>
      </div>

      <div className="mk-card-mid">
        <div className="mk-rating-row">
          <span className="mk-rating">
            <Icon name="star" filled className="mk-star" />
            <b>{e.rating.toFixed(2)}</b>
          </span>
          <span className="mk-meta">{e.reviews} đánh giá thực tế</span>
          <span className="mk-shub">• SHUB Verified</span>
        </div>
        <ul className="mk-tags">
          {e.tags.map((tag) => (
            <li key={tag}>{tag}</li>
          ))}
        </ul>
        <p className="mk-desc">{e.desc}</p>
      </div>

      <div className="mk-card-foot">
        <div className="mk-price">
          <span className="mk-price-value">{money(e.price)}</span>
          <span className="mk-unit"> /60p</span>
          <span className="mk-escrow">Ký quỹ Escrow 100%</span>
        </div>
        <div className="mk-card-actions">
          <button type="button" className="mk-btn mk-btn-ghost" onClick={() => onProfile(e)}>
            Hồ sơ
          </button>
          <button type="button" className="mk-btn mk-btn-primary" onClick={() => onBook(e)}>
            Đặt lịch ngay
          </button>
        </div>
      </div>
    </article>
  )
}

export default function MarketplacePage() {
  const [query, setQuery] = useState('')
  const [role, setRole] = useState<RoleKey | 'all'>('all')
  const [exp, setExp] = useState<ExpKey>('all')
  const [price, setPrice] = useState<PriceKey>('all')
  const [gate2, setGate2] = useState(true)
  const [sort, setSort] = useState<SortKey>('rating')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Expert | null>(null)
  const [pkg, setPkg] = useState(0)
  const [toast, setToast] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = EXPERTS.filter((e) => {
      if (gate2 && !e.benchmark) return false
      if (role !== 'all' && e.role !== role) return false
      if (!matchesExp(e.years, exp)) return false
      if (!matchesPrice(e.price, price)) return false
      if (!q) return true
      return [e.name, e.roleTitle, e.subtitle, e.desc, ...e.tags].some((s) => s.toLowerCase().includes(q))
    })
    switch (sort) {
      case 'exp':
        return [...list].sort((a, b) => b.years - a.years)
      case 'price-asc':
        return [...list].sort((a, b) => a.price - b.price)
      case 'price-desc':
        return [...list].sort((a, b) => b.price - a.price)
      default:
        return [...list].sort((a, b) => b.rating - a.rating)
    }
  }, [query, role, exp, price, gate2, sort])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, totalPages)
  const pageItems = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)
  const rangeStart = filtered.length === 0 ? 0 : (current - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(current * PAGE_SIZE, filtered.length)

  const resetFilters = () => {
    setQuery('')
    setRole('all')
    setExp('all')
    setPrice('all')
    setGate2(true)
    setPage(1)
  }

  useEffect(() => {
    if (!selected) return
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') setSelected(null)
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [selected])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(false), 3200)
    return () => window.clearTimeout(t)
  }, [toast])

  const openModal = (e: Expert) => {
    setSelected(e)
    setPkg(0)
  }

  const proceedToBooking = () => {
    setSelected(null)
    setToast(true)
  }

  return (
    <>
      <link
        rel="stylesheet"
        precedence="default"
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Merriweather:ital,wght@0,400;0,700;1,400&display=swap"
      />
      <link
        rel="stylesheet"
        precedence="default"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
      />
      <div className="mk-root">
        <header className="mk-header">
          <div className="mk-wrap mk-nav">
            <div className="mk-nav-left">
              <Link to="/" className="mk-logo">
                <span className="mk-logo-mark">
                  <ShieldMark />
                </span>
                <span className="mk-logo-text">
                  SHUB
                  <small>Verified Expert</small>
                </span>
              </Link>
              <nav className="mk-links" aria-label="Điều hướng chính">
                <Link to="/">Trang chủ</Link>
                <Link to="/marketplace" aria-current="page" className="mk-link-active">
                  Sàn Chuyên gia
                </Link>
                <a href="#">Thẩm định 2 Cổng</a>
                <a href="#">Rà soát Thuế TNDN</a>
                <a href="#">Biểu phí &amp; Quy trình</a>
              </nav>
            </div>
            <Link to="/login" className="mk-btn mk-btn-primary mk-cta">
              <Icon name="verified_user" />
              Đăng nhập / Đăng ký Chuyên gia
            </Link>
          </div>
        </header>

        <main className="mk-wrap mk-main">
          <section className="mk-intro">
            <span className="mk-badge">
              <Icon name="verified" filled />
              Thẩm định 2 cổng độc lập
            </span>
            <h1 className="mk-title">
              Sàn Chuyên Gia <span>Thuế &amp; Pháp Lý</span>
            </h1>
            <p className="mk-subtitle">
              Kết nối trực tiếp với Đại lý thuế, Kế toán trưởng Big4 và Luật sư tranh tụng đã qua thẩm định 2 cổng khắt khe và bảo chứng ký quỹ Escrow 100%.
            </p>
            <div className="mk-trust">
              <span>
                <Icon name="verified" filled />
                100% CCHN Xác Thực
              </span>
              <span>
                <Icon name="psychology" />
                Sát hạch năng lực 12.8%
              </span>
              <span>
                <Icon name="shield" />
                Ký quỹ Escrow an toàn
              </span>
            </div>
          </section>

          <div className="mk-layout">
            <aside className="mk-filters" aria-label="Bộ lọc tìm kiếm">
              <div className="mk-filters-head">
                <div className="mk-filters-title">
                  <Icon name="tune" className="mk-accent" />
                  <h2>Bộ lọc tìm kiếm</h2>
                </div>
                <button type="button" className="mk-link-btn" onClick={resetFilters}>
                  Đặt lại
                </button>
              </div>

              <div className="mk-field">
                <label htmlFor="mk-search" className="mk-field-label">
                  Từ khóa tìm kiếm
                </label>
                <div className="mk-input-wrap">
                  <Icon name="search" className="mk-accent" />
                  <input
                    id="mk-search"
                    type="search"
                    placeholder="Tên, chuyển giá, FDI..."
                    value={query}
                    onChange={(ev) => {
                      setQuery(ev.target.value)
                      setPage(1)
                    }}
                  />
                </div>
              </div>

              <fieldset className="mk-group">
                <legend className="mk-field-label">Vai trò chuyên gia</legend>
                {ROLE_OPTIONS.map((o) => (
                  <label key={o.value} className="mk-radio">
                    <input
                      type="radio"
                      name="role"
                      value={o.value}
                      checked={role === o.value}
                      onChange={() => {
                        setRole(o.value)
                        setPage(1)
                      }}
                    />
                    <span>{o.label}</span>
                  </label>
                ))}
              </fieldset>

              <fieldset className="mk-group">
                <legend className="mk-field-label">Kinh nghiệm</legend>
                {EXP_OPTIONS.map((o) => (
                  <label key={o.value} className="mk-radio">
                    <input
                      type="radio"
                      name="exp"
                      value={o.value}
                      checked={exp === o.value}
                      onChange={() => {
                        setExp(o.value)
                        setPage(1)
                      }}
                    />
                    <span>{o.label}</span>
                  </label>
                ))}
              </fieldset>

              <fieldset className="mk-group">
                <legend className="mk-field-label">Mức phí tư vấn</legend>
                {PRICE_OPTIONS.map((o) => (
                  <label key={o.value} className="mk-radio">
                    <input
                      type="radio"
                      name="price"
                      value={o.value}
                      checked={price === o.value}
                      onChange={() => {
                        setPrice(o.value)
                        setPage(1)
                      }}
                    />
                    <span>{o.label}</span>
                  </label>
                ))}
              </fieldset>

              <label className="mk-gate">
                <input
                  type="checkbox"
                  checked={gate2}
                  onChange={(ev) => {
                    setGate2(ev.target.checked)
                    setPage(1)
                  }}
                />
                <span>
                  <strong>Cổng 2 Verified</strong>
                  <small>Chỉ chuyên gia đạt Benchmark</small>
                </span>
              </label>

              <button type="button" className="mk-btn mk-btn-ghost mk-wide" onClick={resetFilters}>
                Xóa toàn bộ lọc
              </button>
            </aside>

            <div className="mk-results">
              <div className="mk-results-bar">
                <p className="mk-count" aria-live="polite">
                  <strong>Đang hiển thị {filtered.length} chuyên gia</strong>{' '}
                  <span>(trên {EXPERTS.length} chuyên gia đủ điều kiện)</span>
                </p>
                <label className="mk-sort">
                  <span>Sắp xếp theo:</span>
                  <select value={sort} onChange={(ev) => setSort(ev.target.value as SortKey)} aria-label="Sắp xếp theo">
                    {SORT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {pageItems.length > 0 ? (
                <div className="mk-grid">
                  {pageItems.map((e) => (
                    <ExpertCard key={e.id} expert={e} onProfile={openModal} onBook={openModal} />
                  ))}
                </div>
              ) : (
                <div className="mk-empty">
                  <Icon name="person_search" className="mk-empty-icon" />
                  <h2>Không tìm thấy chuyên gia phù hợp</h2>
                  <p>Hãy thử điều chỉnh bộ lọc hoặc xóa các tiêu chí đã chọn.</p>
                  <button type="button" className="mk-btn mk-btn-primary" onClick={resetFilters}>
                    Xóa toàn bộ bộ lọc
                  </button>
                </div>
              )}

              {filtered.length > 0 && (
                <nav className="mk-pager" aria-label="Phân trang">
                  <p>
                    Hiển thị <strong>{rangeStart} - {rangeEnd}</strong> trong tổng số{' '}
                    <strong>{filtered.length} chuyên gia</strong> đã xác thực
                  </p>
                  <div className="mk-pager-btns">
                    <button
                      type="button"
                      className="mk-page-btn"
                      disabled={current <= 1}
                      onClick={() => setPage(current - 1)}
                      aria-label="Trang trước"
                    >
                      <Icon name="chevron_left" />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                      <button
                        key={n}
                        type="button"
                        className={`mk-page-btn${n === current ? ' mk-page-on' : ''}`}
                        aria-current={n === current ? 'page' : undefined}
                        onClick={() => setPage(n)}
                      >
                        {n}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="mk-page-btn"
                      disabled={current >= totalPages}
                      onClick={() => setPage(current + 1)}
                      aria-label="Trang sau"
                    >
                      <Icon name="chevron_right" />
                    </button>
                  </div>
                </nav>
              )}
            </div>
          </div>

          <p className="mk-demo">
            * Dữ liệu minh họa thực nghiệm, hồ sơ chuyên gia đã qua kiểm tra chứng chỉ hành nghề và bài kiểm tra độc lập.
          </p>
        </main>

        {selected && (
          <div className="mk-modal-backdrop" onClick={() => setSelected(null)}>
            <div
              className="mk-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="mk-modal-name"
              onClick={(ev) => ev.stopPropagation()}
            >
              <div className="mk-modal-head">
                <div className="mk-modal-who">
                  <div className="mk-modal-avatar" style={{ backgroundColor: selected.color }} aria-hidden="true">
                    {selected.initials}
                  </div>
                  <div>
                    <div className="mk-name-row">
                      <h2 id="mk-modal-name" className="mk-modal-name">
                        {selected.name}
                      </h2>
                      <Icon name="verified" filled className="mk-verified" />
                    </div>
                    <p className="mk-role-title" style={{ color: selected.color }}>
                      {selected.roleTitle}
                    </p>
                    <p className="mk-meta">{selected.subtitle}</p>
                  </div>
                </div>
                <button type="button" className="mk-icon-btn" aria-label="Đóng" onClick={() => setSelected(null)}>
                  <Icon name="close" />
                </button>
              </div>

              <div className="mk-modal-body">
                <div className="mk-callout">
                  <Icon name="verified_user" className="mk-accent" />
                  <p>
                    <strong>Đã xác minh đầy đủ:</strong> Chứng chỉ hành nghề hợp lệ do Tổng Cục Thuế ban hành. Đã ký cam kết Escrow SHUB bảo đảm bảo toàn tiền thanh toán.
                  </p>
                </div>

                <div>
                  <h3 className="mk-section-title">Tóm tắt kinh nghiệm</h3>
                  <p className="mk-bio">{selected.bio}</p>
                </div>

                <div>
                  <h3 className="mk-section-title">Các gói dịch vụ tư vấn niêm yết</h3>
                  <div className="mk-packages">
                    {packagesFor(selected).map((p, i) => (
                      <label key={p.title} className={`mk-pkg${pkg === i ? ' mk-pkg-on' : ''}`}>
                        <span className="mk-pkg-main">
                          <input type="radio" name="pkg" checked={pkg === i} onChange={() => setPkg(i)} />
                          <span>
                            <strong>{p.title}</strong>
                            <small>{p.desc}</small>
                          </span>
                        </span>
                        <span className="mk-pkg-price">{money(p.price)}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <p className="mk-escrow-note">
                  <Icon name="shield" className="mk-accent" />
                  Tiền cọc được giữ trong tài khoản Escrow SHUB. Chuyên gia chỉ nhận thanh toán khi bạn xác nhận hoàn tất buổi làm việc.
                </p>
              </div>

              <div className="mk-modal-foot">
                <button type="button" className="mk-btn mk-btn-ghost" onClick={() => setSelected(null)}>
                  Đóng
                </button>
                <button type="button" className="mk-btn mk-btn-primary" onClick={proceedToBooking}>
                  Tiếp tục Đặt lịch &amp; Ký quỹ Escrow
                </button>
              </div>
            </div>
          </div>
        )}

        {toast && (
          <div className="mk-toast" role="status">
            <Icon name="verified" filled className="mk-accent" />
            <div>
              <strong>Đang chuyển tới Cổng Escrow SHUB</strong>
              <span>Hệ thống mở lịch hẹn bảo mật trong 1 giây...</span>
            </div>
          </div>
        )}

        <footer className="mk-footer">
          <div className="mk-wrap">
            <div className="mk-footer-grid">
              <div className="mk-footer-brand">
                <div className="mk-footer-logo">
                  <span className="mk-logo-mark">
                    <ShieldMark />
                  </span>
                  <strong>SHUB Marketplace</strong>
                </div>
                <p>
                  Nền tảng kiểm định và đối ứng dịch vụ Thuế &amp; Pháp lý chuyên sâu đầu tiên tại Việt Nam kết hợp AI Audit Model và Giám định Đoàn chuyên gia Độc lập.
                </p>
                <p className="mk-footer-escrow">
                  <Icon name="verified" filled />
                  Bảo chứng ký quỹ Escrow An toàn 100%
                </p>
                <p className="mk-footer-hotline">
                  <Icon name="call" />
                  Hotline tư vấn: <strong>1900 6868 - (028) 7300 8899</strong>
                </p>
              </div>
              <div>
                <h3>Dịch vụ Thẩm định</h3>
                <ul>
                  <li>
                    <a href="#">Rà soát Thuế TNDN &amp; VAT</a>
                  </li>
                  <li>
                    <a href="#">Thẩm định Hợp đồng Pháp lý</a>
                  </li>
                  <li>
                    <a href="#">Tư vấn Chuyển giá &amp; Giao dịch LK</a>
                  </li>
                  <li>
                    <a href="#">Bảo vệ Quyền lợi Thanh tra Thuế</a>
                  </li>
                </ul>
              </div>
              <div>
                <h3>Quy trình &amp; Pháp lý</h3>
                <ul>
                  <li>
                    <a href="#">Quy trình Escrow Ký quỹ</a>
                  </li>
                  <li>
                    <a href="#">Biểu phí Niêm yết Minh bạch</a>
                  </li>
                  <li>
                    <a href="#">Điều khoản Sử dụng Dịch vụ</a>
                  </li>
                  <li>
                    <a href="#">Chính sách Bảo mật Thông tin</a>
                  </li>
                </ul>
              </div>
              <div>
                <h3>Bảo mật &amp; Chứng nhận</h3>
                <div className="mk-cert">
                  <p>
                    <Icon name="shield_locked" />
                    ISO/IEC 27001 Verified
                  </p>
                  <small>Mã hóa hồ sơ chuẩn Ngân hàng 256-bit</small>
                </div>
                <div className="mk-cert">
                  <p>
                    <Icon name="account_balance" />
                    Ký quỹ Pháp định Độc lập
                  </p>
                  <small>Bảo vệ tranh chấp bởi Trung tâm Trọng tài</small>
                </div>
              </div>
            </div>
            <div className="mk-footer-bottom">
              <p>
                <strong>Tuyên bố miễn trừ trách nhiệm nội dung AI &amp; Xác thực con người:</strong> Mọi kết quả phân tích sơ bộ từ thuật toán SHUB AI mang tính chất tham khảo kỹ thuật. Quyết định tư vấn, văn bản đệ trình cơ quan nhà nước và hồ sơ tranh tụng bắt buộc phải được thẩm định, ký duyệt và chịu trách nhiệm pháp lý bởi Luật sư/Chuyên gia Thuế được cấp phép có chứng chỉ hành nghề hợp lệ trên hệ thống.
              </p>
              <p>© 2026 SHUB Marketplace. Bản quyền đã được bảo lưu.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}
