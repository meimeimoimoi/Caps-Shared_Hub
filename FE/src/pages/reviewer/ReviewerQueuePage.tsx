import { useId, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Inbox, RefreshCw, Search } from 'lucide-react'
import { useReviewerQueue, useReviewerSearch } from '@/features/reviewer/useReviewerQueue'
import { StatusBadge } from '@/components/ui/display/status-badge'
import { CustomSelect } from '@/components/ui/forms/custom-select'
import { Pagination } from '@/components/ui/navigation/pagination'
import { Button } from '@/components/ui/actions/button'
import { useFormatters } from '@/hooks/useFormatters'
import { Input } from '@/components/ui/forms/input'

export default function ReviewerQueuePage({ history = false, gate: routeGate = 'ALL' }: { history?: boolean; gate?: 'ALL' | 'GATE_1' | 'GATE_2' }) {
  const { t } = useTranslation('reviewer')
  const { query, setQuery } = useReviewerSearch()
  const format = useFormatters()
  const navigate = useNavigate()
  const [historyGate, setHistoryGate] = useState('ALL')
  const gate = history ? historyGate : routeGate
  const changeGate = (value: string) => {
    if (history) setHistoryGate(value)
    else navigate(value === 'GATE_1' ? '/reviewer/gate-1' : value === 'GATE_2' ? '/reviewer/gate-2' : '/reviewer')
  }
  const [status, setStatus] = useState('OPEN')
  const { records, isLoading, isFetching, error, refresh } = useReviewerQueue({
    gate,
    mode: history ? 'HISTORY' : status === 'ALL' ? 'ALL' : 'OPEN',
  })
  const [paging, setPaging] = useState({ key: '', page: 1 })
  const filterKey = `${history}:${query}:${gate}:${status}`
  const filtered = records.filter(
    (row) =>
      (!history || row.reviewed) &&
      (gate === 'ALL' || gate === row.gate) &&
      (history || status === 'ALL' || row.open) &&
      `${row.name} ${row.id} ${row.serviceLabel}`
        .toLocaleLowerCase()
        .includes(query.trim().toLocaleLowerCase())
  )
  const page = Math.min(
    paging.key === filterKey ? paging.page : 1,
    Math.max(1, Math.ceil(filtered.length / 5))
  )
  const clear = () => {
    setQuery('')
    if (history) setHistoryGate('ALL')
    setStatus('OPEN')
  }
  const searchId = useId()
  const title = t(history ? 'history' : gate === 'GATE_1' ? 'gate1' : gate === 'GATE_2' ? 'gate2' : 'queue')
  const description = t(history ? 'liveHistoryIntro' : gate === 'GATE_1' ? 'gate1QueueIntro' : gate === 'GATE_2' ? 'gate2QueueIntro' : 'queueIntro')
  const rows = filtered.slice((page - 1) * 5, page * 5)
  const showScope = gate !== 'GATE_1'
  const action = (row: (typeof records)[number]) => (
    <Link
      to={`/reviewer/${row.gate === 'GATE_1' ? 'gate-1' : 'gate-2'}/${row.id}`}
      aria-label={`${t(row.open ? 'openReview' : 'viewReview')}: ${row.name}`}
      className="text-text-strong hover:text-accent-text focus-visible:ring-accent group inline-flex min-h-11 items-center justify-center gap-3 rounded-md px-2 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
    >
      {t(row.open ? 'openReview' : 'viewReview')}
      <ArrowRight size={16} aria-hidden="true" className="text-text-muted group-hover:text-accent-text transition-transform motion-safe:group-hover:translate-x-1" />
    </Link>
  )
  const reference = (id: string) => (
    <span title={id} aria-label={`${t('referenceLabel')}: ${id}`} className="text-text-muted mt-1 block text-xs tabular-nums">
      #{id.slice(0, 8)} · {id.slice(-4)}
    </span>
  )
  return (
    <div className="mx-auto w-full max-w-6xl space-y-7 font-sans">
      <header className="border-border border-b pb-6">
        <div className="max-w-2xl">
          <h1 className="text-text-strong font-sans text-2xl leading-tight font-semibold tracking-tight sm:text-[28px]">
            {title}
          </h1>
          <p className="text-text-muted mt-2 max-w-xl text-sm leading-6">
            {description}
          </p>
        </div>
      </header>

      {error && (
        <div role="alert" className="bg-danger-soft text-danger rounded-lg p-4 text-sm">
          <p>{error.message}</p>
          <Button variant="outline" className="mt-3" disabled={isFetching} onClick={() => void refresh()}>
            {t('retry')}
          </Button>
        </div>
      )}

      <section aria-label={title} aria-busy={isLoading} className="border-border bg-surface overflow-hidden rounded-xl border shadow-[0_2px_8px_-4px_rgb(0_0_0/0.08)]">
        <div className="border-border flex flex-wrap items-center justify-between gap-x-5 gap-y-3 border-b px-4 pt-3 sm:px-6">
          {!history ? (
            <div role="group" aria-label={t('statusFilter')} className="flex self-stretch gap-5">
              {[{ value: 'OPEN', label: t('openOnly') }, { value: 'ALL', label: t('allStatuses') }].map((option) => (
                <button key={option.value} type="button" aria-pressed={status === option.value} onClick={() => setStatus(option.value)} className={`focus-visible:ring-accent -mb-px flex min-h-12 items-center gap-2 border-b-2 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none ${status === option.value ? 'border-accent text-text-strong font-semibold' : 'text-text-muted hover:text-text-strong border-transparent'}`}>
                  {option.label}
                  {status === option.value && !isLoading && !error && <span className="bg-surface-muted text-text-muted rounded-md px-1.5 py-0.5 text-xs font-medium tabular-nums">{filtered.length}</span>}
                </button>
              ))}
            </div>
          ) : <p className="text-text-muted py-3 text-sm">{t('queueCount', { count: filtered.length })}</p>}
          <div className="flex w-full flex-wrap items-center gap-2 pb-3 lg:w-auto">
            <div className="min-w-0 flex-1 lg:w-72 lg:flex-none">
              <label htmlFor={searchId} className="sr-only">{t('searchLabel')}</label>
              <div className="relative">
                <Search size={17} aria-hidden="true" className="text-text-muted pointer-events-none absolute top-1/2 left-3 -translate-y-1/2" />
                <Input id={searchId} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('search')} className="border-transparent bg-surface-muted focus-visible:bg-surface h-10 rounded-lg pl-10 text-[13px] shadow-none" />
              </div>
            </div>
            {(routeGate === 'ALL' || history) && (
              <CustomSelect
                label={t('gateFilter')}
                value={gate}
                options={[{ value: 'ALL', label: t('allGates') }, { value: 'GATE_1', label: t('gate1') }, { value: 'GATE_2', label: t('gate2') }]}
                onChange={changeGate}
                className="flex min-w-0 flex-col text-xs [&>span]:sr-only"
                triggerClassName="!h-10 !w-44 !border-transparent !shadow-none"
              />
            )}
            <button type="button" aria-label={t('refresh')} title={t('refresh')} disabled={isFetching} onClick={() => void refresh()} className="text-text-muted hover:bg-surface-muted hover:text-text-strong focus-visible:ring-accent inline-flex size-11 shrink-0 items-center justify-center rounded-lg focus-visible:ring-2 focus-visible:outline-none disabled:opacity-40">
              <RefreshCw size={16} aria-hidden="true" className={isFetching ? 'animate-spin motion-reduce:animate-none' : ''} />
            </button>
          </div>
          {(query || (history && gate !== 'ALL')) && <div className="text-text-muted flex w-full items-center justify-between gap-3 pb-3 text-xs">
            <p aria-live="polite">{t('queueCount', { count: filtered.length })}</p>
              <button type="button" onClick={clear} className="text-accent-text focus-visible:ring-accent rounded px-1 py-1 font-medium hover:underline focus-visible:ring-2 focus-visible:outline-none">{t('clearFilters')}</button>
          </div>}
        </div>

        {isLoading ? (
          <div role="status" className="text-text-muted flex min-h-56 items-center justify-center gap-3 p-8 text-sm">
            <RefreshCw size={18} aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
            {t('loading')}
          </div>
        ) : error && !records.length ? null : filtered.length ? (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">{title}</caption>
                <thead className="text-text-muted border-border border-b bg-surface-muted/50 text-xs">
                  <tr>
                    <th scope="col" className="w-[40%] px-6 py-3.5 font-medium">{t('applicant')}</th>
                    {showScope && <th scope="col" className="px-5 py-3.5 font-medium">{t('scope')}</th>}
                    <th scope="col" className="px-5 py-3.5 font-medium">{t('submitted')}</th>
                    <th scope="col" className="px-5 py-3.5 font-medium">{t('status')}</th>
                    <th scope="col" className="w-40 px-5 py-3.5"><span className="sr-only">{t('openReview')}</span></th>
                  </tr>
                </thead>
                <tbody className="divide-border divide-y">
                  {rows.map((row) => (
                    <tr key={`${row.gate}:${row.id}`} className="hover:bg-surface-muted/60 focus-within:bg-surface-muted/60 transition-colors">
                      <td className="px-6 py-6">
                        <div className="flex items-center gap-3.5">
                          <span aria-hidden="true" className="bg-surface-muted text-text-muted flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold">{row.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</span>
                          <div><p className="text-text-strong font-semibold">{row.name}</p>{reference(row.id)}</div>
                        </div>
                      </td>
                      {showScope && <td className="px-5 py-5"><p className="font-medium">{t(row.gate === 'GATE_1' ? 'gate1' : 'gate2')}</p><p className="text-text-muted mt-1 text-xs">{row.gate === 'GATE_1' ? t('expertScope') : row.serviceLabel}</p></td>}
                      <td className="px-5 py-5 whitespace-nowrap">
                        <time dateTime={row.submittedAt} className="text-text-strong block tabular-nums">{format.timestamp(row.submittedAt, 'Asia/Bangkok', { dateStyle: 'medium' })}</time>
                        <span className="text-text-muted mt-1 block text-xs tabular-nums">{format.timestamp(row.submittedAt, 'Asia/Bangkok', { timeStyle: 'short' })}</span>
                      </td>
                      <td className="px-5 py-5"><StatusBadge status={row.statusMeta} /></td>
                      <td className="px-5 py-5 text-right">{action(row)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-border divide-y md:hidden">
              {rows.map((row) => (
                <li key={`${row.gate}:${row.id}`} className="space-y-4 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="text-text-strong font-semibold">{row.name}</p>{reference(row.id)}</div><StatusBadge status={row.statusMeta} /></div>
                  {showScope && <p className="text-text-muted text-sm">{t(row.gate === 'GATE_1' ? 'gate1' : 'gate2')}{row.serviceLabel ? ` · ${row.serviceLabel}` : ''}</p>}
                  <div className="flex flex-wrap items-center justify-between gap-3"><time dateTime={row.submittedAt} className="text-text-muted text-xs tabular-nums">{format.timestamp(row.submittedAt, 'Asia/Bangkok', { dateStyle: 'medium', timeStyle: 'short' })}</time>{action(row)}</div>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="flex min-h-64 flex-col items-center justify-center px-6 py-10 text-center">
            <Inbox size={28} strokeWidth={1.5} aria-hidden="true" className="text-text-muted mb-4" />
            <h2 className="text-text-strong font-sans text-lg font-semibold">{t('noReviews')}</h2>
            <p className="text-text-muted mt-2 max-w-sm text-sm leading-6">{t('noReviewsBody')}</p>
            {(query || status !== 'OPEN') && <Button variant="outline" className="mt-5 min-h-11" onClick={clear}>{t('clearFilters')}</Button>}
          </div>
        )}
        {!isLoading && !(error && !records.length) && <Pagination page={page} pageSize={5} total={filtered.length} onPageChange={(value) => setPaging({ key: filterKey, page: value })} />}
      </section>
    </div>
  )
}
