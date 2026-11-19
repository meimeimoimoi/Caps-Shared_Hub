import { useExpertPresentation } from '@/features/expert-dashboard/hooks/useExpertPresentation'
import { useTranslation } from 'react-i18next'
import { useExpertDashboard } from '../../features/expert-dashboard/hooks/useExpertDashboard'
import { useExpertContext } from '@/features/expert-context'
import { toDashboardViewModel } from '../../features/expert-dashboard/utils/toDashboardViewModel'
import {
  DashboardSectionState,
  DashboardSkeleton,
} from '../../features/expert-dashboard/components/DashboardSectionState'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { Clock3, Pause, Filter, ArrowRight } from 'lucide-react'
import { isExpertDemo } from '@/lib/expert-data-source'
import { CustomSelect } from '@/components/ui/forms/custom-select'
import { Pagination } from '@/components/ui/navigation/pagination'
import { usePagination } from '@/hooks/usePagination'
import type { WorkStatus } from '../../features/expert-dashboard/types'
import { Countdown } from '@/features/review-case/components/CaseUi'

// Matches ReviewCase.ReminderHours on the server: the expert is reminded 3 hours before
const URGENT_MS = 3 * 3_600_000

export default function ExpertCasesPage() {
  const display = useExpertPresentation()

  const { t } = useTranslation('expert')
  const { t: tc } = useTranslation('reviewCase')

  const statusFilters: { value: WorkStatus | 'ALL'; label: string }[] = [
    { value: 'ALL', label: t('allStatuses') },
    { value: 'PENDING_EXPERT_RESPONSE', label: t('responseNeeded') },
    { value: 'PAYMENT_CONFIRMED', label: t('readyToStart') },
    { value: 'IN_REVIEW', label: t('inReview') },
    { value: 'AWAITING_USER_INFORMATION', label: t('waitingForInfo') },
    { value: 'AWAITING_ACCEPTANCE', label: t('awaitingAcceptance') },
    { value: 'DISPUTED', label: t('disputed') },
  ]

  const { pathname, search } = useLocation()
  const [params, setParams] = useSearchParams()
  const scope = pathname.endsWith('/queue')
    ? 'queue'
    : pathname.endsWith('/active')
      ? 'active'
      : 'all'
  const heading =
    scope === 'queue'
      ? t('workQueue')
      : scope === 'active'
        ? t('activeCasesAlternative')
        : t('cases')
  const context = useExpertContext()
  const dashboard = useExpertDashboard()
  const refresh = () => {
    void context.refetch()
    void dashboard.refetch()
  }
  const model =
    dashboard.data && context.data
      ? toDashboardViewModel(dashboard.data, context.data.version)
      : null
  const scopedItems =
    model?.queue.status === 'available'
      ? model.queue.data.items.filter(
          (item) =>
            scope === 'all' ||
            (scope === 'queue'
              ? item.status === 'PENDING_EXPERT_RESPONSE'
              : item.status !== 'PENDING_EXPERT_RESPONSE')
        )
      : []
  const filters = statusFilters.filter(
    (option) => (isExpertDemo || option.value !== 'PAYMENT_CONFIRMED') &&
      (scope !== 'active' || option.value !== 'PENDING_EXPERT_RESPONSE')
  )
  const filter = scope === 'queue'
    ? 'ALL'
    : filters.find((option) => option.value === params.get('status'))?.value ?? 'ALL'
  const visibleItems = scopedItems.filter(
    (item) => filter === 'ALL' || item.status === filter
  )
  const pagination = usePagination(visibleItems, `${scope}:${filter}`)
  const setFilter = (value: WorkStatus | 'ALL') => {
    setParams((current) => {
      if (value === 'ALL') current.delete('status')
      else current.set('status', value)
      return current
    }, { replace: true })
  }

  return (
    <>
      <div className="ep-page-heading">
        <div>
          <h1>{heading}</h1>
        </div>
      </div>
      {dashboard.isPending || context.isPending ? (
        <DashboardSkeleton />
      ) : !model ? (
        <DashboardSectionState
          title={t('casesUnavailable')}
          message={t('caseDataCouldNotBeLoaded')}
          retry={refresh}
        />
      ) : !model.consistent ? (
        <DashboardSectionState
          title={t('dataVersionsDoNotMatch')}
          message={t('refreshToLoadCasesAndExpertContextFromTheSameSnapshot')}
          retry={refresh}
        />
      ) : model.queue.status !== 'available' ? (
        <DashboardSectionState
          title={t('casesUnavailable')}
          message={model.queue.message}
          retry={refresh}
        />
      ) : (
        <>
          {(dashboard.isError || model.freshness.stale) && (
            <div className="ep-notice" role="status">
              <strong>{t('showingEarlierData')}</strong>{' '}
              {dashboard.isError
                ? t('theLatestRefreshFailed')
                : display.demoCopy(model.freshness.message ?? '')}{' '}
              <button
                className="ep-inline-button"
                onClick={refresh}
                disabled={dashboard.isFetching}
              >
                {t('retryRefresh')}
              </button>
            </div>
          )}
          <div className="ep-cases-toolbar">
            {scope !== 'queue' && (
              <div
                className="ep-filter-group"
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Filter size={15} aria-hidden="true" />
                <CustomSelect
                  value={filter}
                  onChange={(val) => setFilter(val)}
                  options={filters}
                  label={t('filterByStatus')}
                  className="flex items-center gap-2 [&>span]:hidden"
                  triggerClassName="!min-h-[34px] !py-1 !text-xs !w-[200px]"
                />
              </div>
            )}
            <span className="ep-count-label">
              {t('shownCount', { total: display.number(visibleItems.length) })}
              {model.queue.data.hasMore ? ' · ' + t('partialDataset') : ''}
            </span>
          </div>
          {visibleItems.length === 0 ? (
            <div className="ep-empty">
              <h3>
                {filter !== 'ALL'
                  ? t('noCasesMatchThisFilter')
                  : t(scope === 'queue' ? 'noPendingRequests' : 'noOpenCases')}
              </h3>
              {filter !== 'ALL' && (
                <button className="ep-inline-button" onClick={() => setFilter('ALL')}>
                  {t('clearFilter')}
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="ep-cases-table-wrapper rounded-b-none border-b-0 shadow-none">
                <table className="ep-cases-table">
                  <thead>
                    <tr>
                      <th scope="col">{t('case')}</th>
                      <th scope="col">{t('status')}</th>
                      <th scope="col">{t('deadline')}</th>
                      <th scope="col">
                        <span className="sr-only">{t('details')}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagination.rows.map((item) => {
                      const overdue =
                        item.deadline.overdue &&
                        !item.deadline.paused &&
                        item.deadline.actor === 'EXPERT'
                      return (
                        <tr key={item.id}>
                          <td className="ep-case-title whitespace-normal!">
                            <span className="block font-semibold wrap-anywhere">
                              {item.title}
                            </span>
                            <span className="mt-1 block text-[12px] font-normal wrap-anywhere text-[var(--ep-muted)]">
                              {item.serviceName}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`ep-status ${item.deadline.paused ? 'ep-status-paused' : ''}`}
                            >
                              {display.status(item.status)}
                            </span>
                          </td>
                          <td className="ep-case-deadline">
                            <div
                              className={`ep-deadline ${overdue ? 'ep-text-danger' : ''}`}
                            >
                              {item.deadline.paused ? (
                                <Pause size={13} aria-hidden="true" />
                              ) : (
                                <Clock3 size={13} aria-hidden="true" />
                              )}
                              <div>
                                <span>
                                  {overdue
                                    ? t('overdueDeadline', {
                                        kind: display.deadlineKind(
                                          item.deadline.kind
                                        ),
                                      })
                                    : display.deadlineKind(item.deadline.kind)}
                                </span>
                                <time dateTime={item.deadline.at ?? undefined}>
                                  {display.deadline(
                                    item.deadline.at,
                                    model.timezone
                                  )}
                                </time>
                                {/* Time left on the expert's own step; red in the last reminder hours */}
                                {item.deadline.at &&
                                  item.deadline.actor === 'EXPERT' &&
                                  !item.deadline.paused &&
                                  !overdue && (
                                    <span className="block font-semibold">
                                      <Countdown
                                        dueAt={item.deadline.at}
                                        urgentMs={URGENT_MS}
                                      />{' '}
                                      {tc('countdown.left')}
                                    </span>
                                  )}
                              </div>
                            </div>
                          </td>
                          <td>
                            <Link
                              to={`/expert/cases/${encodeURIComponent(item.id)}`}
                              state={{ expertCaseReturnTo: pathname + search }}
                              aria-label={t('detailsFor', {
                                title: item.title,
                              })}
                              className="inline-flex min-h-11 items-center gap-2 text-[13px] font-medium whitespace-nowrap underline-offset-4 hover:underline"
                            >
                              {t('viewDetails')}
                              <ArrowRight size={15} aria-hidden="true" />
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={pagination.page}
                pageSize={pagination.pageSize}
                total={pagination.total}
                onPageChange={pagination.setPage}
                onPageSizeChange={pagination.setPageSize}
                label={t('caseListPagination')}
              />
            </>
          )}
        </>
      )}
    </>
  )
}
