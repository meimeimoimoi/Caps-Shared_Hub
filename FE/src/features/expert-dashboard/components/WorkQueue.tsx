import { Link } from 'react-router-dom'
import { ArrowUpRight, CheckCheck, Clock3, Pause } from 'lucide-react'
import type { DashboardDto } from '../types'
import { formatDeadline, resolveActionRoute, statusLabels } from '../utils/toDashboardViewModel'
import { DashboardSectionState } from './DashboardSectionState'

export function WorkQueue({ queue, timezone, retry }: { queue: DashboardDto['queue']; timezone: string; retry: () => void }) {
  return <section className="ep-work-queue" aria-labelledby="work-heading">
    <div className="ep-section-heading"><div><h2 id="work-heading">Work queue</h2><p>Expert actions and cases awaiting your user.</p></div>{queue.status === 'available' && <span className="ep-count-label">{queue.data.total} active</span>}</div>
    {queue.status !== 'available' ? <DashboardSectionState title="Queue unavailable" message={queue.message} retry={retry} />
      : queue.data.items.length === 0 ? <div className="ep-empty"><CheckCheck size={28} aria-hidden="true" /><h3>No active work</h3><p>Requests and ongoing cases will appear here. Check your service readiness to see whether you can receive new work.</p></div>
      : <><ul className="ep-queue-list">{queue.data.items.map((item) => {
        const route = item.nextAction?.actor === 'EXPERT' ? resolveActionRoute(item.nextAction.code, item.id) : null
        const overdue = item.deadline.overdue && !item.deadline.paused && item.deadline.actor === 'EXPERT'
        return <li key={item.id} className="ep-work-item">
          <div className="ep-work-top"><span className="ep-resource-id">{item.id}</span><span className={`ep-status ${overdue ? 'ep-status-danger' : item.deadline.paused ? 'ep-status-paused' : ''}`}>{overdue ? 'Overdue · ' : ''}{statusLabels[item.status]}</span></div>
          <h3>{item.title}</h3><p className="ep-service-name">{item.serviceName}</p>
          <div className="ep-work-bottom"><div className={`ep-deadline ${overdue ? 'ep-text-danger' : ''}`}>
            {item.deadline.paused ? <Pause size={15} aria-hidden="true" /> : <Clock3 size={15} aria-hidden="true" />}
            <div><span>{item.deadline.kind}{item.deadline.paused ? ' · Delivery SLA paused' : ''}</span><time dateTime={item.deadline.at ?? undefined}>{formatDeadline(item.deadline.at, timezone)}</time></div>
          </div><div className="ep-next-action">{route ? <Link className="ep-button ep-button-primary" to={route}>{item.nextAction?.label}<ArrowUpRight size={15} aria-hidden="true" /></Link> : item.nextAction?.actor === 'EXPERT' ? <button className="ep-button ep-button-primary" disabled style={{ opacity: 0.6 }}>{item.nextAction?.label ?? 'Action required'}</button> : <><span>{item.nextAction?.label ?? 'No action required'}</span><small>User action · monitor only</small></>}</div></div>
        </li>
      })}</ul><p className="ep-queue-footnote">Showing {queue.data.items.length} of {queue.data.total} active items.{queue.data.hasMore ? ' Case navigation is limited to the loaded dataset.' : ''}</p></>}
  </section>
}
