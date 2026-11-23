import { useExpertPresentation } from '@/features/expert-dashboard/hooks/useExpertPresentation'
import { useTranslation } from 'react-i18next'
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

import { DashboardSectionState } from './DashboardSectionState'

export function OverviewActivity({
  activity,
  timezone,
}: {
  activity: DashboardDto['activity']
  timezone: string
}) {
  const display = useExpertPresentation()

  const { t } = useTranslation('expert')

  const [expanded, setExpanded] = useState(false)
  return (
    <ExpertPanel
      className="eo-activity [&_>_ol]:m-0 [&_>_ol]:grid [&_>_ol]:list-none [&_>_ol]:grid-cols-[repeat(2,_minmax(0,_1fr))] [&_>_ol]:gap-x-7 [&_>_ol]:[padding:0_24px_8px] max-[720px]:[&_>_ol]:grid-cols-[1fr] max-[720px]:[&_>_ol]:[padding:0_18px_8px] [&_details]:mt-[10px] [&_details_p]:mt-2 [&_details_p]:text-[12px] [&_details_p]:text-[var(--ep-muted)] [&_li]:flex [&_li]:items-start [&_li]:gap-3 [&_li]:[padding:18px_0] [&_li]:[border-top:1px_solid_var(--ep-border)] [&_li_small]:mt-[5px] [&_li_small]:block [&_li_small]:text-[11px] [&_li_small]:text-[var(--ep-muted)] [&_li_strong]:text-[12px] [&_li_strong]:font-semibold [&_summary]:text-[11px] [&_summary]:text-[var(--ep-muted)]"
      aria-labelledby="activity-heading"
    >
      <ExpertPanelHeader>
        <div>
          <h2 id="activity-heading">{t('recentActivity')}</h2>
          <p>{t('yourLatestCaseAndServiceUpdates')}</p>
        </div>
        {activity.status === 'available' && activity.data.events.length > 4 && (
          <button
            className="eo-text-link inline-flex items-center gap-[5px] border-0 [padding:5px_0] [font-family:inherit] text-[12px] whitespace-nowrap text-[var(--ep-accent-text)]! [background:none] [&:hover]:underline [&:hover]:underline-offset-1"
            aria-expanded={expanded}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? t('showLess') : t('showAll')}
          </button>
        )}
      </ExpertPanelHeader>
      {activity.status !== 'available' ? (
        <DashboardSectionState
          title={t('activityUnavailable')}
          message={activity.message}
        />
      ) : activity.data.events.length === 0 ? (
        <div className="eo-empty [padding:40px_24px] text-center text-[var(--ep-muted)] [&_h3]:mt-[10px] [&_p]:mt-[7px] [&_p]:text-[12px]">
          <h3>{t('noRecentActivity')}</h3>
          <p>{t('updatesWillAppearAsYourCasesProgress')}</p>
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
                  <span className="eo-activity-icon flex shrink-0 rounded-[7px] bg-[var(--ep-surface-raised)] bg-none p-2 text-[var(--ep-muted)]">
                    <Icon size={16} aria-hidden="true" />
                  </span>
                  <div>
                    <strong>{event.title}</strong>
                    <small>
                      {event.actor} ·{' '}
                      <time
                        dateTime={event.timestamp}
                        title={`${display.deadline(event.timestamp, timezone)} · ${timezone}`}
                      >
                        {display.relativeTime(event.timestamp)}
                      </time>
                    </small>
                    <details>
                      <summary>{t('viewUpdate')}</summary>
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
