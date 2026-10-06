import { useExpertPresentation } from '@/features/expert-dashboard/hooks/useExpertPresentation'
import { useTranslation } from 'react-i18next'
import { ExpertPanel, ExpertPanelHeader } from './ExpertPanel'
import { useState } from 'react'
import { TrendingUp } from 'lucide-react'
import type { DashboardDto } from '../types'
import { DashboardSectionState } from './DashboardSectionState'
import { projectReviewTrend } from '../utils/reviewAnalytics'

export function ReviewTrendChart({
  analytics,
  timezone,
}: {
  analytics: DashboardDto['analytics']
  timezone: string
}) {
  const { t } = useTranslation('expert')
  const display = useExpertPresentation()

  const [period, setPeriod] = useState<7 | 28>(28)
  const [selected, setSelected] = useState(27)
  const [receivedVisible, setReceivedVisible] = useState(true)
  const [completedVisible, setCompletedVisible] = useState(true)
  const {
    points,
    dayOffsets,
    chartTimezone,
    duplicateCount,
    missingDays,
    excludedCount,
    totalReceived,
    totalCompleted,
    ceiling,
  } = projectReviewTrend(
    analytics?.status === 'available' ? analytics.data.daily : [],
    period,
    timezone
  )
  const index = Math.min(selected, Math.max(0, points.length - 1))
  const active = points[index]
  const formatDate = (date: string) =>
    display.timestamp(date, chartTimezone, { day: 'numeric', month: 'short' })
  const x = (position: number) =>
    42 + dayOffsets[position] * (710 / (period - 1))
  const y = (value: number) => 206 - (value * 166) / ceiling
  const path = (key: 'received' | 'completed') =>
    points
      .map(
        (point, position) =>
          `${position === 0 ? 'M' : 'L'}${x(position)},${y(point[key])}`
      )
      .join(' ')
  return (
    <ExpertPanel className="eo-trend" aria-labelledby="trend-heading">
      <ExpertPanelHeader>
        <div>
          <h2 id="trend-heading">{t('reviewActivity')}</h2>
          <p>{t('incomingRequestsAndCompletedReviewsOverTime')}</p>
        </div>
        <div
          className="eo-segmented inline-flex gap-[3px] rounded-[7px] border border-[var(--ep-border)] bg-[var(--ep-surface-raised)] bg-none [padding:3px] [&_button]:min-h-8 [&_button]:rounded-[5px] [&_button]:border-0 [&_button]:[padding:6px_10px] [&_button]:[font-family:inherit] [&_button]:text-[12px] [&_button]:whitespace-nowrap [&_button]:text-[var(--ep-muted)] [&_button]:[background:transparent] [&_button:hover]:text-[var(--ep-accent-text)] [&_button[aria-pressed=true]]:bg-[var(--ep-surface)] [&_button[aria-pressed=true]]:bg-none [&_button[aria-pressed=true]]:font-semibold [&_button[aria-pressed=true]]:text-[var(--ep-ink)] [&_button[aria-pressed=true]]:[box-shadow:0_1px_3px_#17283b15]"
          aria-label={t('chartPeriod')}
        >
          {([7, 28] as const).map((days) => (
            <button
              key={days}
              aria-pressed={period === days}
              onClick={() => {
                setPeriod(days)
                setSelected(days - 1)
              }}
            >
              {days === 7 ? t('7Days') : t('4Weeks')}
            </button>
          ))}
        </div>
      </ExpertPanelHeader>
      {!analytics || analytics.status !== 'available' ? (
        <DashboardSectionState
          title={t('trendUnavailable')}
          message={
            analytics
              ? analytics.message
              : t(
                  'dailyReviewHistoryHasNotBeenSuppliedCurrentWorkloadIsStillAvailableBelow'
                )
          }
        />
      ) : points.length === 0 ? (
        <div className="eo-empty [padding:40px_24px] text-center text-[var(--ep-muted)] [&_h3]:mt-[10px] [&_p]:mt-[7px] [&_p]:text-[12px]">
          <TrendingUp size={25} aria-hidden="true" />
          <h3>{t('noReviewHistoryYet')}</h3>
          <p>{t('trendsWillAppearWhenDailyActivityIsAvailable')}</p>
        </div>
      ) : (
        <>
          {chartTimezone !== timezone && (
            <p className="eo-series-hint [padding:0_24px_8px] text-[12px]">
              {t('theSuppliedTimezoneIsUnavailableChartDatesAreShownInUtc')}
            </p>
          )}
          {duplicateCount > 0 && (
            <p className="eo-series-hint [padding:0_24px_8px] text-[12px]">
              {t('duplicateDailyRecordsUseTheLatestSnapshotForEachDay')}
            </p>
          )}
          {missingDays > 0 && (
            <p className="eo-series-hint [padding:0_24px_8px] text-[12px]">
              {t(
                'someDaysAreUnreportedLinesConnectAvailableObservationsMissingDaysAreNotCountedAsZero'
              )}
            </p>
          )}
          {excludedCount > 0 && (
            <p className="eo-series-hint [padding:0_24px_8px] text-[12px]">
              {t('chartExcluded', { total: display.number(excludedCount) })}
            </p>
          )}
          <div className="eo-chart-summary flex flex-wrap items-center gap-6 [padding:0_24px] max-[720px]:gap-[12px_20px] max-[720px]:[padding:0_18px] [&_>_div]:flex [&_>_div]:items-center [&_>_div]:gap-2 [&_>_p]:ml-auto [&_>_p]:text-[11px] [&_>_p]:text-[var(--ep-muted)] max-[1251px]:[&_>_p]:ml-[0] max-[1251px]:[&_>_p]:w-full [&_span]:text-[12px] [&_span]:text-[var(--ep-muted)] [&_strong]:text-[22px] [&_strong]:font-[650]">
            <div>
              <span className="eo-dot eo-dot-orange inline-block h-2 w-2 shrink-0 rounded-full [background:var(--ui-chart-response)]" />
              <strong>{display.number(totalReceived)}</strong>
              <span>{t('received')}</span>
            </div>
            <div>
              <span className="eo-dot eo-dot-green inline-block h-2 w-2 shrink-0 rounded-full [background:var(--ep-success)]" />
              <strong>{display.number(totalCompleted)}</strong>
              <span>{t('completed')}</span>
            </div>
            <p>{display.demoCopy(analytics.data.sourceLabel)}</p>
          </div>
          <div
            className="eo-chart-inspection flex min-h-[35px] gap-4 [padding:14px_24px_0] text-[11px] text-[var(--ep-muted)] max-[720px]:gap-[10px] max-[720px]:[padding:14px_18px_0] [&_strong]:text-[var(--ep-ink)]"
            aria-live="polite"
          >
            {active && (
              <>
                <strong>{formatDate(active.date)}</strong>
                <span>
                  {t('chartReceivedCount', {
                    total: display.number(active.received),
                  })}
                </span>
                <span>
                  {t('chartCompletedCount', {
                    total: display.number(active.completed),
                  })}
                </span>
              </>
            )}
          </div>
          <svg
            className="eo-line-chart [margin:0_12px] block h-auto w-[calc(100%_-_24px)] max-[720px]:min-h-45 min-[1700px]:max-h-[330px] [&_text]:[fill:var(--ep-muted)] [&_text]:[font-family:inherit] [&_text]:text-[12px]"
            viewBox="0 0 800 250"
            role="img"
            aria-labelledby="trend-title trend-desc"
          >
            <title id="trend-title">
              {t('dailyReceivedRequestsAndCompletedReviews')}
            </title>
            <desc id="trend-desc">
              {t('chartDescription', {
                days: display.number(points.length),
                period: display.number(period),
                received: display.number(totalReceived),
                completed: display.number(totalCompleted),
              })}
            </desc>
            {[0, 1, 2, 3, 4].map((tick) => (
              <g key={tick}>
                <line
                  x1="42"
                  x2="752"
                  y1={y((tick * ceiling) / 4)}
                  y2={y((tick * ceiling) / 4)}
                  className="eo-chart-grid [stroke:var(--ep-border)] [stroke-width:1]"
                />
                <text x="26" y={y((tick * ceiling) / 4) + 4} textAnchor="end">
                  {display.number((tick * ceiling) / 4)}
                </text>
              </g>
            ))}
            {completedVisible && (
              <path
                d={`${path('completed')} L${x(points.length - 1)},206 L${x(0)},206 Z`}
                fill="var(--ep-success-bg)"
              />
            )}
            {receivedVisible && (
              <path
                d={path('received')}
                className="eo-line-received [fill:none] [stroke:var(--ui-chart-response)] [stroke-width:2.5] [stroke-linecap:round] [stroke-linejoin:round] [vector-effect:non-scaling-stroke]"
              />
            )}
            {completedVisible && (
              <path
                d={path('completed')}
                className="eo-line-completed [fill:none] [stroke:var(--ep-success)] [stroke-width:2.5] [stroke-linecap:round] [stroke-linejoin:round] [vector-effect:non-scaling-stroke]"
              />
            )}
            <line
              x1={x(index)}
              x2={x(index)}
              y1="30"
              y2="206"
              className="eo-chart-guide [stroke:var(--ep-muted)] [stroke-width:1] [stroke-dasharray:4_4]"
            />
            {active && receivedVisible && (
              <circle
                cx={x(index)}
                cy={y(active.received)}
                r="5"
                fill="var(--ui-chart-response)"
                stroke="var(--ep-surface)"
                strokeWidth="3"
              />
            )}
            {active && completedVisible && (
              <circle
                cx={x(index)}
                cy={y(active.completed)}
                r="5"
                fill="var(--ep-success)"
                stroke="var(--ep-surface)"
                strokeWidth="3"
              />
            )}
            {points.map((point, position) => (
              <rect
                key={point.date}
                x={position === 0 ? 42 : (x(position - 1) + x(position)) / 2}
                y="28"
                width={
                  (position === points.length - 1
                    ? 752
                    : (x(position) + x(position + 1)) / 2) -
                  (position === 0 ? 42 : (x(position - 1) + x(position)) / 2)
                }
                height="182"
                fill="transparent"
                onMouseEnter={() => setSelected(position)}
              >
                <title>
                  {t('chartDay', {
                    date: formatDate(point.date),
                    received: display.number(point.received),
                    completed: display.number(point.completed),
                  })}
                </title>
              </rect>
            ))}
            {[
              0,
              Math.floor((points.length - 1) / 3),
              Math.floor(((points.length - 1) * 2) / 3),
              points.length - 1,
            ]
              .filter((position, place, all) => all.indexOf(position) === place)
              .map((position) => (
                <text
                  key={position}
                  x={x(position)}
                  y="236"
                  textAnchor={
                    position === 0
                      ? 'start'
                      : position === points.length - 1
                        ? 'end'
                        : 'middle'
                  }
                >
                  {formatDate(points[position].date)}
                </text>
              ))}
          </svg>
          {!receivedVisible && !completedVisible && (
            <p className="eo-series-hint [padding:0_24px_8px] text-[12px]">
              {t('selectASeriesBelowToDisplayTheChart')}
            </p>
          )}
          <div className="eo-chart-controls flex flex-wrap items-center justify-between gap-4 [padding:4px_24px_14px] max-[720px]:[padding:8px_18px_14px]">
            <div className="eo-chart-legend flex gap-[14px] [&_button]:flex [&_button]:items-center [&_button]:gap-[6px] [&_button]:border-0 [&_button]:[padding:8px_0] [&_button]:[font-family:inherit] [&_button]:text-[12px] [&_button]:text-[var(--ep-muted)] [&_button]:[background:none] [&_button[aria-pressed=false]]:line-through">
              <button
                aria-pressed={receivedVisible}
                onClick={() => setReceivedVisible(!receivedVisible)}
              >
                <span className="eo-dot eo-dot-orange inline-block h-2 w-2 shrink-0 rounded-full [background:var(--ui-chart-response)]" />
                {t('received')}
              </button>
              <button
                aria-pressed={completedVisible}
                onClick={() => setCompletedVisible(!completedVisible)}
              >
                <span className="eo-dot eo-dot-green inline-block h-2 w-2 shrink-0 rounded-full [background:var(--ep-success)]" />
                {t('completed')}
              </button>
            </div>
            <label className="eo-day-selector flex items-center gap-2 text-[11px] text-[var(--ep-muted)] [&_input]:w-[90px] [&_input]:cursor-pointer [&_input]:[accent-color:var(--ep-accent)]">
              {t('inspectDay')}
              <input
                type="range"
                min="0"
                max={points.length - 1}
                value={index}
                onChange={(event) => setSelected(Number(event.target.value))}
                aria-valuetext={
                  active
                    ? t('chartDay', {
                        date: formatDate(active.date),
                        received: display.number(active.received),
                        completed: display.number(active.completed),
                      })
                    : undefined
                }
              />
            </label>
          </div>
          <details className="eo-data-table text-[12px] [border-top:1px_solid_var(--ep-border)] [&_>_div]:max-h-60 [&_>_div]:overflow-auto [&_>_div]:[padding:0_24px_16px] [&_>_summary]:[padding:12px_24px] [&_>_summary]:text-[var(--ep-muted)] [&_caption]:pb-2 [&_caption]:text-left [&_caption]:text-[var(--ep-muted)] [&_table]:w-full [&_table]:border-collapse [&_table]:text-left [&_table]:text-[12px] [&_td]:p-2 [&_td]:[border-bottom:1px_solid_var(--ep-border)] [&_th]:p-2 [&_th]:[border-bottom:1px_solid_var(--ep-border)]">
            <summary>{t('viewChartData')}</summary>
            <div>
              <table>
                <caption>
                  {t('chartCaption', { timezone: chartTimezone })}
                </caption>
                <thead>
                  <tr>
                    <th>{t('date')}</th>
                    <th>{t('received')}</th>
                    <th>{t('completed')}</th>
                  </tr>
                </thead>
                <tbody>
                  {points.map((point) => (
                    <tr key={point.date}>
                      <th scope="row">{formatDate(point.date)}</th>
                      <td>{display.number(point.received)}</td>
                      <td>{display.number(point.completed)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </ExpertPanel>
  )
}
