import { ExpertPanel, ExpertPanelHeader } from './ExpertPanel'
import { useState } from 'react'
import {
  CheckCircle2,
  FileText,
  CreditCard,
  RefreshCw,
  Send,
  AlertTriangle,
} from 'lucide-react'
import type { DashboardDto } from '../types'
import {
  formatRelativeTime,
  formatDeadline,
} from '../utils/toDashboardViewModel'
import { DashboardSectionState } from './DashboardSectionState'

export function OverviewActivity({
  activity,
  timezone,
}: {
  activity: DashboardDto['activity']
  timezone: string
}) {
  const [expanded, setExpanded] = useState(false)
  return (
    <ExpertPanel
      className="eo-activity [&_li_small]:text-[var(--ep-muted)] [&_summary]:text-[var(--ep-muted)] [&_details_p]:text-[var(--ep-muted)] [&_>_ol]:m-0 [&_>_ol]:grid [&_>_ol]:list-none [&_>_ol]:grid-cols-[repeat(2,_minmax(0,_1fr))] [&_>_ol]:gap-x-7 [&_>_ol]:[padding:0_24px_8px] max-[720px]:[&_>_ol]:grid-cols-[1fr] max-[720px]:[&_>_ol]:[padding:0_18px_8px] [&_details]:mt-[10px] [&_details_p]:mt-2 [&_details_p]:text-[12px] [&_li]:flex [&_li]:items-start [&_li]:gap-3 [&_li]:[padding:18px_0] [&_li]:[border-top:1px_solid_var(--ep-border)] [&_li_small]:mt-[5px] [&_li_small]:block [&_li_small]:text-[11px] [&_li_strong]:text-[12px] [&_li_strong]:font-semibold [&_summary]:text-[11px]"
      aria-labelledby="activity-heading"
    >
      <ExpertPanelHeader>
        <div>
          <h2 id="activity-heading">Recent activity</h2>
          <p>Your latest case and service updates.</p>
        </div>
        {activity.status === 'available' && activity.data.events.length > 4 && (
          <button
            className="eo-text-link text-[var(--ep-accent)]! inline-flex items-center gap-[5px] border-0 [padding:5px_0] [font-family:inherit] text-[12px] whitespace-nowrap [background:none] [&:hover]:underline [&:hover]:underline-offset-1"
            aria-expanded={expanded}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Show less' : 'Show all'}
          </button>
        )}
      </ExpertPanelHeader>
      {activity.status !== 'available' ? (
        <DashboardSectionState
          title="Activity unavailable"
          message={activity.message}
        />
      ) : activity.data.events.length === 0 ? (
        <div className="eo-empty text-[var(--ep-muted)] [padding:40px_24px] text-center [&_h3]:mt-[10px] [&_p]:mt-[7px] [&_p]:text-[12px]">
          <h3>No recent activity</h3>
          <p>Updates will appear as your cases progress.</p>
        </div>
      ) : (
        <ol>
          {activity.data.events
            .slice(0, expanded ? undefined : 4)
            .map((event) => {
              const Icon =
                event.type === 'payment_received'
                  ? CreditCard
                  : event.type === 'case_completed' ||
                      event.type === 'pricing_approved'
                    ? CheckCircle2
                    : event.type === 'review_submitted'
                      ? Send
                      : event.type === 'dispute_opened'
                        ? AlertTriangle
                        : event.type === 'case_created'
                          ? FileText
                          : RefreshCw
              return (
                <li key={event.id}>
                  <span className="eo-activity-icon text-[var(--ep-muted)] flex shrink-0 rounded-[7px] bg-[#f3f5f4] bg-none p-2">
                    <Icon size={16} aria-hidden="true" />
                  </span>
                  <div>
                    <strong>{event.title}</strong>
                    <small>
                      {event.actor} ·{' '}
                      <time
                        dateTime={event.timestamp}
                        title={`${formatDeadline(event.timestamp, timezone)} · ${timezone}`}
                      >
                        {formatRelativeTime(event.timestamp)}
                      </time>
                    </small>
                    <details>
                      <summary>View update</summary>
                      <p>{event.description}</p>
                    </details>
                  </div>
                </li>
              )
            })}
        </ol>
      )}
    </ExpertPanel>
  )
}


