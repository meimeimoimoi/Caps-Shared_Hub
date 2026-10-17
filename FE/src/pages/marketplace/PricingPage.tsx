import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { FilePenLine, MessagesSquare, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { VideoBackground } from '@/components/auth/VideoBackground'
import { PublicFooter } from '@/components/ui/layout/public-footer'
import { PublicNavigation } from '@/components/ui/layout/public-navigation'
import { useAuthStore } from '@/features/auth/store/authStore'
import { mockPricing } from '@/features/service-pricing/api/fixtures'
import '@/styles/public-site.css'
import './pricing.css'

/* Bảng giá quota AI (credit), trên khung public chung (#shub-home). Phí thẩm định chuyên gia tính riêng trên Sàn.
 * ponytail: gói/đơn giá đọc fixture cấu hình Admin; cần endpoint giá công khai khi BE có. */

const { creditRates, creditPackages } = mockPricing
const vnd = (n: number) => `${new Intl.NumberFormat('vi-VN').format(n)}đ`
const packages = [...creditPackages]
  .filter((p) => p.onSale)
  .sort((a, b) => a.order - b.order)

export default function PricingPage() {
  const { t } = useTranslation('home')
  const authenticated = useAuthStore((s) => s.isAuthenticated)
  useEffect(() => {
    document.title = 'Bảng giá credit AI | Shared Hub'
  }, [])

  return (
    <div id="shub-home">
      <a className="skip" href="#main">
        {t('skip')}
      </a>
      <div className="env" aria-hidden="true" />
      <PublicNavigation authenticated={authenticated} />

      <main id="main">
        <section className="ai-hero" aria-labelledby="ai-price-title">
          <VideoBackground className="absolute motion-reduce:hidden" />
          <div className="ai-hero-shade" aria-hidden="true" />
          <div className="wrap ai-hero-body">
            <div className="ai-hero-copy">
              <p className="ai-eyebrow">
                <Zap size={15} aria-hidden="true" />
                Credit cho Trợ lý AI & AI Workspace
              </p>
              <h1 id="ai-price-title">
                Trả theo câu trả lời,{' '}
                <br />
                không theo tháng.
              </h1>
              <p>
                Mỗi câu hỏi giữ tạm 1 credit và chỉ bị trừ khi AI trả lời thành
                công. Tạo và xem trước bản nháp miễn phí.
              </p>
            </div>

            <ul className="ai-packages">
              {packages.map((p) => (
                <li
                  key={p.id}
                  className={cn('ai-pkg', p.recommended && 'ai-pkg-pick')}
                >
                  <p className="ai-pkg-name">
                    {p.name}
                    {p.recommended && <span>Gợi ý</span>}
                  </p>
                  <p className="ai-pkg-credits">
                    {p.credits}
                    <small>credit</small>
                  </p>
                  <p className="ai-pkg-price">
                    {p.price == null ? 'Giá đang chờ chốt' : vnd(p.price)}
                  </p>
                  <Link
                    to="/wallet"
                    className={cn(
                      'btn',
                      p.recommended ? 'btn-primary' : 'btn-ghost'
                    )}
                  >
                    Nạp credit
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="ai-rates" className="wrap ai-rates">
          <div>
            <h2 id="ai-rates">Mỗi credit dùng vào đâu</h2>
            <p>
              Chỉ các thao tác dưới đây tính credit. Phí thẩm định của chuyên
              gia được thanh toán riêng cho từng hồ sơ.
            </p>
            <div className="ai-cta">
              <Link to="/ai-assistant" className="btn btn-primary">
                <MessagesSquare size={18} aria-hidden="true" />
                Hỏi trợ lý AI
              </Link>
              <Link to="/drafts" className="btn btn-ghost">
                <FilePenLine size={18} aria-hidden="true" />
                Mở AI Workspace
              </Link>
            </div>
          </div>
          <dl className="ai-rows">
            {creditRates.map((r) => (
              <div key={r.id}>
                <dt>
                  {r.action}
                  <small>{r.when}</small>
                </dt>
                <dd>
                  {r.credits == null
                    ? 'Chưa chốt'
                    : r.credits === 0
                      ? 'Miễn phí'
                      : `${r.credits} credit`}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </main>

      <PublicFooter anchorBase="/" />
    </div>
  )
}
