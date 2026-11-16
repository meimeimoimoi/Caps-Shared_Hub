import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { HelpTip } from '@/components/ui/feedback/help-tip'
import { useFormatters } from '@/hooks/useFormatters'
import { useAdminStats } from '../hooks/useAdminStats'
import type { Granularity, StatPeriod } from '../types'
import { DeltaTile } from './DeltaTile'
import { StackedColumnChart } from './StackedColumnChart'

/* Growth: the period filter on top drives every comparison tile and chart below.
 * moneyUnavailable: payouts and refunds have no backend yet, so money tiles and the cash-flow
 * chart say "not connected" instead of plotting zeros */
export function GrowthSection({
  moneyUnavailable = false,
}: {
  moneyUnavailable?: boolean
}) {
  const { t } = useTranslation('admin')
  const f = useFormatters()
  const [granularity, setGranularity] = useState<Granularity>('month')
  const stats = useAdminStats(granularity)

  const periods = stats.data ?? []
  const baseLabel = (p: StatPeriod) =>
    p.quarter
      ? t('dashboard.growth.quarterLabel', {
          quarter: p.quarter,
          year: p.start.slice(2, 4),
        })
      : f.dateOnly(p.start, { month: 'numeric', year: 'numeric' })
  // Narrow X axis (12 columns): a month shows only "T11"; the year stays in the tooltip and table
  const tick = (p: StatPeriod) =>
    p.quarter
      ? baseLabel(p)
      : t('dashboard.growth.monthTick', {
          month: f.dateOnly(p.start, { month: 'numeric' }),
          name: f.dateOnly(p.start, { month: 'short' }),
        })
  // The running period stays on the chart but is labelled, so it is not read as a drop
  const periodLabel = (p: StatPeriod) =>
    p.partial
      ? t('dashboard.growth.partial', { period: baseLabel(p) })
      : baseLabel(p)
  // Tiles compare the two latest closed periods: a running period against a full one would always read as a false drop
  const closed = periods.filter((p) => !p.partial)
  const cur = closed.at(-1)
  const prev = closed.at(-2)
  const gmv = (p: StatPeriod) => p.expertPayout + p.platformFee + p.refunds
  const newUsers = (p: StatPeriod) => p.newUsers
  const percent = (ratio: number) =>
    f.number(ratio, {
      style: 'percent',
      signDisplay: 'exceptZero',
      maximumFractionDigits: 1,
    })
  const compactMoney = (v: number) =>
    f.number(v, {
      style: 'currency',
      currency: 'VND',
      notation: 'compact',
      maximumFractionDigits: 1,
    })
  const chartProps = {
    stale: stats.isPlaceholderData,
    tableLabel: t('dashboard.growth.table'),
    periodLabel: t('dashboard.growth.period'),
    totalLabel: t('dashboard.growth.total'),
  }

  return (
    <section className="mt-10" aria-labelledby="dash-growth">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 id="dash-growth" className="text-h2">
            {t('dashboard.growth.title')}
          </h2>
          {cur && (
            <HelpTip label={t('dashboard.growth.title')}>
              {t('dashboard.growth.latest', { period: baseLabel(cur) })}
            </HelpTip>
          )}
        </div>
        <div
          role="group"
          aria-label={t('dashboard.growth.filterLabel')}
          className="border-border-control rounded-control inline-flex border p-0.5"
        >
          {(['month', 'quarter'] as const).map((g) => (
            <button
              key={g}
              type="button"
              aria-pressed={granularity === g}
              onClick={() => setGranularity(g)}
              className={cn(
                'rounded-[calc(var(--radius-control)-2px)] px-3 py-1.5 text-sm transition-colors',
                granularity === g
                  ? 'bg-selected text-on-selected font-semibold'
                  : 'text-fg-muted hover:text-fg-strong'
              )}
            >
              {t(`dashboard.growth.${g}`)}
            </button>
          ))}
        </div>
      </div>

      {cur && prev ? (
        <>
          <div
            className={cn(
              'mt-4 grid gap-4 sm:grid-cols-2',
              !moneyUnavailable && 'xl:grid-cols-4'
            )}
          >
            {[
              {
                key: 'platformFee',
                value: f.money(cur.platformFee),
                get: (p: StatPeriod) => p.platformFee,
              },
              { key: 'gmv', value: f.money(gmv(cur)), get: gmv },
              {
                key: 'newUsers',
                value: f.number(newUsers(cur)),
                get: newUsers,
              },
              {
                key: 'totalUsers',
                value: f.number(cur.totalUsers),
                get: (p: StatPeriod) => p.totalUsers,
              },
            ]
              .filter(
                (tile) =>
                  !moneyUnavailable ||
                  (tile.key !== 'platformFee' && tile.key !== 'gmv')
              )
              .map((tile) => (
              <DeltaTile
                key={tile.key}
                label={`${t(
                  `dashboard.growth.${tile.key as 'platformFee' | 'gmv' | 'newUsers' | 'totalUsers'}`
                )} · ${baseLabel(cur)}`}
                newLabel={t('dashboard.growth.firstPeriod')}
                value={tile.value}
                current={tile.get(cur)}
                previous={tile.get(prev)}
                versus={t('dashboard.growth.versus', {
                  period: baseLabel(prev),
                })}
                formatPercent={percent}
              />
            ))}
          </div>

          {/* Money and users use different units: two charts, never a second Y axis */}
          <div
            className={cn(
              'mt-4 grid items-start gap-4',
              !moneyUnavailable && 'lg:grid-cols-2'
            )}
          >
            {!moneyUnavailable && (
            <div className="paper p-5">
              <StackedColumnChart
                title={t('dashboard.growth.moneyChart')}
                series={[
                  {
                    name: t('dashboard.growth.expertPayout'),
                    color: 'var(--ui-series-1)',
                  },
                  {
                    name: t('dashboard.growth.platformFee'),
                    color: 'var(--ui-series-2)',
                  },
                  {
                    name: t('dashboard.growth.refunds'),
                    color: 'var(--ui-series-3)',
                  },
                ]}
                columns={periods.map((p) => ({
                  label: periodLabel(p),
                  tick: tick(p),
                  values: [p.expertPayout, p.platformFee, p.refunds],
                }))}
                format={compactMoney}
                {...chartProps}
              />
            </div>
            )}
            <div className="paper p-5">
              <StackedColumnChart
                title={t('dashboard.growth.usersChart')}
                series={[
                  {
                    name: t('dashboard.growth.newUsers'),
                    color: 'var(--ui-series-1)',
                  },
                ]}
                columns={periods.map((p) => ({
                  label: periodLabel(p),
                  tick: tick(p),
                  values: [p.newUsers],
                }))}
                format={(v) => f.number(v)}
                {...chartProps}
              />
            </div>
          </div>
        </>
      ) : (
        <p className="paper text-fg-muted mt-4 px-5 py-8 text-sm">
          {stats.isLoading
            ? t('dashboard.loading')
            : stats.error
              ? t('dashboard.growth.failed')
              : t('dashboard.growth.notEnough')}
        </p>
      )}
    </section>
  )
}
