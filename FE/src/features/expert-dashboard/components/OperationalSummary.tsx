import { useExpertPresentation } from '@/features/expert-dashboard/hooks/useExpertPresentation'
import { useTranslation } from 'react-i18next'
import type { DashboardDto } from '../types'
import { DashboardSectionState } from './DashboardSectionState'

export function OperationalSummary({
  counts,
  retry,
}: {
  counts: DashboardDto['counts']
  retry: () => void
}) {
  const { t } = useTranslation('expert')
  const display = useExpertPresentation()

  return (
    <section className="ep-operational" aria-labelledby="operation-heading">
      <h2 id="operation-heading">{t('acrossYourWorkload')}</h2>
      {counts.status !== 'available' ? (
        <DashboardSectionState
          title={t('totalsUnavailable')}
          message={counts.message}
          retry={retry}
        />
      ) : (
        <>
          <dl className="ep-totals">
            {[
              [t('awaitingResponse'), counts.data.pendingResponse],
              [t('readyToStart'), counts.data.readyToStart],
              [t('inReview'), counts.data.inReview],
              [t('overdue'), counts.data.overdue],
            ].map(([label, value], index) => (
              <div key={index}>
                <dt>{label}</dt>
                <dd>{display.number(Number(value))}</dd>
              </div>
            ))}
          </dl>
          <p className="ep-definition">
            {display.demoCopy(counts.data.definition)}
          </p>
        </>
      )}
    </section>
  )
}
