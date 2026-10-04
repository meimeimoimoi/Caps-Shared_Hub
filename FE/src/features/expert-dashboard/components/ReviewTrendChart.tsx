import { ExpertPanel, ExpertPanelHeader } from './ExpertPanel'
import { useState } from 'react'
import { TrendingUp } from 'lucide-react'
import type { DashboardDto } from '../model/types'
import { DashboardSectionState } from './DashboardSectionState'
import { projectReviewTrend } from '../model/reviewAnalytics'

export function ReviewTrendChart({
  analytics,
  timezone,
}: {
  analytics: DashboardDto['analytics']
  timezone: string
}) {
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
    new Intl.DateTimeFormat('en-GB', {
      timeZone: chartTimezone,
      day: 'numeric',
      month: 'short',
    }).format(new Date(date))
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
          <h2 id="trend-heading">Review activity</h2>
          <p>Incoming requests and completed reviews over time.</p>
        </div>
        <div
          className="eo-segmented border-hub-border [&_button]:text-hub-muted [&_button[aria-pressed=true]]:text-hub-ink [&_button:hover]:text-hub-action inline-flex gap-[3px] rounded-[7px] border bg-[#f6f7f6] bg-none [padding:3px] [&_button]:min-h-8 [&_button]:rounded-[5px] [&_button]:border-0 [&_button]:[padding:6px_10px] [&_button]:[font-family:inherit] [&_button]:text-[12px] [&_button]:whitespace-nowrap [&_button]:[background:transparent] [&_button[aria-pressed=true]]:bg-white [&_button[aria-pressed=true]]:bg-none [&_button[aria-pressed=true]]:font-semibold [&_button[aria-pressed=true]]:[box-shadow:0_1px_3px_#17283b15]"
          aria-label="Chart period"
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
              {days === 7 ? '7 days' : '4 weeks'}
            </button>
          ))}
        </div>
      </ExpertPanelHeader>
      {!analytics || analytics.status !== 'available' ? (
        <DashboardSectionState
          title="Trend unavailable"
          message={
            analytics
              ? analytics.message
              : 'Daily review history has not been supplied. Current workload is still available below.'
          }
        />
      ) : points.length === 0 ? (
        <div className="eo-empty text-hub-muted [padding:40px_24px] text-center [&_h3]:mt-[10px] [&_p]:mt-[7px] [&_p]:text-[12px]">
          <TrendingUp size={25} aria-hidden="true" />
          <h3>No review history yet</h3>
          <p>Trends will appear when daily activity is available.</p>
        </div>
      ) : (
        <>
          {chartTimezone !== timezone && (
            <p className="eo-series-hint [padding:0_24px_8px] text-[12px]">
              The supplied timezone is unavailable. Chart dates are shown in
              UTC.
            </p>
          )}
          {duplicateCount > 0 && (
            <p className="eo-series-hint [padding:0_24px_8px] text-[12px]">
              Duplicate daily records use the latest snapshot for each day.
            </p>
          )}
          {missingDays > 0 && (
            <p className="eo-series-hint [padding:0_24px_8px] text-[12px]">
              Some days are unreported. Lines connect available observations;
              missing days are not counted as zero.
            </p>
          )}
          {excludedCount > 0 && (
            <p className="eo-series-hint [padding:0_24px_8px] text-[12px]">
              {excludedCount} invalid history points were excluded from this
              chart.
            </p>
          )}
          <div className="eo-chart-summary [&_span]:text-hub-muted [&_>_p]:text-hub-muted flex flex-wrap items-center gap-6 [padding:0_24px] max-[720px]:gap-[12px_20px] max-[720px]:[padding:0_18px] [&_>_div]:flex [&_>_div]:items-center [&_>_div]:gap-2 [&_>_p]:ml-auto [&_>_p]:text-[11px] max-[1251px]:[&_>_p]:ml-[0] max-[1251px]:[&_>_p]:w-full [&_span]:text-[12px] [&_strong]:text-[22px] [&_strong]:font-[650]">
            <div>
              <span className="eo-dot eo-dot-orange inline-block h-2 w-2 shrink-0 rounded-full [background:var(--color-hub-action)]" />
              <strong>{totalReceived}</strong>
              <span>received</span>
            </div>
            <div>
              <span className="eo-dot eo-dot-green inline-block h-2 w-2 shrink-0 rounded-full [background:var(--color-hub-success)]" />
              <strong>{totalCompleted}</strong>
              <span>completed</span>
            </div>
            <p>{analytics.data.sourceLabel}</p>
          </div>
          <div
            className="eo-chart-inspection text-hub-muted flex min-h-[35px] gap-4 [padding:14px_24px_0] text-[11px] max-[720px]:gap-[10px] max-[720px]:[padding:14px_18px_0] [&_strong]:text-[#334155]"
            aria-live="polite"
          >
            {active && (
              <>
                <strong>{formatDate(active.date)}</strong>
                <span>{active.received} received</span>
                <span>{active.completed} completed</span>
              </>
            )}
          </div>
          <svg
            className="eo-line-chart [margin:0_12px] block h-auto w-[calc(100%_-_24px)] max-[720px]:min-h-45 min-[1700px]:max-h-[330px] [&_text]:[fill:#526174] [&_text]:[font-family:inherit] [&_text]:text-[12px]"
            viewBox="0 0 800 250"
            role="img"
            aria-labelledby="trend-title trend-desc"
          >
            <title id="trend-title">
              Daily received requests and completed reviews
            </title>
            <desc id="trend-desc">
              {points.length} reported days in the {period}-day window.{' '}
              {totalReceived} requests received, {totalCompleted} reviews
              completed. Use the day selector or expand the data table for exact
              values.
            </desc>
            {[0, 1, 2, 3, 4].map((tick) => (
              <g key={tick}>
                <line
                  x1="42"
                  x2="752"
                  y1={y((tick * ceiling) / 4)}
                  y2={y((tick * ceiling) / 4)}
                  className="eo-chart-grid [stroke:#e9edef] [stroke-width:1]"
                />
                <text x="26" y={y((tick * ceiling) / 4) + 4} textAnchor="end">
                  {(tick * ceiling) / 4}
                </text>
              </g>
            ))}
            {completedVisible && (
              <path
                d={`${path('completed')} L${x(points.length - 1)},206 L${x(0)},206 Z`}
                fill="#edf6f2"
              />
            )}
            {receivedVisible && (
              <path
                d={path('received')}
                className="eo-line-received [fill:none] [stroke:var(--color-hub-action)] [stroke-width:2.5] [stroke-linecap:round] [stroke-linejoin:round] [vector-effect:non-scaling-stroke]"
              />
            )}
            {completedVisible && (
              <path
                d={path('completed')}
                className="eo-line-completed [fill:none] [stroke:var(--color-hub-success)] [stroke-width:2.5] [stroke-linecap:round] [stroke-linejoin:round] [vector-effect:non-scaling-stroke]"
              />
            )}
            <line
              x1={x(index)}
              x2={x(index)}
              y1="30"
              y2="206"
              className="eo-chart-guide [stroke:#a8b3c0] [stroke-width:1] [stroke-dasharray:4_4]"
            />
            {active && receivedVisible && (
              <circle
                cx={x(index)}
                cy={y(active.received)}
                r="5"
                fill="#c2410c"
                stroke="white"
                strokeWidth="3"
              />
            )}
            {active && completedVisible && (
              <circle
                cx={x(index)}
                cy={y(active.completed)}
                r="5"
                fill="#27775b"
                stroke="white"
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
                  {formatDate(point.date)}: {point.received} received,{' '}
                  {point.completed} completed
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
              Select a series below to display the chart.
            </p>
          )}
          <div className="eo-chart-controls flex flex-wrap items-center justify-between gap-4 [padding:4px_24px_14px] max-[720px]:[padding:8px_18px_14px]">
            <div className="eo-chart-legend [&_button]:text-hub-muted flex gap-[14px] [&_button]:flex [&_button]:items-center [&_button]:gap-[6px] [&_button]:border-0 [&_button]:[padding:8px_0] [&_button]:[font-family:inherit] [&_button]:text-[12px] [&_button]:[background:none] [&_button[aria-pressed=false]]:line-through">
              <button
                aria-pressed={receivedVisible}
                onClick={() => setReceivedVisible(!receivedVisible)}
              >
                <span className="eo-dot eo-dot-orange inline-block h-2 w-2 shrink-0 rounded-full [background:var(--color-hub-action)]" />
                Received
              </button>
              <button
                aria-pressed={completedVisible}
                onClick={() => setCompletedVisible(!completedVisible)}
              >
                <span className="eo-dot eo-dot-green inline-block h-2 w-2 shrink-0 rounded-full [background:var(--color-hub-success)]" />
                Completed
              </button>
            </div>
            <label className="eo-day-selector text-hub-muted flex items-center gap-2 text-[11px] [&_input]:w-[90px] [&_input]:cursor-pointer [&_input]:[accent-color:var(--color-hub-action)]">
              Inspect day
              <input
                type="range"
                min="0"
                max={points.length - 1}
                value={index}
                onChange={(event) => setSelected(Number(event.target.value))}
                aria-valuetext={
                  active
                    ? `${formatDate(active.date)}: ${active.received} received, ${active.completed} completed`
                    : undefined
                }
              />
            </label>
          </div>
          <details className="eo-data-table [&_>_summary]:text-hub-muted [&_caption]:text-hub-muted text-[12px] [border-top:1px_solid_var(--color-hub-border)] [&_>_div]:max-h-60 [&_>_div]:overflow-auto [&_>_div]:[padding:0_24px_16px] [&_>_summary]:[padding:12px_24px] [&_caption]:pb-2 [&_caption]:text-left [&_table]:w-full [&_table]:border-collapse [&_table]:text-left [&_table]:text-[12px] [&_td]:p-2 [&_td]:[border-bottom:1px_solid_var(--color-hub-border)] [&_th]:p-2 [&_th]:[border-bottom:1px_solid_var(--color-hub-border)]">
            <summary>View chart data</summary>
            <div>
              <table>
                <caption>Daily review activity · {chartTimezone}</caption>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Received</th>
                    <th>Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {points.map((point) => (
                    <tr key={point.date}>
                      <th scope="row">{formatDate(point.date)}</th>
                      <td>{point.received}</td>
                      <td>{point.completed}</td>
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
