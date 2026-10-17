import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { Award, Info, Search, SearchX, Star } from 'lucide-react'
import { useFormatters } from '@/hooks/useFormatters'
import { CustomSelect } from '@/components/ui/forms/custom-select'
import { MarketplaceFrame } from '@/features/marketplace/components/MarketplaceFrame'
import {
  AvailabilityTag,
  Avatar,
  VerifiedBadge,
} from '@/features/marketplace/components/ListingParts'
import { useSlaLabel } from '@/features/marketplace/hooks/useSlaLabel'
import {
  useRevealRows,
  withViewTransition,
} from '@/features/marketplace/hooks/useListMotion'
import consultationPhoto from '@/assets/generated/marketplace-consultation.png'
import {
  canRequest,
  EXPERTS,
  isServiceId,
  SERVICE_IDS,
  type Expert,
  type ServiceId,
  type ServiceOffer,
} from '@/features/marketplace/fixtures'

type SortKey = 'recommended' | 'rating' | 'price' | 'sla'
const SLA_LIMITS = [24, 48, 72, 168] as const

type Listing = { expert: Expert; offer: ServiceOffer }

/** Sàn hiển thị theo dịch vụ: chỉ chuyên gia đã được duyệt cho dịch vụ đang chọn, với giá + SLA của dịch vụ đó. */
function listingsFor(service: ServiceId): Listing[] {
  return EXPERTS.flatMap((expert) => {
    const offer = expert.offers[service]
    return offer ? [{ expert, offer }] : []
  })
}

function ExpertRow({
  listing: { expert: e, offer },
  service,
}: {
  listing: Listing
  service: ServiceId
}) {
  const { t } = useTranslation('marketplace')
  const format = useFormatters()
  const sla = useSlaLabel()
  const open = canRequest(e)
  const profile = `/experts/${e.id}?service=${service}`
  return (
    <li
      className="mk-row"
      data-open={open}
      data-mk-reveal=""
      style={{ viewTransitionName: `mk-row-${e.id}` } as CSSProperties}
    >
      <div className="mk-who">
        <Avatar src={e.avatar} text={e.initials} />
        <div className="mk-who-text">
          <div className="mk-name-row">
            <h3 className="mk-name">
              <Link to={profile}>{e.name}</Link>
            </h3>
            <VerifiedBadge
              eligibleSince={e.eligibleSince}
              approvedAt={offer.approvedAt}
              pricingVersion={offer.pricingVersion}
            />
          </div>
          <p className="mk-headline">{e.headline}</p>
          <p className="mk-credential">
            <Award size={15} aria-hidden="true" />
            {e.credential}
          </p>
          <p className="mk-meta">
            <span className="mk-rating">
              <Star size={14} aria-hidden="true" />
              <b>{format.number(e.rating, { minimumFractionDigits: 2 })}</b>
              <span className="sr-only">
                {t('row.rating', { rating: e.rating })}
              </span>
            </span>
            <span>{t('row.reviews', { count: e.reviews })}</span>
            <span>{t('row.cases', { count: e.completedCases })}</span>
            <span>{t('row.years', { count: e.years })}</span>
          </p>
          <ul className="mk-topics" aria-label={t('row.topics')}>
            {e.topics.map((topic) => (
              <li key={topic}>{topic}</li>
            ))}
          </ul>
        </div>
      </div>

      <dl className="mk-cells">
        <div className="mk-cell mk-cell-fee">
          <dt>{t('row.fee')}</dt>
          <dd className="mk-num-lg">{format.money(offer.price)}</dd>
        </div>
        <div className="mk-cell mk-cell-sla">
          <dt>{t('row.delivery')}</dt>
          <dd className="mk-num-lg">{sla(offer.slaHours)}</dd>
        </div>
        <div className="mk-cell mk-cell-avail">
          <dt>{t('row.status')}</dt>
          <dd>
            <AvailabilityTag availability={e.availability} detailed />
          </dd>
        </div>
      </dl>

      <div className="mk-actions">
        {open && (
          <Link
            className="mk-btn mk-btn-accent"
            to={`${profile}#gui-yeu-cau`}
            aria-label={t('row.requestFor', { name: e.name })}
          >
            {t('row.request')}
          </Link>
        )}
        <Link className="mk-btn mk-btn-line" to={profile}>
          {t('row.profile')}
        </Link>
      </div>
    </li>
  )
}

export default function MarketplacePage() {
  const { t } = useTranslation('marketplace')
  const format = useFormatters()
  const sla = useSlaLabel()
  const [params, setParams] = useSearchParams()
  const requested = params.get('service')
  const service: ServiceId = isServiceId(requested) ? requested : 'cit-review'

  const [query, setQuery] = useState('')
  const [openOnly, setOpenOnly] = useState(false)
  const [slaMax, setSlaMax] = useState(0)
  const [sort, setSort] = useState<SortKey>('recommended')
  const picker = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLOListElement>(null)

  // Trên màn hẹp bộ chọn dịch vụ cuộn ngang: đưa thẻ đang chọn vào khung (vd. mở bằng ?service=).
  useEffect(() => {
    const box = picker.current
    const on = box?.querySelector<HTMLElement>('[data-on="true"]')
    if (!box || !on || box.scrollWidth <= box.clientWidth) return
    const gap =
      on.getBoundingClientRect().left - box.getBoundingClientRect().left
    box.scrollTo({ left: box.scrollLeft + gap - 16, behavior: 'smooth' })
  }, [service])

  useEffect(() => {
    const previous = document.title
    document.title = t('meta.title')
    return () => {
      document.title = previous
    }
  }, [t])

  const catalog = useMemo(
    () =>
      SERVICE_IDS.map((id) => {
        const listings = listingsFor(id)
        return {
          id,
          count: listings.length,
          from: Math.min(...listings.map((l) => l.offer.price)),
          fastest: Math.min(...listings.map((l) => l.offer.slaHours)),
        }
      }),
    []
  )

  const all = useMemo(() => listingsFor(service), [service])
  const shown = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('vi')
    const list = all.filter(({ expert: e, offer }) => {
      if (openOnly && !canRequest(e)) return false
      if (slaMax && offer.slaHours > slaMax) return false
      if (!needle) return true
      return [e.name, e.headline, ...e.topics].some((text) =>
        text.toLocaleLowerCase('vi').includes(needle)
      )
    })
    const byRating = (a: Listing, b: Listing) =>
      b.expert.rating - a.expert.rating || b.expert.reviews - a.expert.reviews
    const sorters: Record<SortKey, (a: Listing, b: Listing) => number> = {
      // Người đang nhận việc lên trước: Availability quyết định có gửi được yêu cầu hay không.
      recommended: (a, b) =>
        Number(canRequest(b.expert)) - Number(canRequest(a.expert)) ||
        byRating(a, b),
      rating: byRating,
      price: (a, b) => a.offer.price - b.offer.price,
      sla: (a, b) => a.offer.slaHours - b.offer.slaHours || byRating(a, b),
    }
    return [...list].sort(sorters[sort])
  }, [all, query, openOnly, slaMax, sort])

  const slaOptions = [
    { value: '0', label: t('filters.slaAny') },
    ...SLA_LIMITS.map((hours) => ({
      value: String(hours),
      label: t('filters.slaMax', { duration: sla(hours) }),
    })),
  ]
  const sortOptions: { value: SortKey; label: string }[] = [
    { value: 'recommended', label: t('filters.sortRecommended') },
    { value: 'rating', label: t('filters.sortRating') },
    { value: 'price', label: t('filters.sortPrice') },
    { value: 'sla', label: t('filters.sortSla') },
  ]
  useRevealRows(list, [shown])

  const filtered = query.trim() !== '' || openOnly || slaMax !== 0
  const reset = () =>
    withViewTransition(() => {
      setQuery('')
      setOpenOnly(false)
      setSlaMax(0)
    })

  return (
    <MarketplaceFrame skipTarget="mk-results">
      <header className="mk-head">
        <figure className="mk-plate" aria-hidden="true">
          <img
            src={consultationPhoto}
            alt=""
            width="1672"
            height="941"
            decoding="async"
            fetchPriority="high"
          />
        </figure>
        <div className="wrap">
          <div className="mk-intro">
            <h1>
              <Trans t={t} i18nKey="title" components={{ em: <em /> }} />
            </h1>
            <p className="mk-lead">{t('lead')}</p>
            <dl className="mk-proof">
              {(['gate1', 'gate2', 'escrow'] as const).map((key) => (
                <div key={key}>
                  <dt>{t(`proof.${key}.term`)}</dt>
                  <dd>{t(`proof.${key}.detail`)}</dd>
                </div>
              ))}
            </dl>
          </div>

          <fieldset className="mk-services">
            <legend>{t('services.label')}</legend>
            <div
              className="mk-tabs"
              ref={picker}
              style={{ '--on': SERVICE_IDS.indexOf(service) } as CSSProperties}
            >
              <span className="mk-tab-bar" aria-hidden="true" />
              {catalog.map((s) => (
                <label
                  key={s.id}
                  className="mk-service"
                  data-on={s.id === service}
                >
                  <input
                    type="radio"
                    name="service"
                    value={s.id}
                    checked={s.id === service}
                    onChange={() =>
                      setParams(
                        (prev) => {
                          const next = new URLSearchParams(prev)
                          next.set('service', s.id)
                          return next
                        },
                        { replace: true, preventScrollReset: true }
                      )
                    }
                  />
                  <span className="mk-service-name">
                    {t(`services.${s.id}.name`)}
                  </span>
                  <span className="mk-service-desc">
                    {t(`services.${s.id}.deliverable`)}
                  </span>
                  <span className="mk-service-facts">
                    <span>
                      <small>{t('services.from')}</small>
                      <b>{format.money(s.from)}</b>
                    </span>
                    <span>
                      <small>{t('services.fastest')}</small>
                      <b>{sla(s.fastest)}</b>
                    </span>
                    <span>
                      <small>{t('services.experts')}</small>
                      <b>{format.number(s.count)}</b>
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </header>

      <main className="mk-work" id="mk-results" tabIndex={-1}>
        <div className="wrap">
          <form
            className="mk-tools"
            role="search"
            aria-label={t('filters.label')}
            onSubmit={(event) => event.preventDefault()}
          >
            <label className="mk-search">
              <span className="sr-only">{t('filters.search')}</span>
              <Search size={18} aria-hidden="true" />
              <input
                type="search"
                value={query}
                placeholder={t('filters.searchPlaceholder')}
                onChange={(event) => {
                  const value = event.target.value
                  withViewTransition(() => setQuery(value))
                }}
              />
            </label>
            <CustomSelect
              className="mk-select"
              triggerClassName="mk-select-trigger"
              menuClassName="mk-select-menu"
              label={t('filters.sla')}
              value={String(slaMax)}
              onChange={(value) =>
                withViewTransition(() => setSlaMax(Number(value)))
              }
              options={slaOptions}
            />
            <CustomSelect
              className="mk-select"
              triggerClassName="mk-select-trigger"
              menuClassName="mk-select-menu"
              label={t('filters.sort')}
              value={sort}
              onChange={(value) => withViewTransition(() => setSort(value))}
              options={sortOptions}
            />
            <label className="mk-switch">
              <input
                type="checkbox"
                role="switch"
                checked={openOnly}
                onChange={(event) => {
                  const checked = event.target.checked
                  withViewTransition(() => setOpenOnly(checked))
                }}
              />
              <span className="mk-switch-track" aria-hidden="true" />
              {t('filters.openOnly')}
            </label>
          </form>

          <div className="mk-summary">
            <p aria-live="polite">
              {filtered
                ? t('results.filtered', {
                    count: shown.length,
                    total: all.length,
                  })
                : t('results.count', { count: all.length })}
            </p>
            {filtered && (
              <button type="button" className="mk-text-btn" onClick={reset}>
                {t('filters.reset')}
              </button>
            )}
            <p className="mk-demo">
              <Info size={15} aria-hidden="true" />
              {t('demo')}
            </p>
          </div>

          {shown.length > 0 ? (
            <div className="mk-sheet">
              <div className="mk-list-head" aria-hidden="true">
                <span>{t('row.expert')}</span>
                <span>{t('row.fee')}</span>
                <span>{t('row.delivery')}</span>
                <span>{t('row.status')}</span>
              </div>
              <ol className="mk-list" key={service} ref={list}>
                {shown.map((listing) => (
                  <ExpertRow
                    key={listing.expert.id}
                    listing={listing}
                    service={service}
                  />
                ))}
              </ol>
            </div>
          ) : (
            <div className="mk-empty">
              <SearchX size={28} aria-hidden="true" />
              <h2>{all.length ? t('empty.title') : t('empty.noOffers')}</h2>
              {all.length > 0 && <p>{t('empty.body')}</p>}
              {filtered && (
                <button
                  type="button"
                  className="mk-btn mk-btn-line"
                  onClick={reset}
                >
                  {t('filters.reset')}
                </button>
              )}
            </div>
          )}
        </div>
      </main>
    </MarketplaceFrame>
  )
}
