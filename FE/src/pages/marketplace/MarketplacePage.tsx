import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { Award, Info, RotateCw, Search, SearchX, Star } from 'lucide-react'
import { useFormatters } from '@/hooks/useFormatters'
import { CustomSelect } from '@/components/ui/forms/custom-select'
import { isExpertDemo } from '@/lib/expert-data-source'
import { MarketplaceFrame } from '@/features/marketplace/components/MarketplaceFrame'
import {
  AvailabilityTag,
  Avatar,
  VerifiedBadge,
} from '@/features/marketplace/components/ListingParts'
import { useSlaLabel } from '@/features/marketplace/hooks/useSlaLabel'
import { useMarketplace } from '@/features/marketplace/hooks/useMarketplace'
import { useServiceText } from '@/features/marketplace/hooks/useServiceText'
import { useFieldLabel } from '@/features/expert-vetting/hooks/useLabels'
import {
  useRevealRows,
  withViewTransition,
} from '@/features/marketplace/hooks/useListMotion'
import {
  canRequest,
  hasDeliverySla,
  listingsFor,
  serviceFacts,
  type Listing,
} from '@/features/marketplace/model'
import type { MarketplaceData } from '@/features/marketplace/types'
import consultationPhoto from '@/assets/generated/marketplace-consultation.png'

type SortKey = 'recommended' | 'rating' | 'price' | 'sla'
const SLA_LIMITS = [24, 48, 72, 168] as const
const EMPTY: MarketplaceData = { services: [], experts: [] }

function ExpertRow({
  listing: { expert: e, offer },
  service,
  showSla,
}: {
  listing: Listing
  service: string
  showSla: boolean
}) {
  const { t } = useTranslation('marketplace')
  const format = useFormatters()
  const sla = useSlaLabel()
  const fieldLabel = useFieldLabel()
  const open = canRequest(e)
  const profile = `/experts/${encodeURIComponent(e.id)}?service=${encodeURIComponent(service)}`
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
            />
          </div>
          {e.headline && <p className="mk-headline">{e.headline}</p>}
          {e.credential && (
            <p className="mk-credential">
              <Award size={15} aria-hidden="true" />
              {e.credential}
            </p>
          )}
          <p className="mk-meta">
            {e.reviews > 0 ? (
              <>
                <span className="mk-rating">
                  <Star size={14} aria-hidden="true" />
                  <b>{format.number(e.rating, { minimumFractionDigits: 2 })}</b>
                  <span className="sr-only">
                    {t('row.rating', { rating: e.rating })}
                  </span>
                </span>
                <span>{t('row.reviews', { count: e.reviews })}</span>
              </>
            ) : (
              <span>{t('row.noReviews')}</span>
            )}
            {e.completedCases != null && (
              <span>{t('row.cases', { count: e.completedCases })}</span>
            )}
            {e.years != null && (
              <span>{t('row.years', { count: e.years })}</span>
            )}
          </p>
          {e.topics.length > 0 && (
            <ul className="mk-topics" aria-label={t('row.topics')}>
              {e.topics.map((topic) => (
                <li key={topic}>{fieldLabel(topic)}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <dl className="mk-cells">
        <div className="mk-cell mk-cell-fee">
          <dt>{t('row.fee')}</dt>
          <dd className="mk-num-lg">{format.money(offer.price)}</dd>
        </div>
        {showSla && (
          <div className="mk-cell mk-cell-sla">
            <dt>{t('row.delivery')}</dt>
            <dd className="mk-num-lg">
              {offer.slaHours == null ? '—' : sla(offer.slaHours)}
            </dd>
          </div>
        )}
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
  const text = useServiceText()
  const fieldLabel = useFieldLabel()
  const query = useMarketplace()
  const data = query.data ?? EMPTY
  const [params, setParams] = useSearchParams()
  const requested = params.get('service')
  const service =
    data.services.find((s) => s.id === requested)?.id ??
    data.services[0]?.id ??
    ''
  // Delivery SLA is hidden until the service catalog carries it (none in API mode yet)
  const showSla = useMemo(() => hasDeliverySla(data.experts), [data])

  const [search, setSearch] = useState('')
  const [openOnly, setOpenOnly] = useState(false)
  const [slaMax, setSlaMax] = useState(0)
  const [sortChoice, setSort] = useState<SortKey>('recommended')
  const sort = showSla || sortChoice !== 'sla' ? sortChoice : 'recommended'
  const picker = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLOListElement>(null)

  // On narrow screens the service picker scrolls sideways: bring the picked card into view (e.g. from ?service=).
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

  const catalog = useMemo(() => serviceFacts(data), [data])

  const all = useMemo(() => listingsFor(data.experts, service), [data, service])
  const shown = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('vi')
    const list = all.filter(({ expert: e, offer }) => {
      if (openOnly && !canRequest(e)) return false
      if (showSla && slaMax && (offer.slaHours ?? Infinity) > slaMax)
        return false
      if (!needle) return true
      return [e.name, e.headline, ...e.topics.map(fieldLabel)].some((text) =>
        text.toLocaleLowerCase('vi').includes(needle)
      )
    })
    const byRating = (a: Listing, b: Listing) =>
      b.expert.rating - a.expert.rating || b.expert.reviews - a.expert.reviews
    const sorters: Record<SortKey, (a: Listing, b: Listing) => number> = {
      // Experts taking work first: availability decides whether a request can be sent.
      recommended: (a, b) =>
        Number(canRequest(b.expert)) - Number(canRequest(a.expert)) ||
        byRating(a, b),
      rating: byRating,
      price: (a, b) => a.offer.price - b.offer.price,
      sla: (a, b) =>
        (a.offer.slaHours ?? Infinity) - (b.offer.slaHours ?? Infinity) ||
        byRating(a, b),
    }
    return [...list].sort(sorters[sort])
  }, [all, search, openOnly, slaMax, sort, showSla, fieldLabel])

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
    ...(showSla
      ? [{ value: 'sla' as const, label: t('filters.sortSla') }]
      : []),
  ]
  useRevealRows(list, [shown])

  const filtered = search.trim() !== '' || openOnly || slaMax !== 0
  const reset = () =>
    withViewTransition(() => {
      setSearch('')
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

          {catalog.length > 0 && (
            <fieldset className="mk-services">
              <legend>{t('services.label')}</legend>
              <div
                className="mk-tabs"
                ref={picker}
                style={
                  {
                    '--on': catalog.findIndex((s) => s.id === service),
                  } as CSSProperties
                }
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
                      {text.name(s.id, s.name)}
                    </span>
                    {text.deliverable(s.id) && (
                      <span className="mk-service-desc">
                        {text.deliverable(s.id)}
                      </span>
                    )}
                    <span className="mk-service-facts">
                      {s.from != null && (
                        <span>
                          <small>{t('services.from')}</small>
                          <b>{format.money(s.from)}</b>
                        </span>
                      )}
                      {s.fastest != null && (
                        <span>
                          <small>{t('services.fastest')}</small>
                          <b>{sla(s.fastest)}</b>
                        </span>
                      )}
                      <span>
                        <small>{t('services.experts')}</small>
                        <b>{format.number(s.count)}</b>
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
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
                value={search}
                placeholder={t('filters.searchPlaceholder')}
                onChange={(event) => {
                  const value = event.target.value
                  withViewTransition(() => setSearch(value))
                }}
              />
            </label>
            {showSla && (
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
            )}
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
              {query.isSuccess &&
                (filtered
                  ? t('results.filtered', {
                      count: shown.length,
                      total: all.length,
                    })
                  : t('results.count', { count: all.length }))}
            </p>
            {filtered && (
              <button type="button" className="mk-text-btn" onClick={reset}>
                {t('filters.reset')}
              </button>
            )}
            {isExpertDemo && (
              <p className="mk-demo">
                <Info size={15} aria-hidden="true" />
                {t('demo')}
              </p>
            )}
          </div>

          {query.isPending ? (
            <div
              className="mk-sheet mk-sheet-loading"
              role="status"
              aria-label={t('list.loading')}
            >
              <div className="mk-skel mk-skel-block" />
              <div className="mk-skel mk-skel-block" />
            </div>
          ) : query.isError ? (
            <div className="mk-empty">
              <SearchX size={28} aria-hidden="true" />
              <h2>{t('list.failed')}</h2>
              <p>{t('list.failedBody')}</p>
              <button
                type="button"
                className="mk-btn mk-btn-line"
                onClick={() => void query.refetch()}
              >
                <RotateCw size={16} aria-hidden="true" />
                {t('profile.retry')}
              </button>
            </div>
          ) : shown.length > 0 ? (
            <div className="mk-sheet" data-sla={showSla}>
              <div className="mk-list-head" aria-hidden="true">
                <span>{t('row.expert')}</span>
                <span>{t('row.fee')}</span>
                {showSla && <span>{t('row.delivery')}</span>}
                <span>{t('row.status')}</span>
              </div>
              <ol className="mk-list" key={service} ref={list}>
                {shown.map((listing) => (
                  <ExpertRow
                    key={listing.expert.id}
                    listing={listing}
                    service={service}
                    showSla={showSla}
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
