import { useExpertPresentation } from '@/features/expert-dashboard/hooks/useExpertPresentation'
import { useTranslation } from 'react-i18next'
import type { DashboardDto } from '../types'

import {
  FileText,
  CheckCircle,
  DollarSign,
  Send,
  RefreshCw,
  Clock,
  AlertTriangle,
  ShieldCheck,
  MapPin,
} from 'lucide-react'

const getIcon = (type: string) => {
  switch (type) {
    case 'case_created':
      return <FileText size={18} />
    case 'case_completed':
      return <CheckCircle size={18} />
    case 'payment_received':
      return <DollarSign size={18} />
    case 'review_submitted':
      return <Send size={18} />
    case 'status_changed':
      return <RefreshCw size={18} />
    case 'deadline_extended':
      return <Clock size={18} />
    case 'dispute_opened':
      return <AlertTriangle size={18} />
    case 'pricing_approved':
      return <ShieldCheck size={18} />
    default:
      return <MapPin size={18} />
  }
}
import { DashboardSectionState } from './DashboardSectionState'

export function ActivityTimeline({
  activity,
}: {
  activity: DashboardDto['activity']
  timezone: string
}) {
  const display = useExpertPresentation()

  const { t } = useTranslation('expert')

  return (
    <section className="ep-activity" aria-labelledby="activity-heading">
      <div className="ep-section-heading">
        <div>
          <h2 id="activity-heading">{t('recentActivity')}</h2>
          <p>{t('latestEventsAcrossYourCasesAndServices')}</p>
        </div>
      </div>
      {activity.status !== 'available' ? (
        <DashboardSectionState
          title={t('activityUnavailable')}
          message={activity.message}
        />
      ) : activity.data.events.length === 0 ? (
        <div className="ep-empty">
          <h3>{t('noRecentActivity')}</h3>
          <p>{t('activityEventsWillAppearHereAsCasesProgress')}</p>
        </div>
      ) : (
        <ol className="ep-timeline">
          {activity.data.events.map((event) => (
            <li key={event.id} className="ep-timeline-item">
              <span className="ep-timeline-icon" aria-hidden="true">
                {getIcon(event.type)}
              </span>
              <div className="ep-timeline-body">
                <div className="ep-timeline-top">
                  <span
                    className={`ep-activity-type ep-activity-${event.type.replaceAll('_', '-')}`}
                  >
                    {display.activityType(event.type)}
                  </span>
                  <time className="ep-timeline-time" dateTime={event.timestamp}>
                    {display.relativeTime(event.timestamp)}
                  </time>
                </div>
                <h3>{event.title}</h3>
                <p>{event.description}</p>
                {event.caseId && (
                  <span className="ep-timeline-case">{event.caseId}</span>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
