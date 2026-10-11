import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { flushSync } from 'react-dom'
import { Link } from 'react-router-dom'
import { useReducedMotion } from '@/components/ui/motion'
import { cn } from '@/lib/utils'
import { EXPERTS, money, type Expert, type RoleKey } from '@/features/marketplace/fixtures'
import { Icon, MarketplaceShell } from './MarketplaceShell'

/* Trang Sàn Chuyên gia, theo mẫu FE/code.html (Stitch).
   Dữ liệu là mock lấy từ mẫu, thay bằng API khi có. */

type SortKey = 'rating' | 'exp' | 'price-asc' | 'price-desc'
type ExpKey = 'all' | 'under12' | '12to15' | 'over15'
type PriceKey = 'all' | 'under1.5' | '1.5to2.0' | 'over2.0'

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

function ExpertCard({ expert: e }: { expert: Expert }) {
  const accent = { color: e.color } as CSSProperties
  return (
    <article className="mk-card" data-role={e.role} style={{ viewTransitionName: `mk-card-${e.id}` }}>
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
            <h2 className="mk-name">{e.name}</h2>
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
          <Link to={`/experts/${e.id}`} className="mk-btn mk-btn-ghost">
            Hồ sơ
          </Link>
          <Link to={`/experts/${e.id}#goi-dich-vu`} className="mk-btn mk-btn-primary">
            Đặt lịch ngay
          </Link>
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
  const [sort, setSort] = useState<SortKey>('rating')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = EXPERTS.filter((e) => {
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
  }, [query, role, exp, price, sort])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, totalPages)
  const pageItems = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)
  const rangeStart = filtered.length === 0 ? 0 : (current - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(current * PAGE_SIZE, filtered.length)

  useEffect(() => {
    document.title = 'Sàn Chuyên gia | Shared Hub'
  }, [])

  const toolbarRef = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  /* Đổi lọc/sắp xếp/trang: card trượt/mờ tới chỗ mới (View Transitions, trình duyệt không hỗ trợ thì đổi ngay)
     và kéo đầu danh sách vào tầm nhìn, thay vì để trang tự nhảy khi danh sách ngắn lại. */
  const transition = (update: () => void) => {
    const apply = () => {
      flushSync(update)
      // Thanh lọc bị cuộn khuất dưới header (vd. đổi trang ở cuối danh sách) thì kéo nó về tầm nhìn.
      const toolbar = toolbarRef.current
      if (toolbar && toolbar.getBoundingClientRect().top < 68) toolbar.scrollIntoView({ block: 'start' })
    }
    if (reduced || !document.startViewTransition) apply()
    else document.startViewTransition(apply)
  }

  const hasFilters = query.trim() !== '' || role !== 'all' || exp !== 'all' || price !== 'all'

  const resetFilters = () =>
    transition(() => {
      setQuery('')
      setRole('all')
      setExp('all')
      setPrice('all')
      setPage(1)
    })

  return (
    <MarketplaceShell>
      <main className="mk-wrap mk-main">
        <header className="mk-head">
          <h1>Sàn Chuyên gia Thuế &amp; Pháp lý</h1>
          <ul className="mk-trust">
            <li>
              <Icon name="verified" filled />
              100% chứng chỉ hành nghề được xác thực
            </li>
            <li>
              <Icon name="shield" />
              Phí giữ trong Escrow tới khi bạn nghiệm thu
            </li>
          </ul>
        </header>

        <section className="mk-toolbar" ref={toolbarRef} aria-label="Bộ lọc tìm kiếm">
          <div className="mk-toolbar-row">
            <div className="mk-select mk-search">
              <label htmlFor="mk-search">Từ khóa</label>
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
            <label className="mk-select">
              <span>Kinh nghiệm</span>
              <select
                value={exp}
                onChange={(ev) => {
                  const next = ev.target.value as ExpKey
                  transition(() => {
                    setExp(next)
                    setPage(1)
                  })
                }}
              >
                {EXP_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="mk-select">
              <span>Mức phí</span>
              <select
                value={price}
                onChange={(ev) => {
                  const next = ev.target.value as PriceKey
                  transition(() => {
                    setPrice(next)
                    setPage(1)
                  })
                }}
              >
                {PRICE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="mk-select">
              <span>Sắp xếp</span>
              <select
                value={sort}
                onChange={(ev) => {
                  const next = ev.target.value as SortKey
                  transition(() => setSort(next))
                }}
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mk-toolbar-foot">
            <fieldset className="mk-chips">
              <legend className="mk-sr">Vai trò chuyên gia</legend>
              {ROLE_OPTIONS.map((o) => (
                <label key={o.value} className="mk-chip">
                  <input
                    type="radio"
                    name="role"
                    value={o.value}
                    checked={role === o.value}
                    onChange={() =>
                      transition(() => {
                        setRole(o.value)
                        setPage(1)
                      })
                    }
                  />
                  <span>{o.label}</span>
                </label>
              ))}
            </fieldset>
            <p className="mk-count" aria-live="polite">
              <strong>{filtered.length} chuyên gia</strong>
              <span>/ {EXPERTS.length} đủ điều kiện</span>
              {hasFilters && (
                <button type="button" className="mk-link-btn" onClick={resetFilters}>
                  Đặt lại
                </button>
              )}
            </p>
          </div>
        </section>

        <div className="mk-results">
          {pageItems.length > 0 ? (
            <div className="mk-grid">
              {pageItems.map((e) => (
                <ExpertCard key={e.id} expert={e} />
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
                  onClick={() => transition(() => setPage(current - 1))}
                  aria-label="Trang trước"
                >
                  <Icon name="chevron_left" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={cn('mk-page-btn', n === current && 'mk-page-on')}
                    aria-current={n === current ? 'page' : undefined}
                    onClick={() => transition(() => setPage(n))}
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  className="mk-page-btn"
                  disabled={current >= totalPages}
                  onClick={() => transition(() => setPage(current + 1))}
                  aria-label="Trang sau"
                >
                  <Icon name="chevron_right" />
                </button>
              </div>
            </nav>
          )}
        </div>

        <p className="mk-demo">
          * Dữ liệu minh họa thực nghiệm, hồ sơ chuyên gia đã qua kiểm tra chứng chỉ hành nghề và bài kiểm tra độc lập.
        </p>
      </main>
    </MarketplaceShell>
  )
}
