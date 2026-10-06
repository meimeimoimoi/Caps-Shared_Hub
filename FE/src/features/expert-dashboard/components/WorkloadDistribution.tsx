import { useExpertPresentation } from '@/features/expert-dashboard/hooks/useExpertPresentation'
import { useTranslation } from 'react-i18next'
import {
  ExpertPanel,
  ExpertPanelHeader,
  ExpertPanelFooter,
} from './ExpertPanel'
import type { DashboardDto, WorkStatus } from '../types'
import type { QueueFilter } from './OverviewQueue'
import { DashboardSectionState } from './DashboardSectionState'

export function WorkloadDistribution({
  queue,
  filter,
  setFilter,
}: {
  queue: DashboardDto['queue']
  filter: QueueFilter
  setFilter: (filter: QueueFilter) => void
}) {
  const { t } = useTranslation('expert')
  const display = useExpertPresentation()

  const segments: { status: WorkStatus; label: string; color: string }[] = [
    {
      status: 'PENDING_EXPERT_RESPONSE',
      label: t('responseNeeded'),
      color: 'var(--ui-chart-response)',
    },
    {
      status: 'PAYMENT_CONFIRMED',
      label: t('readyToStart'),
      color: 'var(--ui-chart-ready)',
    },
    {
      status: 'IN_REVIEW',
      label: t('inReview'),
      color: 'var(--ui-chart-review)',
    },
    {
      status: 'AWAITING_USER_INFORMATION',
      label: t('waitingForInformation'),
      color: 'var(--ui-chart-information)',
    },
    {
      status: 'AWAITING_ACCEPTANCE',
      label: t('awaitingAcceptance'),
      color: 'var(--ui-chart-acceptance)',
    },
    {
      status: 'DISPUTED',
      label: t('disputed'),
      color: 'var(--ui-chart-disputed)',
    },
  ]

  if (queue.status !== 'available')
    return (
      <ExpertPanel>
        <DashboardSectionState
          title={t('workloadDistributionUnavailable')}
          message={queue.message}
        />
      </ExpertPanel>
    )
  const total = queue.data.items.length
  const data = segments.map((entry) => ({
    ...entry,
    count: queue.data.items.filter((item) => item.status === entry.status)
      .length,
  }))
  const circumference = 2 * Math.PI * 52
  return (
    <ExpertPanel
      className="eo-distribution"
      aria-labelledby="distribution-heading"
    >
      <ExpertPanelHeader>
        <div>
          <h2 id="distribution-heading">{t('workloadMix')}</h2>
          <p>{t('currentStagesOfTheLoadedCases')}</p>
        </div>
      </ExpertPanelHeader>
      <div className="eo-donut-summary flex items-center gap-[14px] [padding:0_24px_14px] max-[1251px]:flex-col max-[1251px]:gap-1 max-[1251px]:text-center max-[1101px]:flex-row max-[1101px]:text-left [&_.eo-donut-total]:[fill:var(--ep-ink)] [&_.eo-donut-total]:text-[26px] [&_.eo-donut-total]:font-[650] [&_>_div_p]:mt-[6px] [&_>_div_p]:text-[12px] [&_>_div_p]:text-[var(--ep-muted)] [&_>_div_strong]:text-[13px] [&_>_div_strong]:font-semibold [&_svg]:w-34 [&_svg]:min-w-28 [&_svg]:shrink-0 [&_text]:[fill:var(--ep-muted)] [&_text]:[font-family:inherit] [&_text]:text-[10px]">
        <svg
          viewBox="0 0 144 144"
          role="img"
          aria-label={t('distributionLabel', {
            total: display.number(total),
            stages: data
              .map((entry) => `${display.number(entry.count)} ${entry.label}`)
              .join(', '),
          })}
        >
          <circle
            cx="72"
            cy="72"
            r="52"
            fill="none"
            stroke="var(--ep-line)"
            strokeWidth="16"
          />
          {data.map((entry, index) => {
            const offset =
              (data
                .slice(0, index)
                .reduce((sum, previous) => sum + previous.count, 0) /
                Math.max(1, total)) *
              circumference
            const length = (entry.count / Math.max(1, total)) * circumference
            return (
              entry.count > 0 && (
                <circle
                  key={entry.status}
                  cx="72"
                  cy="72"
                  r="52"
                  fill="none"
                  stroke={entry.color}
                  strokeWidth={filter === entry.status ? 21 : 16}
                  strokeDasharray={`${Math.max(0, length - 3)} ${circumference - Math.max(0, length - 3)}`}
                  strokeDashoffset={-offset}
                  transform="rotate(-90 72 72)"
                />
              )
            )
          })}
          <text x="72" y="72" textAnchor="middle" className="eo-donut-total">
            {display.number(total)}
          </text>
          <text x="72" y="92" textAnchor="middle">
            {t('loadedCases')}
          </text>
        </svg>
        <div>
          <strong>
            {total === 0 ? t('noActiveCasesLoaded') : t('everyStageInOneView')}
          </strong>
          <p>
            {queue.data.hasMore
              ? t('snapshotCount', {
                  loaded: display.number(total),
                  total: display.number(queue.data.total),
                })
              : t('allCasesInThisSnapshotAreIncluded')}
          </p>
        </div>
      </div>
      <div className="eo-distribution-legend grid gap-[2px] [padding:0_20px_16px] max-[1101px]:grid-cols-[1fr_1fr] max-[720px]:grid-cols-[1fr] [&_button]:flex [&_button]:w-full [&_button]:items-center [&_button]:gap-[10px] [&_button]:rounded-[6px] [&_button]:border-0 [&_button]:[padding:9px_8px] [&_button]:text-left [&_button]:[font-family:inherit] [&_button]:text-[12px] [&_button]:text-[var(--ep-muted)] [&_button]:[background:none] [&_button_>_span:nth-child(2)]:flex-1 [&_button:hover]:bg-[var(--ep-surface-raised)] [&_button:hover]:bg-none [&_button[aria-pressed=true]]:bg-[var(--ep-surface-raised)] [&_button[aria-pressed=true]]:bg-none">
        {data
          .filter((entry) => entry.count > 0)
          .map((entry) => (
            <button
              key={entry.status}
              aria-pressed={filter === entry.status}
              onClick={() =>
                setFilter(filter === entry.status ? 'ALL' : entry.status)
              }
            >
              <span
                className="eo-dot inline-block h-2 w-2 shrink-0 rounded-full"
                style={{ background: entry.color }}
              />
              <span>{entry.label}</span>
              <strong>{display.number(entry.count)}</strong>
            </button>
          ))}
      </div>
      <ExpertPanelFooter>
        {t('selectAStageToFilterTheQueueBelow')}
      </ExpertPanelFooter>
    </ExpertPanel>
  )
}
