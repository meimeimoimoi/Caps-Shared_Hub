import { useCallback, useId, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Hand, Inbox, ListFilter, RefreshCw, Search, UserRound } from 'lucide-react'
import { useReviewerQueue, useReviewerSearch } from '@/features/reviewer/useReviewerQueue'
import { StatusBadge } from '@/components/ui/display/status-badge'
import { CustomSelect } from '@/components/ui/forms/custom-select'
import { Pagination } from '@/components/ui/navigation/pagination'
import { Button } from '@/components/ui/actions/button'
import { useFormatters } from '@/hooks/useFormatters'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useFieldLabel } from '@/features/expert-vetting/hooks/useLabels'
import { Input } from '@/components/ui/forms/input'
import { Toast } from '@/components/ui/feedback/toast'
import { ApiError } from '@/lib/api-client'
import { claimApplication } from '@/features/expert-vetting/api/adminApi'
import { claimQualification } from '@/features/expert-vetting/api/qualificationApi'
import { adminKeys } from '@/features/expert-vetting/api/queryKeys'
import type { ClaimFilter } from '@/features/expert-vetting/api/reviewQueueApi'

const CLAIM_FILTERS: ClaimFilter[] = ['MINE_OR_UNCLAIMED', 'MINE', 'UNCLAIMED', 'ALL']

export default function ReviewerQueuePage({ history = false, gate: routeGate = 'ALL' }: { history?: boolean; gate?: 'ALL' | 'GATE_1' | 'GATE_2' }) {
  const { t } = useTranslation('reviewer')
  const { query, setQuery } = useReviewerSearch()
  const format = useFormatters()
  const fieldLabel = useFieldLabel()
  const navigate = useNavigate()
  const [historyGate, setHistoryGate] = useState('ALL')
  const gate = history ? historyGate : routeGate
  const changeGate = (value: string) => {
    if (history) setHistoryGate(value)
    else navigate(value === 'GATE_1' ? '/reviewer/gate-1' : value === 'GATE_2' ? '/reviewer/gate-2' : '/reviewer')
  }
  const [status, setStatus] = useState('OPEN')
  // Default: what this reviewer can work on (held by them or by nobody)
  const [claimFilter, setClaimFilter] = useState<ClaimFilter>('MINE_OR_UNCLAIMED')
  const [toast, setToast] = useState<string | null>(null)
  const clearToast = useCallback(() => setToast(null), [])
  const qc = useQueryClient()
  // Paging, search and status filtering run on the server; the search waits for typing to pause
  const search = useDebouncedValue(query)
  const filterKey = `${history}:${search}:${gate}:${status}:${claimFilter}`
  const [paging, setPaging] = useState({ key: filterKey, page: 1, pageSize: 10 })
  const page = paging.key === filterKey ? paging.page : 1
  const { records, total, isLoading, isFetching, error, refresh } = useReviewerQueue({
    gate,
    mode: history ? 'HISTORY' : status === 'ALL' ? 'ALL' : 'OPEN',
    search,
    page,
    pageSize: paging.pageSize,
    claim: claimFilter,
  })
  const rows = records
  const waitedDays = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000))
  const waited = (iso: string) => format.relativeTime(-waitedDays(iso), 'day')
  const initials = (name: string) =>
    name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
  const clear = () => {
    setQuery('')
    if (history) setHistoryGate('ALL')
    setStatus('OPEN')
    setClaimFilter('MINE_OR_UNCLAIMED')
  }
  const searchId = useId()
  const title = t(history ? 'history' : gate === 'GATE_1' ? 'gate1' : gate === 'GATE_2' ? 'gate2' : 'queue')
  const description = t(history ? 'liveHistoryIntro' : gate === 'GATE_1' ? 'gate1QueueIntro' : gate === 'GATE_2' ? 'gate2QueueIntro' : 'queueIntro')
  const reviewPath = (row: (typeof records)[number]) =>
    `/reviewer/${row.gate === 'GATE_1' ? 'gate-1' : 'gate-2'}/${row.id}`
  // Claiming from the list opens the review; another reviewer winning first shows who in the refreshed row
  const take = useMutation({
    mutationFn: async (row: (typeof records)[number]) => {
      if (row.gate === 'GATE_1') await claimApplication(row.id)
      else await claimQualification(row.id)
    },
    onSuccess: (_, row) => navigate(reviewPath(row)),
    onError: (e: unknown) => {
      setToast(
        e instanceof ApiError && e.code === 'REVIEW_CLAIMED'
          ? t('claimTaken')
          : t('claimFailed')
      )
      void qc.invalidateQueries({ queryKey: adminKeys.queueAll() })
    },
  })
  const holder = (row: (typeof records)[number]) =>
    row.heldByMe ? t('holderMe') : row.held ? (row.holderEmail ?? t('holderSomeone')) : t('holderNone')
  // The link covers its whole row (after:inset-0), so the row is the click target
  const reference = (id: string) => (
    <span title={id} aria-label={`${t('referenceLabel')}: ${id}`} className="tabular-nums">
      {id.slice(0, 8)}
    </span>
  )
  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 font-sans">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-text-strong !font-sans text-xl font-semibold tracking-tight">{title}</h1>
          <p className="text-text-muted mt-1 text-sm">{description}</p>
        </div>
      </header>

      {error && (
        <div role="alert" className="border-danger/30 bg-danger-soft text-danger flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm">
          <p>{error.message}</p>
          <Button variant="outline" disabled={isFetching} onClick={() => void refresh()}>
            {t('retry')}
          </Button>
        </div>
      )}

      {/* No outer frame: toolbar, cards and pager sit on the page; only the cards carry a border */}
      <section aria-label={title} aria-busy={isLoading} className="space-y-4">
        {/* Search first, then compact dropdown filters; the result count sits at the far end */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 basis-full sm:max-w-sm sm:basis-auto">
            <label htmlFor={searchId} className="sr-only">{t('searchLabel')}</label>
            <Search size={15} aria-hidden="true" className="text-text-muted pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2" />
            <Input id={searchId} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('search')} className="h-8 rounded-md pl-8 text-sm shadow-none" />
          </div>
          {!history && (
            <CustomSelect
              label={t('statusFilter')}
              value={status}
              options={[{ value: 'OPEN', label: t('openOnly') }, { value: 'ALL', label: t('allStatuses') }]}
              onChange={setStatus}
              triggerLeading={<ListFilter size={14} aria-hidden="true" className="text-text-muted" />}
              className="flex min-w-0 flex-col text-xs [&>span]:sr-only"
              triggerClassName="!h-8 !min-h-8 !w-auto !gap-2 !rounded-md !px-2.5 !py-0 text-sm !shadow-none"
            />
          )}
          {!history && (
            <CustomSelect
              label={t('claimFilter')}
              value={claimFilter}
              options={CLAIM_FILTERS.map((value) => ({ value, label: t(`claimFilters.${value}`) }))}
              onChange={(value) => setClaimFilter(value as ClaimFilter)}
              triggerLeading={<UserRound size={14} aria-hidden="true" className="text-text-muted" />}
              className="flex min-w-0 flex-col text-xs [&>span]:sr-only"
              triggerClassName="!h-8 !min-h-8 !w-auto !gap-2 !rounded-md !px-2.5 !py-0 text-sm !shadow-none"
            />
          )}
          {(routeGate === 'ALL' || history) && (
            <CustomSelect
              label={t('gateFilter')}
              value={gate}
              options={[{ value: 'ALL', label: t('allGates') }, { value: 'GATE_1', label: t('gate1') }, { value: 'GATE_2', label: t('gate2') }]}
              onChange={changeGate}
              className="flex min-w-0 flex-col text-xs [&>span]:sr-only"
              triggerClassName="!h-8 !min-h-8 !w-auto !gap-2 !rounded-md !px-2.5 !py-0 text-sm !shadow-none"
            />
          )}
          <div className="ml-auto flex items-center gap-3">
            {!isLoading && !error && <p aria-live="polite" className="text-text-muted text-sm tabular-nums">{t('queueCount', { count: total })}</p>}
            <button type="button" aria-label={t('refresh')} title={t('refresh')} disabled={isFetching} onClick={() => void refresh()} className="border-border text-text-muted hover:bg-surface-muted hover:text-text-strong focus-visible:ring-[var(--ui-border-strong)] inline-flex size-8 shrink-0 items-center justify-center rounded-md border focus-visible:ring-2 focus-visible:outline-none disabled:opacity-40">
              <RefreshCw size={14} aria-hidden="true" className={isFetching ? 'animate-spin motion-reduce:animate-none' : ''} />
            </button>
          </div>
          {(query || status !== 'OPEN' || claimFilter !== 'MINE_OR_UNCLAIMED' || (history && gate !== 'ALL')) && <div className="flex w-full justify-end text-xs">
            <button type="button" onClick={clear} className="text-text-strong focus-visible:ring-[var(--ui-border-strong)] rounded px-1 py-1 font-medium hover:underline focus-visible:ring-2 focus-visible:outline-none">{t('clearFilters')}</button>
          </div>}
        </div>

        {isLoading ? (
          <div role="status" className="border-border text-text-muted flex min-h-48 items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-sm">
            <RefreshCw size={15} aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
            {t('loading')}
          </div>
        ) : error && !records.length ? null : total ? (
          <>
            {/* Full-width list: one row per application, divided inside a single bordered list */}
            <ul className="border-border bg-surface divide-border divide-y overflow-hidden rounded-lg border">
              {rows.map((row) => {
                const fields = (row.fields ?? []).slice(0, 2).map(fieldLabel).join(', ')
                return (
                  <li key={`${row.gate}:${row.id}`} className="hover:bg-surface-muted/50 focus-within:bg-surface-muted/50 relative flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3.5 transition-colors md:flex-nowrap">
                    <span aria-hidden="true" className="bg-surface-muted text-text-muted flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                      {initials(row.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-text-strong min-w-0 truncate !font-sans !text-[15px] font-semibold">{row.name}</h2>
                        {row.isReapplication && <span className="bg-surface-muted text-text-muted rounded px-1.5 py-0.5 text-xs">{t('reapplication')}</span>}
                      </div>
                      <p className="text-text-muted mt-0.5 truncate text-sm">
                        {[row.gate === 'GATE_2' ? row.serviceLabel : '', t('yearsExperience', { count: row.years }), fields].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <div className="text-text-muted w-full text-xs tabular-nums md:w-44 md:shrink-0">
                      <time dateTime={row.submittedAt} className="text-text block text-sm">{format.timestamp(row.submittedAt, 'Asia/Bangkok', { dateStyle: 'medium' })}</time>
                      <span>{row.open ? `${waited(row.submittedAt)} · ` : ''}{reference(row.id)}</span>
                    </div>
                    <div className="md:w-52 md:shrink-0">
                      <div className="[&>*]:whitespace-nowrap"><StatusBadge status={row.statusMeta} /></div>
                      {!history && (
                        <p className="text-text-muted mt-1 flex min-w-0 items-center gap-1 text-xs">
                          <span className="shrink-0">{t('holderLabel')}:</span>
                          <span className={row.heldByMe ? 'text-text-strong truncate font-medium' : 'truncate'}>{holder(row)}</span>
                        </p>
                      )}
                    </div>
                    {!history && row.claimable && !row.held && (
                      <Button
                        variant="outline"
                        disabled={take.isPending}
                        onClick={() => take.mutate(row)}
                        aria-label={`${t('claimAction')}: ${row.name}`}
                        className="relative z-10 ml-auto h-9 shrink-0 gap-1.5"
                      >
                        <Hand size={14} aria-hidden="true" />
                        {t('claimAction')}
                      </Button>
                    )}
                    <Link
                      to={reviewPath(row)}
                      aria-label={`${t(row.open ? 'openReview' : 'viewReview')}: ${row.name}`}
                      className="border-border text-text-strong hover:bg-surface focus-visible:ring-[var(--ui-border-strong)] ml-auto inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border px-3 text-sm font-medium after:absolute after:inset-0 after:content-[''] focus-visible:ring-2 focus-visible:outline-none"
                    >
                      {t(row.open ? 'openReview' : 'viewReview')}
                      <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          </>
        ) : (
          <div className="border-border flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed px-6 py-10 text-center">
            <Inbox size={20} strokeWidth={1.75} aria-hidden="true" className="text-text-muted mb-3" />
            <h2 className="text-text-strong text-sm font-medium">{t('noReviews')}</h2>
            <p className="text-text-muted mt-1 max-w-sm text-sm">{t('noReviewsBody')}</p>
            {(query || status !== 'OPEN' || claimFilter !== 'MINE_OR_UNCLAIMED') && <Button variant="outline" className="mt-4" onClick={clear}>{t('clearFilters')}</Button>}
          </div>
        )}
        {!isLoading && total > 0 && (
          <div className="[&_.shared-pagination]:!rounded-none [&_.shared-pagination]:!border-t-0 [&_.shared-pagination]:!bg-transparent [&_.shared-pagination]:!px-0 [&_.shared-pagination]:!py-1">
          <Pagination
            page={page}
            pageSize={paging.pageSize}
            total={total}
            onPageChange={(value) => setPaging({ ...paging, key: filterKey, page: value })}
            onPageSizeChange={(size) => setPaging({ key: filterKey, page: 1, pageSize: size })}
            pageSizeOptions={[10, 20, 50]}
            label={t('queuePagination')}
          />
          </div>
        )}
      </section>
      {toast && <Toast message={toast} onDone={clearToast} />}
    </div>
  )
}
