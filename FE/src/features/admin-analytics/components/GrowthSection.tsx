import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { useFormatters } from '@/hooks/useFormatters'
import { useAdminStats } from '../hooks/useAdminStats'
import type { Granularity, StatPeriod } from '../types'
import { DeltaTile } from './DeltaTile'
import { StackedColumnChart } from './StackedColumnChart'

/* Tăng trưởng: bộ lọc kỳ ở trên, áp dụng cho mọi thẻ so sánh và biểu đồ bên dưới */
export function GrowthSection() {
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
  // Trục X hẹp (12 cột): tháng chỉ hiện "T11"; năm vẫn có trong tooltip và bảng
  const tick = (p: StatPeriod) =>
    p.quarter
      ? baseLabel(p)
      : t('dashboard.growth.monthTick', {
          month: f.dateOnly(p.start, { month: 'numeric' }),
          name: f.dateOnly(p.start, { month: 'short' }),
        })
  // Kỳ đang dở vẫn hiện trên biểu đồ nhưng ghi rõ, để không bị đọc nhầm là sụt giảm
  const periodLabel = (p: StatPeriod) =>
    p.partial
      ? t('dashboard.growth.partial', { period: baseLabel(p) })
      : baseLabel(p)
  // Thẻ so sánh chỉ dùng 2 kỳ đã chốt gần nhất: so kỳ dở với kỳ đủ sẽ luôn báo "giảm" sai
  const closed = periods.filter((p) => !p.partial)
  const cur = closed.at(-1)
  const prev = closed.at(-2)
  const gmv = (p: StatPeriod) => p.expertPayout + p.platformFee + p.refunds
  const newUsers = (p: StatPeriod) => p.newClients + p.newExperts
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
        <h2 id="dash-growth" className="text-h2">
          {t('dashboard.growth.title')}
        </h2>
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
          <p className="text-fg-muted mt-1 text-sm">
            {t('dashboard.growth.latest', { period: baseLabel(cur) })}
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
            ].map((tile) => (
              <DeltaTile
                key={tile.key}
                label={t(
                  `dashboard.growth.${tile.key as 'platformFee' | 'gmv' | 'newUsers' | 'totalUsers'}`
                )}
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

          {/* Tiền và người dùng khác đơn vị: 2 biểu đồ riêng, không dùng 2 trục Y */}
          <div className="mt-4 grid items-start gap-4 lg:grid-cols-2">
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
            <div className="paper p-5">
              <StackedColumnChart
                title={t('dashboard.growth.usersChart')}
                series={[
                  {
                    name: t('dashboard.growth.clients'),
                    color: 'var(--ui-series-1)',
                  },
                  {
                    name: t('dashboard.growth.experts'),
                    color: 'var(--ui-series-2)',
                  },
                ]}
                columns={periods.map((p) => ({
                  label: periodLabel(p),
                  tick: tick(p),
                  values: [p.newClients, p.newExperts],
                }))}
                format={(v) => f.number(v)}
                {...chartProps}
              />
            </div>
          </div>
          <p className="text-fg-muted text-caption mt-2">
            {t('dashboard.growth.mock')}
          </p>
        </>
      ) : (
        <p className="paper text-fg-muted mt-4 px-5 py-8 text-sm">
          {stats.isLoading
            ? t('dashboard.loading')
            : (stats.error?.message ?? t('dashboard.growth.notEnough'))}
        </p>
      )}
    </section>
  )
}
