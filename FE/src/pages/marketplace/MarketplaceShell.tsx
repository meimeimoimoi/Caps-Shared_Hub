import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import './marketplace.css'

/* Khung chung (font, header, footer) của Sàn Chuyên gia, theo mẫu FE/code.html (Stitch). */

export function Icon({
  name,
  className,
  filled,
}: {
  name: string
  className?: string
  filled?: boolean
}) {
  return (
    <span
      className={cn('material-symbols-outlined mk-icon', className)}
      style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
      aria-hidden="true"
    >
      {name}
    </span>
  )
}

function ShieldMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 13c0 5-3.5 7.5-7.7 9a1 1 0 0 1-.7 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1.2 1.2 0 0 1 1.5 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

export function MarketplaceShell({ children }: { children: ReactNode }) {
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
                <NavLink to="/marketplace" end className="mk-link-active">
                  Sàn Chuyên gia
                </NavLink>
                <a href="#">Thẩm định 2 Cổng</a>
                <a href="#">Rà soát Thuế TNDN</a>
                <a href="#">Biểu phí &amp; Quy trình</a>
              </nav>
            </div>
            <Link to="/login" className="mk-btn mk-btn-primary mk-cta">
              <Icon name="verified_user" />
              <span className="mk-cta-long">Đăng nhập / Đăng ký Chuyên gia</span>
              <span className="mk-cta-short">Đăng nhập</span>
            </Link>
          </div>
        </header>

        {children}

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
                  Nền tảng kiểm định và đối ứng dịch vụ Thuế &amp; Pháp lý
                  chuyên sâu đầu tiên tại Việt Nam kết hợp AI Audit Model và
                  Giám định Đoàn chuyên gia Độc lập.
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
                <strong>
                  Tuyên bố miễn trừ trách nhiệm nội dung AI &amp; Xác thực con
                  người:
                </strong>{' '}
                Mọi kết quả phân tích sơ bộ từ thuật toán SHUB AI mang tính chất
                tham khảo kỹ thuật. Quyết định tư vấn, văn bản đệ trình cơ quan
                nhà nước và hồ sơ tranh tụng bắt buộc phải được thẩm định, ký
                duyệt và chịu trách nhiệm pháp lý bởi Luật sư/Chuyên gia Thuế
                được cấp phép có chứng chỉ hành nghề hợp lệ trên hệ thống.
              </p>
              <p>© 2026 SHUB Marketplace. Bản quyền đã được bảo lưu.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}
