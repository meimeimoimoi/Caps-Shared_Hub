import { TrendingUp, TrendingDown, Clock3, Star, CheckCircle2 } from 'lucide-react'
import type { DashboardDto } from '../model/types'
import { DashboardSectionState } from './DashboardSectionState'

export function PerformanceOverview({ performance, retry }: { performance: DashboardDto['performance']; retry: () => void }) {
  if (performance.status !== 'available') return <section className="ep-performance" aria-labelledby="perf-heading">
    <h2 id="perf-heading">Performance</h2>
    <DashboardSectionState title="Performance unavailable" message={performance.message} retry={retry} />
  </section>

  const d = performance.data
  const trend = d.completedLastMonth > 0 ? Math.round(((d.completedThisMonth - d.completedLastMonth) / d.completedLastMonth) * 100) : 0
  const trendUp = trend >= 0

  return <section className="ep-performance" aria-labelledby="perf-heading">
    <div className="ep-section-heading"><div><h2 id="perf-heading">Performance</h2><p>Your operational metrics this month.</p></div></div>
    <div className="ep-perf-grid">
      <div className="ep-perf-card ep-perf-highlight">
        <div className="ep-perf-card-top"><CheckCircle2 size={18} aria-hidden="true" /><span>Cases completed</span></div>
        <div className="ep-perf-value">{d.completedThisMonth}</div>
        <div className={`ep-perf-trend ${trendUp ? 'ep-trend-up' : 'ep-trend-down'}`}>
          {trendUp ? <TrendingUp size={14} aria-hidden="true" /> : <TrendingDown size={14} aria-hidden="true" />}
          <span>{trendUp ? '+' : ''}{trend}% vs last month</span>
        </div>
      </div>
      <div className="ep-perf-card">
        <div className="ep-perf-card-top"><Clock3 size={18} aria-hidden="true" /><span>Avg response time</span></div>
        <div className="ep-perf-value">{d.avgResponseHours.toFixed(1)}<small>hours</small></div>
      </div>
      <div className="ep-perf-card">
        <div className="ep-perf-card-top"><Clock3 size={18} aria-hidden="true" /><span>Avg review duration</span></div>
        <div className="ep-perf-value">{d.avgReviewDays.toFixed(1)}<small>days</small></div>
      </div>
      <div className="ep-perf-card">
        <div className="ep-perf-card-top"><Star size={18} aria-hidden="true" /><span>Satisfaction</span></div>
        <div className="ep-perf-value">{d.satisfactionScore !== null ? d.satisfactionScore.toFixed(1) : '—'}<small>{d.satisfactionScore !== null ? '/ 5' : ''}</small></div>
        {d.satisfactionScore !== null && <div className="ep-rating-stars" aria-label={`${d.satisfactionScore} out of 5`}>
          {[1,2,3,4,5].map((star) => <span key={star} className={star <= Math.round(d.satisfactionScore!) ? 'ep-star-filled' : 'ep-star-empty'} aria-hidden="true">★</span>)}
        </div>}
      </div>
      <div className="ep-perf-card ep-perf-delivery">
        <div className="ep-perf-card-top"><CheckCircle2 size={18} aria-hidden="true" /><span>On-time delivery</span></div>
        <div className="ep-perf-value">{d.onTimeDeliveryRate.toFixed(1)}<small>%</small></div>
        <div className="ep-delivery-bar"><div className="ep-delivery-fill" style={{ width: `${Math.min(d.onTimeDeliveryRate, 100)}%` }} /></div>
      </div>
    </div>
  </section>
}
