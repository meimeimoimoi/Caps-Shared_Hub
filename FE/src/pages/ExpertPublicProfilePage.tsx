import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ApiError } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import { useFormatters } from '@/hooks/useFormatters'
import { ExpertBioView } from '@/features/expert-bio/ExpertBioView'
import { useExpertBio } from '@/features/expert-bio/useExpertBio'
import { Icon, MarketplaceShell } from '@/pages/marketplace/MarketplaceShell'

/* Hồ sơ công khai duy nhất của chuyên gia: mở từ Sàn ("Hồ sơ", "Đặt lịch ngay" kèm #goi-dich-vu)
   và từ nút "Xem trang công khai" của chuyên gia. Nội dung trái = bản xem trước trong trình chỉnh sửa. */

const BOOKING_ID = 'goi-dich-vu'

export default function ExpertPublicProfilePage() {
  const { t } = useTranslation('expert')
  const format = useFormatters()
  const { expertId } = useParams()
  const { hash } = useLocation()
  const query = useExpertBio(expertId)
  const bio = query.data
  const [pkg, setPkg] = useState(0)
  const [toast, setToast] = useState(false)

  useEffect(() => {
    document.title = `${bio?.displayName ?? t('bio.publicTitle')} | Shared Hub`
  }, [bio, t])

  // ScrollRestoration đã đưa về đầu trang; khung đặt lịch chỉ có sau khi dữ liệu về nên tự cuộn tới #hash.
  useEffect(() => {
    if (hash === `#${BOOKING_ID}` && bio)
      document.getElementById(BOOKING_ID)?.scrollIntoView({ block: 'start' })
  }, [hash, bio])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(false), 3200)
    return () => window.clearTimeout(timer)
  }, [toast])

  const selected = bio?.services[pkg]

  return (
    <MarketplaceShell>
      <main className="mk-wrap mk-main">
        <nav className="mk-crumbs" aria-label="Breadcrumb">
          <Link to="/marketplace">
            <Icon name="arrow_back" />
            Sàn Chuyên gia
          </Link>
          {bio && (
            <>
              <span aria-hidden="true">/</span>
              <span aria-current="page">{bio.displayName}</span>
            </>
          )}
        </nav>

        {query.isPending ? (
          <div
            role="status"
            aria-label={t('bio.loading')}
            className="mk-profile"
          >
            <div className="mk-panel mk-skeleton" />
            <div className="mk-panel mk-skeleton" />
          </div>
        ) : bio ? (
          <div className="mk-profile">
            <ExpertBioView bio={bio} hideServices />

            <aside
              id={BOOKING_ID}
              className="mk-panel mk-book"
              aria-labelledby="mk-book-title"
            >
              <h2 id="mk-book-title" className="mk-section-title">
                Chọn gói dịch vụ
              </h2>
              {bio.services.length === 0 ? (
                <p className="mk-bio">{t('bio.noServices')}</p>
              ) : (
                <>
                  <fieldset className="mk-packages">
                    <legend className="mk-sr">{t('bio.services')}</legend>
                    {bio.services.map((s, i) => (
                      <label
                        key={s.serviceId}
                        className={cn('mk-pkg', pkg === i && 'mk-pkg-on')}
                      >
                        <span className="mk-pkg-main">
                          <input
                            type="radio"
                            name="pkg"
                            checked={pkg === i}
                            onChange={() => setPkg(i)}
                          />
                          <strong>{s.serviceName}</strong>
                        </span>
                        <span className="mk-pkg-price">
                          {s.price == null
                            ? t('bio.priceOnRequest')
                            : format.money(s.price)}
                        </span>
                      </label>
                    ))}
                  </fieldset>

                  <div className="mk-book-total">
                    <span>Tạm tính</span>
                    <strong>
                      {selected?.price == null
                        ? t('bio.priceOnRequest')
                        : format.money(selected.price)}
                    </strong>
                  </div>

                  <button
                    type="button"
                    className="mk-btn mk-btn-primary mk-wide"
                    onClick={() => setToast(true)}
                  >
                    Tiếp tục Đặt lịch &amp; Ký quỹ Escrow
                  </button>

                  <p className="mk-escrow-note">
                    <Icon name="shield" className="mk-accent" />
                    Tiền cọc được giữ trong tài khoản Escrow SHUB. Chuyên gia
                    chỉ nhận thanh toán khi bạn xác nhận hoàn tất buổi làm việc.
                  </p>
                </>
              )}
            </aside>
          </div>
        ) : (
          <div className="mk-empty">
            <Icon name="person_search" className="mk-empty-icon" />
            <h1>
              {query.error instanceof ApiError && query.error.status === 404
                ? t('bio.notFound')
                : t('bio.unavailable')}
            </h1>
            <p>{t('bio.unavailableMessage')}</p>
            <button
              type="button"
              className="mk-btn mk-btn-primary"
              onClick={() => void query.refetch()}
            >
              {t('retry')}
            </button>
          </div>
        )}
      </main>

      {toast && (
        <div className="mk-toast" role="status">
          <Icon name="verified" filled className="mk-accent" />
          <div>
            <strong>Đang chuyển tới Cổng Escrow SHUB</strong>
            <span>Hệ thống mở lịch hẹn bảo mật trong 1 giây...</span>
          </div>
        </div>
      )}
    </MarketplaceShell>
  )
}
