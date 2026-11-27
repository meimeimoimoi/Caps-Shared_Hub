import { useExpertPresentation } from '@/features/expert-dashboard/hooks/useExpertPresentation'
import { useTranslation } from 'react-i18next'
import {
  ExpertPanel,
  ExpertPanelHeader,
} from '../../features/expert-dashboard/components/ExpertPanel'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import {
  RefreshCw,
  ArrowUpRight,
  ArrowDown,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Star,
} from 'lucide-react'
import { useExpertContext } from '@/features/expert-context'
import { isExpertDemo } from '@/lib/expert-data-source'
import { useExpertDashboard } from '../../features/expert-dashboard/hooks/useExpertDashboard'
import { statusLabels, toDashboardViewModel } from '../../features/expert-dashboard/utils/toDashboardViewModel'
import {
  DashboardSectionState,
  DashboardSkeleton,
} from '../../features/expert-dashboard/components/DashboardSectionState'
import { ReviewTrendChart } from '../../features/expert-dashboard/components/ReviewTrendChart'
import { WorkloadDistribution } from '../../features/expert-dashboard/components/WorkloadDistribution'
import {
  OverviewQueue,
  type QueueFilter,
} from '../../features/expert-dashboard/components/OverviewQueue'
import { OverviewReadiness } from '../../features/expert-dashboard/components/OverviewReadiness'
import { OverviewActivity } from '../../features/expert-dashboard/components/OverviewActivity'
import { ApiError } from '@/lib/api-client'
import { MotionStagger, useMotion } from '@/components/ui/motion'

export default function ExpertDashboardPage() {
  const display = useExpertPresentation()

  const { t } = useTranslation('expert')

  const context = useExpertContext()
  const dashboard = useExpertDashboard()
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const returnState = { expertCaseReturnTo: location.pathname + location.search }
  const status = params.get('status')
  const hasFilter = status && (
    status === 'ALL' || status === 'EXPERT' || status === 'OVERDUE' ||
    (Object.hasOwn(statusLabels, status) && (isExpertDemo || status !== 'PAYMENT_CONFIRMED'))
  )
  const filter = hasFilter ? (status as QueueFilter) : 'EXPERT'
  const setFilter = (value: QueueFilter) => {
    setParams((current) => {
      current.set('status', value)
      return current
    }, { replace: true, preventScrollReset: true })
  }
  const refresh = () => {
    void context.refetch()
    void dashboard.refetch()
  }
  const filterQueue = (value: QueueFilter) => {
    setFilter(value)
    document.getElementById('work-heading')?.focus()
  }
  const refreshing = dashboard.isFetching || context.isFetching
  const model =
    dashboard.data && context.data
      ? toDashboardViewModel(dashboard.data, context.data.version)
      : null
  const actionable = model?.queue.status === 'available'
    ? model.queue.data.items.filter((item) => item.deadline.actor === 'EXPERT' && !item.deadline.paused)
    : []
  const attention = actionable.find((item) => item.deadline.overdue) ??
    actionable.find((item) => item.status === 'PENDING_EXPERT_RESPONSE') ??
    actionable[0]
  const hasTrend = model?.analytics?.status === 'available' && model.analytics.data.daily.length > 0
  const hasDistribution = model?.queue.status === 'available' && model.queue.data.items.length > 0
  const performance =
    model?.performance.status === 'available' ? model.performance.data : null
  const workloadAvailable = model?.consistent && model.counts.status === 'available'
  const workloadMotion = useMotion<HTMLElement>({ preset: 'reveal', disabled: !workloadAvailable, replayKey: workloadAvailable ? 'loaded' : 'loading' })
  return (
    <div className="eo-overview tabular-nums">
      <header className="eo-page-heading flex items-center justify-between gap-5 max-[720px]:flex-col max-[720px]:items-start max-[720px]:gap-4 [&_h1]:text-[30px] [&_h1]:[letter-spacing:-0.03em] max-[720px]:[&_h1]:text-[27px] [&_p]:mt-[7px] [&_p]:text-[var(--ep-muted)]">
        <div>
          <h1>{t('overview')}</h1>
        </div>
        <div className="eo-page-actions flex items-center gap-3 max-[720px]:w-full max-[720px]:justify-end max-[720px]:gap-2">
          <button
            className="eo-refresh inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg bg-[var(--ep-surface)] bg-none [padding:10px_16px] [font-family:inherit] text-[13px] font-semibold [border:1px_solid_var(--ep-border)] [&:hover:not(:disabled)]:[border-color:var(--ep-border)] [&:hover:not(:disabled)]:bg-[var(--ep-surface-raised)] [&:hover:not(:disabled)]:bg-none"
            onClick={refresh}
            disabled={refreshing}
          >
            <RefreshCw
              size={16}
              aria-hidden="true"
              className={refreshing ? 'ep-spin' : ''}
            />
            {refreshing ? t('refreshingOverview') : t('refresh')}
          </button>
          <Link
            className="eo-primary-link inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg [border-color:var(--ep-accent)] bg-[var(--ep-surface)] bg-none [padding:10px_16px] [font-family:inherit] text-[13px] font-semibold text-[white]! [background:var(--ep-accent)] [border:1px_solid_var(--ep-border)] [&:hover]:bg-[var(--ep-accent-hover)] [&:hover]:bg-none"
            to="/expert/queue"
          >
            {t('workQueue')}
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </header>
      {model && (
        <div className="eo-snapshot mt-3 mb-6 flex flex-wrap items-center gap-[8px_12px] text-[12px] text-[var(--ep-muted)]">
          <CalendarDays size={14} aria-hidden="true" />
          <time dateTime={model.generatedAt}>
            {display.deadline(model.generatedAt, model.timezone)}
          </time>
          {isExpertDemo && (
            <span className="eo-demo-label rounded bg-[var(--ep-warning-bg)] bg-none [padding:3px_8px] text-[var(--ep-warning)]">
              {t('demoData')}
            </span>
          )}
        </div>
      )}
      {dashboard.isPending || context.isPending ? (
        <DashboardSkeleton />
      ) : dashboard.error instanceof ApiError &&
        dashboard.error.status === 403 ? (
        <DashboardSectionState
          title={t('overviewAccessUnavailable')}
          message={t(
            'theServerDeniedAccessToThisOverviewRefreshToCheckYourCurrentPermissions'
          )}
          retry={refresh}
        />
      ) : !model ? (
        <DashboardSectionState
          title={t('overviewUnavailable')}
          message={
            dashboard.isError
              ? t('overviewLoadFailed')
              : t('theOverviewReturnedNoData')
          }
          retry={refresh}
        />
      ) : !model.consistent ? (
        <DashboardSectionState
          title={t('dataVersionsDoNotMatch')}
          message={t(
            'refreshToLoadYourOverviewAndExpertContextFromTheSameSnapshot'
          )}
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
                disabled={refreshing}
              >
                {t('retryRefresh')}
              </button>
            </div>
          )}
          {attention && (
            <div
              className={`eo-attention mb-4 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3.5 rounded-[10px] border border-[var(--ep-border)] px-4 py-3.5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:px-5 ${attention.deadline.overdue ? 'bg-[var(--ep-danger-bg)]' : 'bg-[var(--ep-surface)]'}`}
            >
              {attention.deadline.overdue ? (
                <AlertTriangle size={19} aria-hidden="true" className="text-danger" />
              ) : (
                <Clock3 size={19} aria-hidden="true" className="text-[var(--ep-accent-text)]" />
              )}
              <div className="min-w-0">
                <strong className="text-[13px]">
                  {t(attention.deadline.overdue
                    ? 'anOverdueCaseNeedsYourAttention'
                    : 'nextCaseToHandle')}
                </strong>
                <p className="mt-1! break-words text-xs text-fg-muted">
                  {attention.title}
                  {attention.deadline.at && (
                    <> · <time dateTime={attention.deadline.at}>
                      {display.deadline(attention.deadline.at, model.timezone)}
                    </time></>
                  )}
                </p>
              </div>
              <Link
                className="col-start-2 inline-flex min-h-11 w-fit items-center gap-2 text-xs font-semibold underline underline-offset-4 sm:col-start-3"
                to={`/expert/cases/${encodeURIComponent(attention.id)}`}
                state={returnState}
              >
                {t('viewCase')}
                <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
            </div>
          )}
          {model.counts.status !== 'available' ? (
            <DashboardSectionState
              title={t('workloadTotalsUnavailable')}
              message={model.counts.message}
              retry={refresh}
            />
          ) : (
            <section
              ref={workloadMotion}
              className="eo-workload-strip [margin:24px_0_16px] overflow-hidden rounded-xl border border-[var(--ep-border)] bg-[var(--ep-surface)] bg-none [&_>_p]:bg-[var(--ep-surface-raised)] [&_>_p]:bg-none [&_>_p]:[padding:10px_24px] [&_>_p]:text-[11px] [&_>_p]:text-[var(--ep-muted)] [&_>_p]:[border-top:1px_solid_var(--ep-border)] max-[720px]:[&_>_p]:[padding:12px_18px]"
              aria-label={t('totalsAcrossAllActiveCases')}
            >
              <div className="eo-workload-caption flex justify-between gap-3 [padding:16px_24px_0] max-[720px]:flex-col max-[720px]:gap-[5px] max-[720px]:[padding:16px_18px_0] [&_>_span]:text-[12px] [&_>_span]:text-[var(--ep-muted)] [&_strong]:text-[13px]">
                <strong>{t('acrossYourWorkload')}</strong>
                <span>
                  {isExpertDemo ? t('sampleTotals') : t('allActiveCases')}
                </span>
              </div>
              <div className="eo-workload-numbers grid grid-cols-[repeat(4,_minmax(0,_1fr))] [padding:20px_8px] max-[720px]:grid-cols-[1fr_1fr] max-[720px]:gap-y-6 [&_.eo-danger-stat_>_strong]:text-[var(--ep-danger)] [&_>_button]:flex [&_>_button]:flex-col [&_>_button]:items-start [&_>_button]:gap-2 [&_>_button]:border-0 [&_>_button]:[padding:0_24px] [&_>_button]:text-left [&_>_button]:text-[var(--ep-ink)] [&_>_button:disabled]:cursor-default [&_>_button]:[background:none] [&_>_button]:[border-right:1px_solid_var(--ep-border)] max-[1251px]:[&_>_button]:[padding:0_18px] [&_>_button_>_span]:text-[13px] [&_>_button_>_span]:text-[var(--ep-muted)] [&_>_button_>_strong]:text-[32px] [&_>_button_>_strong]:[line-height:1.1] [&_>_button_>_strong]:font-[650] [&_>_button_>_strong]:[letter-spacing:-0.02em] max-[720px]:[&_>_button_>_strong]:text-[28px] [&_>_button:hover_small]:text-[var(--ep-accent-text)] [&_>_button:hover_small]:underline [&_>_button:hover_small]:underline-offset-[3px] [&_>_button:last-child]:[border-right:0] max-[720px]:[&_>_button:nth-child(2)]:[border-right:0] [&_>_button[aria-pressed=true]_small]:text-[var(--ep-accent-text)] [&_>_button[aria-pressed=true]_small]:underline [&_>_button[aria-pressed=true]_small]:underline-offset-[3px] [&_small]:inline-flex [&_small]:items-center [&_small]:gap-[5px] [&_small]:text-[11px] [&_small]:text-[var(--ep-muted)]">
                {(
                  [
                    {
                      label: t('awaitingResponse'),
                      value: model.counts.data.pendingResponse,
                      filter: 'PENDING_EXPERT_RESPONSE',
                    },
                    {
                      label: t('readyToStart'),
                      value: model.counts.data.readyToStart,
                      filter: 'PAYMENT_CONFIRMED',
                    },
                    {
                      label: t('inReview'),
                      value: model.counts.data.inReview,
                      filter: 'IN_REVIEW',
                    },
                    {
                      label: t('overdue'),
                      value: model.counts.data.overdue,
                      filter: 'OVERDUE',
                    },
                  ] as const
                ).map((stat) => (
                  <button
                    key={stat.filter}
                    aria-pressed={filter === stat.filter}
                    disabled={stat.value === null}
                    aria-label={
                      stat.value === null
                        ? undefined
                        : t('viewCasesByStatus', {
                            status: stat.label,
                            total: display.number(stat.value),
                          })
                    }
                    onClick={() =>
                      filterQueue(filter === stat.filter ? 'ALL' : stat.filter)
                    }
                    className={
                      stat.filter === 'OVERDUE' && (stat.value ?? 0) > 0
                        ? 'eo-danger-stat'
                        : ''
                    }
                  >
                    <span>{stat.label}</span>
                    {stat.value === null ? (
                      <small>{t('overviewMetricUnavailable')}</small>
                    ) : (
                      <>
                        <strong>{display.number(stat.value)}</strong>
                        <small>
                          {t('viewCasesInQueue')}
                          <ArrowDown size={12} aria-hidden="true" />
                        </small>
                      </>
                    )}
                  </button>
                ))}
              </div>
              <p>{display.demoCopy(model.counts.data.definition)}</p>
            </section>
          )}
          <MotionStagger className="eo-work-grid mt-6 grid grid-cols-[minmax(0,_2.15fr)_minmax(300px,_1fr)] items-start gap-6 max-[1251px]:grid-cols-[minmax(0,_1fr)_300px] max-[1251px]:gap-5 max-[1101px]:grid-cols-[minmax(0,_1fr)]">
            <OverviewQueue
              queue={model.queue}
              timezone={model.timezone}
              filter={filter}
              setFilter={setFilter}
              retry={refresh}
            />
            <OverviewReadiness services={context.data?.services ?? []} />
          </MotionStagger>
          {(hasTrend || hasDistribution) && (
            <MotionStagger className="eo-analytics-grid mt-6 grid items-stretch gap-6 lg:grid-cols-[repeat(auto-fit,minmax(300px,1fr))] max-[1251px]:gap-5">
              {hasTrend && (
                <ReviewTrendChart
                  analytics={model.analytics}
                  timezone={model.timezone}
                />
              )}
              {hasDistribution && (
                <WorkloadDistribution
                  queue={model.queue}
                  filter={filter}
                  setFilter={filterQueue}
                />
              )}
            </MotionStagger>
          )}
          <MotionStagger className="eo-bottom-grid mt-6 grid grid-cols-[minmax(0,_2.15fr)_minmax(300px,_1fr)] items-start gap-6 max-[1251px]:grid-cols-[minmax(0,_1fr)_300px] max-[1251px]:gap-5 max-[1101px]:grid-cols-[minmax(0,_1fr)]">
            <OverviewActivity
              activity={model.activity}
              timezone={model.timezone}
            />
            <ExpertPanel
              className="eo-quality"
              aria-labelledby="quality-heading"
            >
              <ExpertPanelHeader>
                <div>
                  <h2 id="quality-heading">{t('deliveryQuality')}</h2>
                  <p>
                    {t('currentPerformanceSnapshot')}
                    {isExpertDemo ? ' · ' + t('sampleMetrics') : ''}.
                  </p>
                </div>
                <CheckCircle2 size={20} aria-hidden="true" />
              </ExpertPanelHeader>
              {!performance ? (
                <DashboardSectionState
                  title={t('performanceUnavailable')}
                  message={
                    model.performance.status !== 'available'
                      ? model.performance.message
                      : t('performanceMetricsWereNotSupplied')
                  }
                  retry={refresh}
                />
              ) : (
                <>
                  <dl className="eo-quality-rows m-0 [padding:0_24px] [&_>_div]:flex [&_>_div]:items-center [&_>_div]:justify-between [&_>_div]:gap-4 [&_>_div]:[padding:15px_0] [&_>_div]:[border-top:1px_solid_var(--ep-border)] [&_dd]:m-0 [&_dd]:text-[18px] [&_dd]:font-semibold [&_dd_small]:ml-[5px] [&_dd_small]:text-[11px] [&_dd_small]:font-normal [&_dd_small]:text-[var(--ep-muted)] [&_dt]:flex [&_dt]:items-center [&_dt]:gap-[9px] [&_dt]:text-[12px] [&_dt]:text-[var(--ep-muted)]">
                    <div>
                      <dt>
                        <CheckCircle2 size={16} aria-hidden="true" />
                        {t('ontimeDelivery')}
                      </dt>
                      <dd>
                        {display.number(performance.onTimeDeliveryRate / 100, {
                          style: 'percent',
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        })}
                      </dd>
                    </div>
                    <div>
                      <dt>
                        <Clock3 size={16} aria-hidden="true" />
                        {t('averageResponse')}
                      </dt>
                      <dd>
                        {t('hoursValue', {
                          value: display.number(performance.avgResponseHours, {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 1,
                          }),
                        })}
                      </dd>
                    </div>
                    <div>
                      <dt>
                        <Clock3 size={16} aria-hidden="true" />
                        {t('averageReview')}
                      </dt>
                      <dd>
                        {t('daysValue', {
                          value: display.number(performance.avgReviewDays, {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 1,
                          }),
                        })}
                      </dd>
                    </div>
                    <div>
                      <dt>
                        <Star size={16} aria-hidden="true" />
                        {t('clientSatisfaction')}
                      </dt>
                      <dd>
                        {performance.satisfactionScore === null ? (
                          t('notAvailable')
                        ) : (
                          <>
                            {display.number(performance.satisfactionScore, {
                              minimumFractionDigits: 1,
                              maximumFractionDigits: 1,
                            })}
                            <small>/ 5</small>
                          </>
                        )}
                      </dd>
                    </div>
                  </dl>
                  <div className="eo-month-summary flex flex-col gap-[5px] bg-[var(--ep-success-bg)] bg-none [padding:16px_24px] text-[12px] text-[var(--ep-success)] [border-top:1px_solid_var(--ep-border)] [&_span]:text-[11px] [&_span]:text-[var(--ep-success)]">
                    <strong>
                      {t('completedThisMonth', {
                        total: display.number(performance.completedThisMonth),
                      })}
                    </strong>
                    <span>
                      {t('completedLastMonth', {
                        total: display.number(performance.completedLastMonth),
                      })}
                    </span>
                  </div>
                </>
              )}
            </ExpertPanel>
          </MotionStagger>
        </>
      )}
    </div>
  )
}
