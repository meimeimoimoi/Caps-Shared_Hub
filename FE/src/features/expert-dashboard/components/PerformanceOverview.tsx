import { useExpertPresentation } from '@/features/expert-dashboard/hooks/useExpertPresentation'
import { useTranslation } from 'react-i18next'
import {
  TrendingUp,
  TrendingDown,
  Clock3,
  Star,
  CheckCircle2,
} from 'lucide-react'
import type { DashboardDto } from '../types'
import { DashboardSectionState } from './DashboardSectionState'

export function PerformanceOverview({
  performance,
  retry,
}: {
  performance: DashboardDto['performance']
  retry: () => void
}) {
  const { t } = useTranslation('expert')
  const display = useExpertPresentation()

  if (performance.status !== 'available')
    return (
      <section className="ep-performance" aria-labelledby="perf-heading">
        <h2 id="perf-heading">{t('performance')}</h2>
        <DashboardSectionState
          title={t('performanceUnavailable')}
          message={performance.message}
          retry={retry}
        />
      </section>
    )

  const d = performance.data
  const trend =
    d.completedLastMonth > 0
      ? Math.round(
          ((d.completedThisMonth - d.completedLastMonth) /
            d.completedLastMonth) *
            100
        )
      : 0
  const trendUp = trend >= 0

  return (
    <section className="ep-performance" aria-labelledby="perf-heading">
      <div className="ep-section-heading">
        <div>
          <h2 id="perf-heading">{t('performance')}</h2>
          <p>{t('yourOperationalMetricsThisMonth')}</p>
        </div>
      </div>
      <div className="ep-perf-grid">
        <div className="ep-perf-card ep-perf-highlight">
          <div className="ep-perf-card-top">
            <CheckCircle2 size={18} aria-hidden="true" />
            <span>{t('casesCompleted')}</span>
          </div>
          <div className="ep-perf-value">
            {display.number(d.completedThisMonth)}
          </div>
          <div
            className={`ep-perf-trend ${trendUp ? 'ep-trend-up' : 'ep-trend-down'}`}
          >
            {trendUp ? (
              <TrendingUp size={14} aria-hidden="true" />
            ) : (
              <TrendingDown size={14} aria-hidden="true" />
            )}
            <span>
              {t('percentLastMonth', {
                value: display.number(trend / 100, {
                  style: 'percent',
                  signDisplay: 'exceptZero',
                }),
              })}
            </span>
          </div>
        </div>
        <div className="ep-perf-card">
          <div className="ep-perf-card-top">
            <Clock3 size={18} aria-hidden="true" />
            <span>{t('avgResponseTime')}</span>
          </div>
          <div className="ep-perf-value">
            {t('hoursValue', {
              value: display.number(d.avgResponseHours, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              }),
            })}
          </div>
        </div>
        <div className="ep-perf-card">
          <div className="ep-perf-card-top">
            <Clock3 size={18} aria-hidden="true" />
            <span>{t('avgReviewDuration')}</span>
          </div>
          <div className="ep-perf-value">
            {t('daysValue', {
              value: display.number(d.avgReviewDays, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              }),
            })}
          </div>
        </div>
        <div className="ep-perf-card">
          <div className="ep-perf-card-top">
            <Star size={18} aria-hidden="true" />
            <span>{t('satisfaction')}</span>
          </div>
          <div className="ep-perf-value">
            {d.satisfactionScore !== null
              ? display.number(d.satisfactionScore, {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })
              : '—'}
            <small>{d.satisfactionScore !== null ? '/ 5' : ''}</small>
          </div>
          {d.satisfactionScore !== null && (
            <div
              className="ep-rating-stars"
              aria-label={t('ratingValue', {
                value: display.number(d.satisfactionScore),
              })}
            >
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={
                    star <= Math.round(d.satisfactionScore!)
                      ? 'ep-star-filled'
                      : 'ep-star-empty'
                  }
                  aria-hidden="true"
                >
                  ★
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="ep-perf-card ep-perf-delivery">
          <div className="ep-perf-card-top">
            <CheckCircle2 size={18} aria-hidden="true" />
            <span>{t('ontimeDelivery')}</span>
          </div>
          <div className="ep-perf-value">
            {display.number(d.onTimeDeliveryRate / 100, {
              style: 'percent',
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}
          </div>
          <div className="ep-delivery-bar">
            <div
              className="ep-delivery-fill"
              style={{ width: `${Math.min(d.onTimeDeliveryRate, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
