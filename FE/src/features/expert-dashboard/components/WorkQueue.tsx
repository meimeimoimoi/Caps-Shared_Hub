import { useExpertPresentation } from '@/features/expert-dashboard/hooks/useExpertPresentation'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowUpRight, CheckCheck, Clock3, Pause } from 'lucide-react'
import type { DashboardDto } from '../types'
import { resolveActionRoute } from '../utils/toDashboardViewModel'
import { DashboardSectionState } from './DashboardSectionState'

export function WorkQueue({
  queue,
  timezone,
  retry,
}: {
  queue: DashboardDto['queue']
  timezone: string
  retry: () => void
}) {
  const display = useExpertPresentation()

  const { t } = useTranslation('expert')

  return (
    <section className="ep-work-queue" aria-labelledby="work-heading">
      <div className="ep-section-heading">
        <div>
          <h2 id="work-heading">{t('workQueueAlternative')}</h2>
          <p>{t('expertActionsAndCasesAwaitingYourUser')}</p>
        </div>
        {queue.status === 'available' && (
          <span className="ep-count-label">
            {t('workActiveCount', { total: display.number(queue.data.total) })}
          </span>
        )}
      </div>
      {queue.status !== 'available' ? (
        <DashboardSectionState
          title={t('queueUnavailable')}
          message={queue.message}
          retry={retry}
        />
      ) : queue.data.items.length === 0 ? (
        <div className="ep-empty">
          <CheckCheck size={28} aria-hidden="true" />
          <h3>{t('noActiveWork')}</h3>
          <p>
            {t(
              'requestsAndOngoingCasesWillAppearHereCheckYourServiceReadinessToSeeWhetherYouCanReceiveNewWork'
            )}
          </p>
        </div>
      ) : (
        <>
          <ul className="ep-queue-list">
            {queue.data.items.map((item) => {
              const route =
                item.nextAction?.actor === 'EXPERT'
                  ? resolveActionRoute(item.nextAction.code, item.id)
                  : null
              const overdue =
                item.deadline.overdue &&
                !item.deadline.paused &&
                item.deadline.actor === 'EXPERT'
              return (
                <li key={item.id} className="ep-work-item">
                  <div className="ep-work-top">
                    <span className="ep-resource-id">{item.id}</span>
                    <span
                      className={`ep-status ${overdue ? 'ep-status-danger' : item.deadline.paused ? 'ep-status-paused' : ''}`}
                    >
                      {overdue
                        ? t('overdueStatus', {
                            status: display.status(item.status),
                          })
                        : display.status(item.status)}
                    </span>
                  </div>
                  <h3>{item.title}</h3>
                  <p className="ep-service-name">{item.serviceName}</p>
                  <div className="ep-work-bottom">
                    <div
                      className={`ep-deadline ${overdue ? 'ep-text-danger' : ''}`}
                    >
                      {item.deadline.paused ? (
                        <Pause size={15} aria-hidden="true" />
                      ) : (
                        <Clock3 size={15} aria-hidden="true" />
                      )}
                      <div>
                        <span>
                          {display.deadlineKind(item.deadline.kind)}
                          {item.deadline.paused
                            ? ' · ' + t('deliverySlaPaused')
                            : ''}
                        </span>
                        <time dateTime={item.deadline.at ?? undefined}>
                          {display.deadline(item.deadline.at, timezone)}
                        </time>
                      </div>
                    </div>
                    <div className="ep-next-action">
                      {route ? (
                        <Link
                          className="ep-button ep-button-primary"
                          to={route}
                        >
                          {item.nextAction
                            ? display.actionLabel(item.nextAction.label)
                            : null}
                          <ArrowUpRight size={15} aria-hidden="true" />
                        </Link>
                      ) : item.nextAction?.actor === 'EXPERT' ? (
                        <button
                          className="ep-button ep-button-primary"
                          disabled
                          style={{ opacity: 0.6 }}
                        >
                          {item.nextAction
                            ? display.actionLabel(item.nextAction.label)
                            : t('actionRequired')}
                        </button>
                      ) : (
                        <>
                          <span>
                            {item.nextAction
                              ? display.actionLabel(item.nextAction.label)
                              : t('noActionRequired')}
                          </span>
                          <small>{t('userActionMonitorOnly')}</small>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
          <p className="ep-queue-footnote">
            {t('workItemsCount', {
              shown: display.number(queue.data.items.length),
              total: display.number(queue.data.total),
            })}
            {queue.data.hasMore ? ' ' + t('loadedNavigationOnly') : ''}
          </p>
        </>
      )}
    </section>
  )
}
