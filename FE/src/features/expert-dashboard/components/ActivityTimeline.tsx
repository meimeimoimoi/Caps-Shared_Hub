import type { DashboardDto } from '../model/types'
import { formatRelativeTime, activityTypeLabels } from '../model/toDashboardViewModel'
import { FileText, CheckCircle, DollarSign, Send, RefreshCw, Clock, AlertTriangle, ShieldCheck, MapPin } from 'lucide-react'

const getIcon = (type: string) => {
  switch (type) {
    case 'case_created': return <FileText size={18} />
    case 'case_completed': return <CheckCircle size={18} />
    case 'payment_received': return <DollarSign size={18} />
    case 'review_submitted': return <Send size={18} />
    case 'status_changed': return <RefreshCw size={18} />
    case 'deadline_extended': return <Clock size={18} />
    case 'dispute_opened': return <AlertTriangle size={18} />
    case 'pricing_approved': return <ShieldCheck size={18} />
    default: return <MapPin size={18} />
  }
}
import { DashboardSectionState } from './DashboardSectionState'

export function ActivityTimeline({ activity }: { activity: DashboardDto['activity']; timezone: string }) {
  return <section className="ep-activity" aria-labelledby="activity-heading">
    <div className="ep-section-heading"><div><h2 id="activity-heading">Recent activity</h2><p>Latest events across your cases and services.</p></div></div>
    {activity.status !== 'available' ? <DashboardSectionState title="Activity unavailable" message={activity.message} />
      : activity.data.events.length === 0 ? <div className="ep-empty"><h3>No recent activity</h3><p>Activity events will appear here as cases progress.</p></div>
      : <ol className="ep-timeline">{activity.data.events.map((event) => <li key={event.id} className="ep-timeline-item">
          <span className="ep-timeline-icon" aria-hidden="true">{getIcon(event.type)}</span>
          <div className="ep-timeline-body">
            <div className="ep-timeline-top">
              <span className={`ep-activity-type ep-activity-${event.type.replaceAll('_', '-')}`}>{activityTypeLabels[event.type] ?? event.type}</span>
              <time className="ep-timeline-time" dateTime={event.timestamp}>{formatRelativeTime(event.timestamp)}</time>
            </div>
            <h3>{event.title}</h3>
            <p>{event.description}</p>
            {event.caseId && <span className="ep-timeline-case">{event.caseId}</span>}
          </div>
        </li>)}</ol>}
  </section>
}
