import type { ExpertBio } from '@/features/expert-bio/types'
import { useEffect, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import {
  ArrowLeft,
  ChevronRight,
  BadgeCheck,
  Lock,
  Info,
  RotateCw,
  ShieldCheck,
  Star,
  UserX,
  WifiOff,
} from 'lucide-react'
import { ApiError } from '@/lib/api-client'
import { useAuthStore } from '@/features/auth/store/authStore'
import { useFormatters } from '@/hooks/useFormatters'
import { CustomSelect } from '@/components/ui/forms/custom-select'
import {
  useExpertBio,
} from '@/features/expert-bio/hooks/useExpertBio'
import { MarketplaceFrame } from '@/features/marketplace/components/MarketplaceFrame'
import {
  AvailabilityTag,
  Avatar,
} from '@/features/marketplace/components/ListingParts'
import { useSlaLabel } from '@/features/marketplace/hooks/useSlaLabel'
import {
  featuredExperts,
  isServiceId,
  SERVICE_IDS,
} from '@/features/marketplace/fixtures'
import { FeaturedExperts } from '@/features/marketplace/components/FeaturedExperts'
import profilePhoto from '@/assets/generated/expert-profile-workspace.png'

/* Hồ sơ công khai duy nhất của chuyên gia: mở từ Sàn ("Xem hồ sơ", "Gửi yêu cầu" kèm #gui-yeu-cau)
   và từ nút "Xem trang công khai" của chuyên gia. Nội dung lấy từ cùng hợp đồng ExpertBio
   với bản xem trước trong trình chỉnh sửa hồ sơ. */

const REQUEST_ID = 'gui-yeu-cau'

type Service = ExpertBio['services'][number]

function initialsOf(name: string) {
  // Họ + tên gọi, bỏ học vị/danh xưng ở đầu ("LS. Vũ Trọng Nghĩa" → "VN").
  const parts = name
    .replace(/^(ThS|TS|LS)\.\s*/i, '')
    .split(/\s+/)
    .filter(Boolean)
  return (
    (parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')
  ).toUpperCase()
}

function useServiceText() {
  const { t } = useTranslation('marketplace')
  return {
    name: (s: Pick<Service, 'serviceId' | 'serviceName'>) =>
      isServiceId(s.serviceId)
        ? t(`services.${s.serviceId}.name`)
        : s.serviceName,
    deliverable: (s: Pick<Service, 'serviceId'>) =>
      isServiceId(s.serviceId)
        ? t(`services.${s.serviceId}.deliverable`)
        : null,
  }
}

function ProfileHead({ bio }: { bio: ExpertBio }) {
  const { t } = useTranslation('marketplace')
  const format = useFormatters()
  const listing = bio.listing
  return (
    <header className="mk-head mk-head-profile">
      <figure className="mk-plate" aria-hidden="true">
        <img
          src={profilePhoto}
          alt=""
          width="1672"
          height="941"
          decoding="async"
        />
      </figure>
      <div className="wrap">
        <nav className="mk-crumbs" aria-label={t('profile.breadcrumb')}>
          <Link className="mk-back" to="/marketplace">
            <span className="mk-back-icon" aria-hidden="true">
              <ArrowLeft size={15} />
            </span>
            {t('profile.back')}
          </Link>
          <ChevronRight size={16} aria-hidden="true" />
          <span aria-current="page">{bio.displayName}</span>
        </nav>
        <div className="mk-person">
          <Avatar
            src={bio.avatarUrl}
            text={initialsOf(bio.displayName)}
            large
          />
          <div className="mk-person-text">
            <h1>{bio.displayName}</h1>
            {bio.headline && <p className="mk-lead">{bio.headline}</p>}
            {listing && (
              <p className="mk-eligible">
                <ShieldCheck size={16} aria-hidden="true" />
                {t('profile.verifiedSince', {
                  date: format.dateOnly(listing.eligibleSince),
                })}
              </p>
            )}
          </div>
        </div>

        <dl className="mk-stats">
          {listing && (
            <div>
              <dt>{t('row.reviews', { count: listing.reviews })}</dt>
              <dd>
                <Star size={18} aria-hidden="true" className="mk-star" />
                {format.number(listing.rating, { minimumFractionDigits: 2 })}
              </dd>
            </div>
          )}
          {listing && (
            <div>
              <dt>{t('profile.casesLabel')}</dt>
              <dd>{format.number(listing.completedCases)}</dd>
            </div>
          )}
          <div>
            <dt>{t('profile.yearsLabel')}</dt>
            <dd>{format.number(bio.yearsOfExperience)}</dd>
          </div>
          {listing && (
            <div className="mk-stat-text">
              <dt>{t('profile.credential')}</dt>
              <dd>{listing.credential}</dd>
            </div>
          )}
          {bio.location && (
            <div className="mk-stat-text">
              <dt>{t('profile.location')}</dt>
              <dd>{bio.location}</dd>
            </div>
          )}
        </dl>
      </div>
    </header>
  )
}

function ServiceList({
  bio,
  picked,
  onPick,
}: {
  bio: ExpertBio
  picked: string | undefined
  onPick: (serviceId: string) => void
}) {
  const { t } = useTranslation('marketplace')
  const format = useFormatters()
  const sla = useSlaLabel()
  const text = useServiceText()
  // Sàn: hiện đủ danh mục, dịch vụ chưa qua Vòng 2 vẫn hiện nhưng không chọn được.
  const catalog: Service[] = bio.listing
    ? SERVICE_IDS.map(
        (id) =>
          bio.services.find((s) => s.serviceId === id) ?? {
            serviceId: id,
            serviceName: id,
            price: null,
          }
      )
    : bio.services
  return (
    <fieldset className="mk-offers">
      <legend className="sr-only">{t('profile.servicesTitle')}</legend>
      {catalog.map((s, index) => {
        const approved = s.price != null
        const on = approved && s.serviceId === picked
        return (
          <label
            key={s.serviceId}
            className="mk-offer"
            data-on={on}
            data-approved={approved}
            style={{ '--i': index } as CSSProperties}
          >
            <input
              type="radio"
              name="profile-service"
              checked={on}
              disabled={!approved}
              onChange={() => onPick(s.serviceId)}
            />
            <span className="mk-offer-main">
              <span className="mk-offer-name">{text.name(s)}</span>
              {text.deliverable(s) && (
                <span className="mk-offer-desc">{text.deliverable(s)}</span>
              )}
              {approved && s.approvedAt && (
                <span className="mk-offer-gate">
                  <BadgeCheck size={15} aria-hidden="true" />
                  {t('profile.approvedOn', {
                    date: format.dateOnly(s.approvedAt),
                  })}
                </span>
              )}
            </span>
            {approved ? (
              <span className="mk-offer-price">
                <b>{format.money(s.price)}</b>
                {s.slaHours != null && (
                  <small>
                    {t('profile.deliveredIn', { duration: sla(s.slaHours) })}
                  </small>
                )}
              </span>
            ) : (
              <span className="mk-offer-none">{t('profile.notOffered')}</span>
            )}
          </label>
        )
      })}
    </fieldset>
  )
}

function RequestPanel({
  bio,
  picked,
  onPick,
}: {
  bio: ExpertBio
  picked: string | undefined
  onPick: (serviceId: string) => void
}) {
  const { t } = useTranslation('marketplace')
  const format = useFormatters()
  const sla = useSlaLabel()
  const text = useServiceText()
  // Xem hồ sơ công khai; gửi yêu cầu (tạo Review Case, chốt giá — F5) mới cần đăng nhập.
  // Dev mở thẳng như ClientLayout để demo luồng không cần BE đăng nhập.
  const signedIn =
    useAuthStore((s) => s.isAuthenticated) || import.meta.env.DEV
  const navigate = useNavigate()
  const selected = bio.services.find((s) => s.serviceId === picked)
  const availability = bio.listing?.availability
  const open = !availability || availability.state === 'open'

  return (
    <aside
      id={REQUEST_ID}
      className="mk-request"
      aria-labelledby="mk-request-title"
    >
      <h2 id="mk-request-title">{t('profile.book.title')}</h2>
      {bio.services.length === 0 || !selected ? (
        <p className="mk-muted">{t('profile.book.noServices')}</p>
      ) : (
        <>
          <CustomSelect
            className="mk-select mk-select-block"
            triggerClassName="mk-select-trigger"
            menuClassName="mk-select-menu"
            label={t('profile.book.service')}
            value={selected.serviceId}
            onChange={onPick}
            options={bio.services.map((s) => ({
              value: s.serviceId,
              label: text.name(s),
            }))}
          />

          <div className="mk-quote">
            <span className="mk-quote-label">{t('profile.book.fee')}</span>
            <strong className="mk-quote-fee">
              {selected.price == null ? '—' : format.money(selected.price)}
            </strong>
            <dl>
              {selected.slaHours != null && (
                <div>
                  <dt>{t('profile.book.delivery')}</dt>
                  <dd>{sla(selected.slaHours)}</dd>
                </div>
              )}
              {availability && (
                <div>
                  <dt>{t('profile.book.response')}</dt>
                  <dd>
                    <AvailabilityTag availability={availability} detailed />
                  </dd>
                </div>
              )}
            </dl>
          </div>

          <button
            type="button"
            className="mk-btn mk-btn-accent mk-wide mk-btn-lg"
            disabled={!open}
            onClick={() =>
              signedIn
                ? navigate(
                    `/cases/new?expert=${encodeURIComponent(bio.expertId)}&service=${encodeURIComponent(selected.serviceId)}`
                  )
                : navigate('/login', {
                    state: {
                      from: `/experts/${encodeURIComponent(bio.expertId)}?service=${encodeURIComponent(selected.serviceId)}#${REQUEST_ID}`,
                    },
                  })
            }
          >
            {!open
              ? t('profile.book.ctaUnavailable')
              : signedIn
                ? t('profile.book.cta')
                : t('profile.book.ctaSignIn')}
          </button>
          <p className="mk-lock">
            <Lock size={14} aria-hidden="true" />
            {t('profile.book.lock')}
          </p>

          <div className="mk-next">
            <h3>{t('profile.book.steps')}</h3>
            <ol>
              <li>{t('profile.book.step1')}</li>
              <li>{t('profile.book.step2')}</li>
              <li>{t('profile.book.step3')}</li>
              <li>{t('profile.book.step4')}</li>
            </ol>
          </div>
        </>
      )}
    </aside>
  )
}

function Profile({ bio, initial }: { bio: ExpertBio; initial: string | null }) {
  const { t } = useTranslation('marketplace')
  const [picked, setPicked] = useState(
    () =>
      bio.services.find((s) => s.serviceId === initial)?.serviceId ??
      bio.services[0]?.serviceId
  )

  return (
    <>
      <ProfileHead bio={bio} />
      <main className="mk-work" id="mk-profile" tabIndex={-1}>
        <div className="wrap mk-profile">
          <div className="mk-profile-body">
            {(bio.bio || bio.highlights.length > 0) && (
              <section aria-labelledby="mk-about">
                <h2 id="mk-about">{t('profile.about')}</h2>
                {bio.bio && <p className="mk-prose">{bio.bio}</p>}
                {bio.highlights.length > 0 && (
                  <ul className="mk-highlights">
                    {bio.highlights.map((item) => (
                      <li key={item}>
                        <BadgeCheck size={18} aria-hidden="true" />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            <section aria-labelledby="mk-services">
              <h2 id="mk-services">{t('profile.servicesTitle')}</h2>
              <p className="mk-muted">{t('profile.servicesLead')}</p>
              <ServiceList bio={bio} picked={picked} onPick={setPicked} />
            </section>
          </div>

          {/* Lưới 2 hàng: cột chính và khung gửi yêu cầu chung hàng 1 nên đáy luôn thẳng nhau;
              thẻ chủ đề ở hàng 2 cột phụ */}
          <RequestPanel bio={bio} picked={picked} onPick={setPicked} />
          {bio.expertise.length > 0 && (
            <section className="mk-side-card" aria-labelledby="mk-topics">
              <h2 id="mk-topics">{t('profile.topics')}</h2>
              <ul className="mk-topics">
                {bio.expertise.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </main>
    </>
  )
}

/** Hồ sơ không tải được. 404: hồ sơ không còn trên Sàn → hành động chính là quay về Sàn, kèm mã hồ sơ
 *  để báo hỗ trợ; lỗi khác (mạng, máy chủ) → hành động chính là thử lại. Cả hai gợi ý chuyên gia khác. */
function ProfileMissing({
  expertId,
  notFound,
  onRetry,
}: {
  expertId: string
  notFound: boolean
  onRetry: () => void
}) {
  const { t } = useTranslation('marketplace')
  const suggestions = featuredExperts(3, expertId)
  return (
    <>
      <header className="mk-head mk-head-profile mk-head-missing">
        <figure className="mk-plate" aria-hidden="true">
          <img
            src={profilePhoto}
            alt=""
            width="1000"
            height="1250"
            decoding="async"
          />
        </figure>
        <div className="wrap">
          <nav className="mk-crumbs" aria-label={t('profile.breadcrumb')}>
            <Link className="mk-back" to="/marketplace">
              <span className="mk-back-icon" aria-hidden="true">
                <ArrowLeft size={15} />
              </span>
              {t('profile.back')}
            </Link>
            <ChevronRight size={16} aria-hidden="true" />
            <span aria-current="page">
              {notFound ? t('profile.missingCrumb') : t('profile.failedCrumb')}
            </span>
          </nav>
          <div className="mk-missing">
            <span className="mk-missing-icon" aria-hidden="true">
              {notFound ? <UserX size={28} /> : <WifiOff size={28} />}
            </span>
            <h1>
              {notFound ? t('profile.notFound') : t('profile.unavailable')}
            </h1>
            <p className="mk-lead">
              {notFound
                ? t('profile.notFoundBody')
                : t('profile.unavailableBody')}
            </p>
            <div className="mk-missing-actions">
              {notFound ? (
                <>
                  <Link className="btn btn-primary" to="/marketplace">
                    {t('profile.browse')}
                    <span className="arrow" aria-hidden="true">
                      →
                    </span>
                  </Link>
                  <Link className="btn btn-ghost" to="/">
                    {t('profile.home')}
                  </Link>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={onRetry}
                  >
                    <RotateCw size={18} aria-hidden="true" />
                    {t('profile.retry')}
                  </button>
                  <Link className="btn btn-ghost" to="/marketplace">
                    {t('profile.browse')}
                  </Link>
                </>
              )}
            </div>
            {notFound && expertId && (
              <p className="mk-missing-code">
                {t('profile.missingCode', { id: expertId })}
              </p>
            )}
          </div>
        </div>
      </header>

      {suggestions.length > 0 && (
        <main className="mk-work" id="mk-profile" tabIndex={-1}>
          <div className="wrap mk-suggest">
            <h2>{t('featured.title')}</h2>
            <p className="mk-muted">{t('featured.lead')}</p>
            <FeaturedExperts experts={suggestions} />
            <p className="mk-demo">
              <Info size={15} aria-hidden="true" />
              {t('demo')}
            </p>
          </div>
        </main>
      )}
    </>
  )
}

export default function ExpertPublicProfilePage() {
  const { t } = useTranslation('marketplace')
  const { expertId } = useParams()
  const { hash } = useLocation()
  const [params] = useSearchParams()
  const query = useExpertBio(expertId)
  const bio = query.data

  useEffect(() => {
    const previous = document.title
    document.title = `${bio?.displayName ?? t('profile.back')} | Shared Hub`
    return () => {
      document.title = previous
    }
  }, [bio, t])

  // ScrollRestoration đã đưa về đầu trang; khung gửi yêu cầu chỉ có sau khi dữ liệu về nên tự cuộn tới #hash.
  useEffect(() => {
    if (hash === `#${REQUEST_ID}` && bio)
      document.getElementById(REQUEST_ID)?.scrollIntoView({ block: 'start' })
  }, [hash, bio])

  return (
    <MarketplaceFrame skipTarget="mk-profile">
      {query.isPending ? (
        <>
          <header
            className="mk-head mk-head-profile"
            role="status"
            aria-label={t('profile.loading')}
          >
            <div className="wrap">
              <div className="mk-skel mk-skel-title" />
              <div className="mk-skel mk-skel-line" />
            </div>
          </header>
          <main className="mk-work" id="mk-profile">
            <div className="wrap mk-profile">
              <div className="mk-skel mk-skel-block" />
              <div className="mk-skel mk-skel-block" />
            </div>
          </main>
        </>
      ) : bio ? (
        <Profile key={bio.expertId} bio={bio} initial={params.get('service')} />
      ) : (
        <ProfileMissing
          expertId={expertId ?? ''}
          notFound={
            query.error instanceof ApiError && query.error.status === 404
          }
          onRetry={() => void query.refetch()}
        />
      )}
    </MarketplaceFrame>
  )
}
