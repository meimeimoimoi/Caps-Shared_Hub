import { SortableTh } from '@/components/ui/navigation/sortable-th'
import { useTableSort } from '@/hooks/useTableSort'
import { formatVnd } from '@/lib/format-money'
import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Pagination } from '@/components/ui/navigation/pagination'
import { usePagination } from '@/hooks/usePagination'
import { useFormatters } from '@/hooks/useFormatters'
import { cn } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/display/status-badge'
import { CustomSelect } from '@/components/ui/forms/custom-select'
import { EmptyState } from '@/components/ui/feedback/empty-state'
import { Toast } from '@/components/ui/feedback/toast'
import { AdminLayout } from '@/app/layouts/admin/AdminLayout'
import { useAdminNav } from '@/app/layouts/admin/useAdminNav'
import {
  DISPUTE_RESOLVED,
  DISPUTE_ESCALATION_DAYS,
  DISPUTE_SLA_DAYS,
} from '@/features/disputes-escrow/constants'
import { useDisputes } from '@/features/disputes-escrow/hooks/useDispute'
import {
  disputeBadgeKey,
  disputeHoursLeft,
  disputeSlaHours,
  filterDisputes,
  type DisputeStatusFilter,
  type DisputeSlaFilter,
} from '@/features/disputes-escrow/utils/disputes'
import type { Dispute } from '@/features/disputes-escrow/types'
import { PageHeader } from '@/components/ui/layout/page-header'
import { LoadError } from '@/components/ui/feedback/load-error'
import { OperationsUnavailable } from '@/features/disputes-escrow/components/OperationsUnavailable'

type DisputeRow = Dispute & { hoursLeft: number | null }
const statuses: DisputeStatusFilter[] = ['all', 'open', 'escalated', 'resolved']
const deadlines: DisputeSlaFilter[] = ['all', 'overdue', 'dueSoon', 'onTime']

/** Search and filter the full returned queue before taking the visible page. */
export default function AdminDisputesPage() {
  const nav = useAdminNav()
  const { t } = useTranslation(['admin', 'common'])
  const format = useFormatters()
  // A decision made on the detail page arrives with its confirmation; clear the state so a reload does not repeat it
  const location = useLocation()
  const navigate = useNavigate()
  const [toast, setToast] = useState<string | null>(
    (location.state as { toast?: string } | null)?.toast ?? null
  )
  const clearToast = useCallback(() => {
    setToast(null)
    navigate('.', { replace: true, state: null })
  }, [navigate])
  const { data = [], isLoading, error } = useDisputes(!nav.disputesUnavailable)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<DisputeStatusFilter>('all')
  const [sla, setSla] = useState<DisputeSlaFilter>('all')
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const allRows = data
    .map((d) => ({
      ...d,
      hoursLeft: d.resolvedAt ? null : disputeHoursLeft(d, now),
    }))
    .sort((a, b) =>
      a.hoursLeft !== null && b.hoursLeft !== null
        ? a.hoursLeft - b.hoursLeft
        : a.hoursLeft !== null
          ? -1
          : b.hoursLeft !== null
            ? 1
            : b.resolvedAt!.localeCompare(a.resolvedAt!)
    )
  const rows = filterDisputes(allRows, query, status, sla, (kind) =>
    t(`disputes.kind.${kind}`)
  )
  const tableSort = useTableSort(rows, {
    caseId: (d) => d.code ?? d.id,
    amount: (d) => d.fee,
    openedAt: (d) => Date.parse(d.openedAt),
    deadline: (d) => d.resolvedAt ? null : d.decideBy ? Date.parse(d.decideBy) : Date.parse(d.openedAt) + disputeSlaHours(d) * 3_600_000,
  }, { key: 'deadline', direction: 'asc' })
  const paged = usePagination(tableSort.rows, JSON.stringify([query.trim(), status, sla, tableSort.sort]))
  const openCount = allRows.filter((r) => r.hoursLeft !== null).length
  const hasFilters = !!query.trim() || status !== 'all' || sla !== 'all'
  const clearFilters = () => {
    setQuery('')
    setStatus('all')
    setSla('all')
  }
  const statusBadge = (d: DisputeRow) => (
    <span className="[&_svg]:shrink-0 [&>span]:max-w-full [&>span]:whitespace-normal">
      <StatusBadge
        status={
          d.resolvedAt
            ? {
                ...DISPUTE_RESOLVED,
                label: t(DISPUTE_RESOLVED.label),
              }
            : { label: t(disputeBadgeKey(d)), tone: 'warning' }
        }
      />
    </span>
  )
  const deadline = (d: DisputeRow) => (
    <span
      className={cn(
        'num',
        d.hoursLeft !== null && d.hoursLeft <= 12
          ? 'text-danger font-semibold'
          : 'text-fg-muted'
      )}
    >
      {d.hoursLeft === null
        ? '—'
        : d.hoursLeft === 0
          ? t('disputes.filters.sla.overdue')
          : t('disputes.hours', { hours: d.hoursLeft })}
    </span>
  )
  const viewLink = (d: DisputeRow) => (
    <Link
      to={`/admin/disputes/${d.id}`}
      aria-label={t('disputes.viewLabel', { id: d.code ?? d.id })}
      className="btn btn-press btn-secondary max-w-full !whitespace-normal no-underline"
    >
      {t('disputes.view')}
    </Link>
  )

  return (
    <AdminLayout
      {...nav}
      section="disputes"
      breadcrumb={t('disputes.title')}
      search={query}
      searchLabel={t('disputes.filters.search')}
      onSearchChange={nav.disputesUnavailable ? undefined : setQuery}
    >
      <PageHeader
        title={t('disputes.title')}
        badge={
          !nav.disputesUnavailable && !isLoading && !error ? (
            <span
              role="status"
              className="bg-accent-soft text-accent-text rounded-full px-3 py-1 text-sm font-semibold"
            >
              {t('disputes.introCount', { count: openCount })}
            </span>
          ) : undefined
        }
        help={t('disputes.introRule', {
          days: DISPUTE_SLA_DAYS,
          extra: DISPUTE_ESCALATION_DAYS,
        })}
      />
      {nav.disputesUnavailable ? (
        <OperationsUnavailable area="disputes" />
      ) : (
        <>
          <div className="mt-8 flex flex-wrap items-end gap-3">
            <CustomSelect label={t('common:table.sort')} value={tableSort.sort.key + ':' + tableSort.sort.direction}
              onChange={(value) => { const [key, direction] = value.split(':'); tableSort.setSort({key, direction: direction === 'desc' ? 'desc' : 'asc'}) }}
              options={(['deadline', 'openedAt', 'amount', 'caseId'] as const).flatMap((key) => (['asc', 'desc'] as const).map((direction) => ({value: key + ':' + direction, label: t(key === 'deadline' ? 'disputes.col.left' : key === 'amount' ? 'disputes.meta.fee' : key === 'caseId' ? 'disputes.col.caseId' : 'disputes.col.opened') + ' · ' + t(direction === 'asc' ? 'common:table.ascending' : 'common:table.descending')})))}
              className="min-w-40 max-sm:w-full" />
            <CustomSelect
              label={t('disputes.col.status')}
              value={status}
              onChange={setStatus}
              options={statuses
                .filter(
                  (value) =>
                    value !== 'resolved' ||
                    status === 'resolved' ||
                    data.some((d) => d.resolvedAt)
                )
                .map((value) => ({
                  value,
                  label: t(`disputes.filters.status.${value}`),
                }))}
              className="min-w-40 max-sm:w-full"
            />
            <CustomSelect
              label={t('disputes.filters.deadline')}
              value={sla}
              onChange={setSla}
              options={deadlines.map((value) => ({
                value,
                label: t(`disputes.filters.sla.${value}`),
              }))}
              className="min-w-40 max-sm:w-full"
            />
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="btn btn-secondary"
              >
                {t('disputes.filters.clear')}
              </button>
            )}
            {!isLoading && !error && (
              <p className="text-fg-muted ml-auto text-sm" role="status">
                {t('disputes.filters.results', { count: paged.total })}
              </p>
            )}
          </div>
          {isLoading ? (
            <p className="paper mt-4 p-6" role="status">
              {t('common:loading')}
            </p>
          ) : error ? (
            <div className="paper mt-4 p-6">
              <LoadError error={error} />
            </div>
          ) : rows.length === 0 ? (
            <div className="paper mt-4">
              <EmptyState
                title={
                  hasFilters ? t('disputes.filters.empty') : t('disputes.empty')
                }
                actions={
                  hasFilters ? (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="btn btn-secondary"
                    >
                      {t('disputes.filters.clear')}
                    </button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <>
              <ul
                className="mt-4 grid gap-4 md:grid-cols-2 xl:hidden"
                aria-label={t('disputes.title')}
              >
                {paged.rows.map((d) => (
                  <li
                    key={d.id}
                    className="paper min-w-0 space-y-4 p-4 [overflow-wrap:anywhere]"
                  >
                    <h2 className="text-fg-strong text-base font-semibold">
                      {d.title ?? t(`disputes.kind.${d.kind}`)}
                    </h2>
                    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-3 text-sm">
                      <dt className="text-fg-muted">
                        {t('disputes.col.caseId')}
                      </dt>
                      <dd className="num">{d.code ?? d.id}</dd>
                      {d.client && (
                        <>
                          <dt className="text-fg-muted">
                            {t('disputes.meta.client')}
                          </dt>
                          <dd>{d.client}</dd>
                        </>
                      )}
                      {d.expert && (
                        <>
                          <dt className="text-fg-muted">
                            {t('disputes.meta.expert')}
                          </dt>
                          <dd>{d.expert}</dd>
                        </>
                      )}
                      <dt className="text-fg-muted">{t('disputes.meta.fee')}</dt>
                      <dd>{formatVnd(d.fee)}</dd>
                      <dt className="text-fg-muted">{t('disputes.col.ground')}</dt>
                      <dd>{d.ground}</dd>
                      <dt className="text-fg-muted">
                        {t('disputes.col.opened')}
                      </dt>
                      <dd>{format.dateOnly(d.openedAt)}</dd>
                      <dt className="text-fg-muted">
                        {t('disputes.col.status')}
                      </dt>
                      <dd>{statusBadge(d)}</dd>
                      <dt className="text-fg-muted">
                        {t('disputes.col.left')}
                      </dt>
                      <dd>{deadline(d)}</dd>
                    </dl>
                    {viewLink(d)}
                  </li>
                ))}
              </ul>
              <section className="paper mt-4 hidden xl:block">
                <table className="w-full table-fixed text-sm [overflow-wrap:anywhere]">
                  <caption className="sr-only">{t('disputes.title')}</caption>
                  <thead>
                    <tr className="bg-sunken text-fg-muted [&>th]:px-4 [&>th]:py-3 [&>th]:text-left [&>th]:font-semibold">
                      <SortableTh column="caseId" sort={tableSort.sort} onSort={tableSort.onSort}>{t('disputes.col.caseId')}</SortableTh>
                      <th scope="col">{t('disputes.col.case')}</th>
                      <SortableTh column="amount" sort={tableSort.sort} onSort={tableSort.onSort}>{t('disputes.meta.fee')}</SortableTh>
                <th scope="col">{t('disputes.col.ground')}</th>
                      <SortableTh column="openedAt" sort={tableSort.sort} onSort={tableSort.onSort}>{t('disputes.col.opened')}</SortableTh>
                      <th scope="col">{t('disputes.col.status')}</th>
                      <SortableTh column="deadline" sort={tableSort.sort} onSort={tableSort.onSort}>{t('disputes.col.left')}</SortableTh>
                      <th scope="col">
                        <span className="sr-only">
                          {t('disputes.col.actions')}
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.rows.map((d) => (
                      <tr
                        key={d.id}
                        className="border-border-subtle border-t [&>td]:px-4 [&>td]:py-3"
                      >
                        <td className="num text-fg-strong">{d.code ?? d.id}</td>
                        <td>
                          <p className="text-fg-strong">
                            {d.title ?? t(`disputes.kind.${d.kind}`)}
                          </p>
                          {(d.client || d.expert) && (
                            <p className="text-fg-muted text-caption">
                              {[d.client, d.expert].filter(Boolean).join(' · ')}
                            </p>
                          )}
                        </td>
                        <td className="num">{formatVnd(d.fee)}</td>
                    <td>{d.ground}</td>
                        <td className="num text-fg-muted">
                          {format.dateOnly(d.openedAt)}
                        </td>
                        <td>{statusBadge(d)}</td>
                        <td>{deadline(d)}</td>
                        <td>{viewLink(d)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </>
          )}
          {!isLoading && !error && paged.total > 0 && (
            <Pagination
              page={paged.page}
              pageSize={paged.pageSize}
              total={paged.total}
              onPageChange={paged.setPage}
              onPageSizeChange={paged.setPageSize}
            />
          )}
        </>
      )}
      {toast && <Toast message={toast} onDone={clearToast} />}
    </AdminLayout>
  )
}
