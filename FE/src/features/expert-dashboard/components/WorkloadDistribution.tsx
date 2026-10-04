import {
  ExpertPanel,
  ExpertPanelHeader,
  ExpertPanelFooter,
} from './ExpertPanel'
import type { DashboardDto, WorkStatus } from '../model/types'
import type { QueueFilter } from './OverviewQueue'
import { DashboardSectionState } from './DashboardSectionState'

const segments: { status: WorkStatus; label: string; color: string }[] = [
  {
    status: 'PENDING_EXPERT_RESPONSE',
    label: 'Response needed',
    color: '#c2410c',
  },
  { status: 'PAYMENT_CONFIRMED', label: 'Ready to start', color: '#d6a14d' },
  { status: 'IN_REVIEW', label: 'In review', color: '#27775b' },
  {
    status: 'AWAITING_USER_INFORMATION',
    label: 'Waiting for information',
    color: '#657da0',
  },
  {
    status: 'AWAITING_ACCEPTANCE',
    label: 'Awaiting acceptance',
    color: '#8a729a',
  },
  { status: 'DISPUTED', label: 'Disputed', color: '#b83e56' },
]

export function WorkloadDistribution({
  queue,
  filter,
  setFilter,
}: {
  queue: DashboardDto['queue']
  filter: QueueFilter
  setFilter: (filter: QueueFilter) => void
}) {
  if (queue.status !== 'available')
    return (
      <ExpertPanel>
        <DashboardSectionState
          title="Workload distribution unavailable"
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
          <h2 id="distribution-heading">Workload mix</h2>
          <p>Current stages of the loaded cases.</p>
        </div>
      </ExpertPanelHeader>
      <div className="eo-donut-summary [&_>_div_p]:text-hub-muted flex items-center gap-[14px] [padding:0_24px_14px] max-[1251px]:flex-col max-[1251px]:gap-1 max-[1251px]:text-center max-[1101px]:flex-row max-[1101px]:text-left [&_.eo-donut-total]:[fill:#162235] [&_.eo-donut-total]:text-[26px] [&_.eo-donut-total]:font-[650] [&_>_div_p]:mt-[6px] [&_>_div_p]:text-[12px] [&_>_div_strong]:text-[13px] [&_>_div_strong]:font-semibold [&_svg]:w-34 [&_svg]:min-w-28 [&_svg]:shrink-0 [&_text]:[fill:var(--color-hub-muted)] [&_text]:[font-family:inherit] [&_text]:text-[10px]">
        <svg
          viewBox="0 0 144 144"
          role="img"
          aria-label={`Distribution of ${total} loaded cases: ${data.map((entry) => `${entry.count} ${entry.label.toLowerCase()}`).join(', ')}`}
        >
          <circle
            cx="72"
            cy="72"
            r="52"
            fill="none"
            stroke="#eff1f3"
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
            {total}
          </text>
          <text x="72" y="92" textAnchor="middle">
            loaded cases
          </text>
        </svg>
        <div>
          <strong>
            {total === 0
              ? 'No active cases loaded'
              : 'Every stage, in one view'}
          </strong>
          <p>
            {queue.data.hasMore
              ? `${total} of ${queue.data.total} cases are included in this snapshot.`
              : 'All cases in this snapshot are included.'}
          </p>
        </div>
      </div>
      <div className="eo-distribution-legend grid gap-[2px] [padding:0_20px_16px] max-[1101px]:grid-cols-[1fr_1fr] max-[720px]:grid-cols-[1fr] [&_button]:flex [&_button]:w-full [&_button]:items-center [&_button]:gap-[10px] [&_button]:rounded-[6px] [&_button]:border-0 [&_button]:[padding:9px_8px] [&_button]:text-left [&_button]:[font-family:inherit] [&_button]:text-[12px] [&_button]:text-[#475569] [&_button]:[background:none] [&_button_>_span:nth-child(2)]:flex-1 [&_button:hover]:bg-[#f1f5f3] [&_button:hover]:bg-none [&_button[aria-pressed=true]]:bg-[#f1f5f3] [&_button[aria-pressed=true]]:bg-none">
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
              <strong>{entry.count}</strong>
            </button>
          ))}
      </div>
      <ExpertPanelFooter>
        Select a stage to filter the queue below.
      </ExpertPanelFooter>
    </ExpertPanel>
  )
}
