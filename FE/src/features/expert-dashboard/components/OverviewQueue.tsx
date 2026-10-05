import {
  ExpertPanel,
  ExpertPanelHeader,
  ExpertPanelFooter,
} from './ExpertPanel'
import { Search, ArrowUpRight, Clock3, Pause, Inbox } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import type { DashboardDto, WorkStatus } from '../types'
import { formatDeadline, statusLabels } from '../utils/toDashboardViewModel'
import { DashboardSectionState } from './DashboardSectionState'

export type QueueFilter = 'ALL' | 'EXPERT' | 'OVERDUE' | WorkStatus
export function OverviewQueue({
  queue,
  timezone,
  filter,
  setFilter,
  retry,
}: {
  queue: DashboardDto['queue']
  timezone: string
  filter: QueueFilter
  setFilter: (value: QueueFilter) => void
  retry: () => void
}) {
  const [search, setSearch] = useState('')
  const items =
    queue.status === 'available'
      ? queue.data.items.filter(
          (item) =>
            (filter === 'ALL' ||
              (filter === 'EXPERT'
                ? item.nextAction?.actor === 'EXPERT'
                : filter === 'OVERDUE'
                  ? item.deadline.overdue &&
                    !item.deadline.paused &&
                    item.deadline.actor === 'EXPERT'
                  : item.status === filter)) &&
            `${item.id} ${item.title} ${item.serviceName}`
              .toLowerCase()
              .includes(search.toLowerCase().trim())
        )
      : []
  return (
    <ExpertPanel className="eo-queue" aria-labelledby="work-heading">
      <ExpertPanelHeader>
        <div>
          <h2 id="work-heading">Priority work queue</h2>
          <p>Deadline-first visibility across your current cases.</p>
        </div>
        <Link
          className="eo-text-link inline-flex items-center gap-[5px] border-0 [padding:5px_0] [font-family:inherit] text-[12px] whitespace-nowrap text-[var(--ep-accent-text)]! [background:none] [&:hover]:underline [&:hover]:underline-offset-1"
          to="/expert/cases"
        >
          All cases
          <ArrowUpRight size={15} aria-hidden="true" />
        </Link>
      </ExpertPanelHeader>
      <div className="eo-queue-toolbar flex flex-wrap items-center justify-between gap-3 [padding:0_24px_18px] max-[720px]:[padding:0_18px_16px]">
        <div
          className="eo-segmented inline-flex gap-[3px] rounded-[7px] border border-[var(--ep-border)] bg-[var(--ep-surface-raised)] bg-none [padding:3px] [&_button]:min-h-8 [&_button]:rounded-[5px] [&_button]:border-0 [&_button]:[padding:6px_10px] [&_button]:[font-family:inherit] [&_button]:text-[12px] [&_button]:whitespace-nowrap [&_button]:text-[var(--ep-muted)] [&_button]:[background:transparent] [&_button:hover]:text-[var(--ep-accent-text)] [&_button[aria-pressed=true]]:bg-[var(--ep-surface)] [&_button[aria-pressed=true]]:bg-none [&_button[aria-pressed=true]]:font-semibold [&_button[aria-pressed=true]]:text-[var(--ep-ink)] [&_button[aria-pressed=true]]:[box-shadow:0_1px_3px_#17283b15]"
          aria-label="Queue filter"
        >
          {(
            [
              { id: 'ALL', label: 'All loaded' },
              { id: 'EXPERT', label: 'Your actions' },
              { id: 'OVERDUE', label: 'Overdue' },
            ] as const
          ).map((option) => (
            <button
              key={option.id}
              aria-pressed={filter === option.id}
              onClick={() => setFilter(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <label className="eo-search flex max-w-55 items-center gap-2 rounded-[7px] [padding:8px_10px] text-[var(--ep-muted)] [border:1px_solid_var(--ep-border)] max-[720px]:w-full max-[720px]:max-w-none [&_input]:w-full [&_input]:min-w-0 [&_input]:border-0 [&_input]:[font-family:inherit] [&_input]:text-[12px] [&_input]:text-[var(--ep-ink)] [&_input]:[caret-color:var(--ep-accent)] [&_input]:[outline:none] [&_input]:[background:transparent] [&_input::placeholder]:text-[var(--ep-muted)] [&:focus-within]:[outline:2px_solid_var(--ep-accent)] [&:focus-within]:[outline-offset:2px]">
          <Search size={15} aria-hidden="true" />
          <span className="sr-only">Search loaded cases</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search loaded cases…"
          />
        </label>
      </div>
      {!['ALL', 'EXPERT', 'OVERDUE'].includes(filter) && (
        <div className="eo-filter-note flex items-center gap-3 [padding:0_24px_14px] text-[12px] text-[var(--ep-muted)] [&_button]:border-0 [&_button]:text-[var(--ep-accent-text)] [&_button]:underline [&_button]:[background:none]">
          Filtered by {statusLabels[filter as WorkStatus]}
          <button onClick={() => setFilter('ALL')}>Clear filter</button>
        </div>
      )}
      {queue.status !== 'available' ? (
        <DashboardSectionState
          title="Queue unavailable"
          message={queue.message}
          retry={retry}
        />
      ) : items.length === 0 ? (
        <div className="eo-empty [padding:40px_24px] text-center text-[var(--ep-muted)] [&_h3]:mt-[10px] [&_p]:mt-[7px] [&_p]:text-[12px]">
          <Inbox size={26} aria-hidden="true" />
          <h3>
            {queue.data.items.length === 0
              ? 'You’re all caught up'
              : 'No matching loaded cases'}
          </h3>
          <p>
            {queue.data.items.length === 0
              ? 'New requests and ongoing reviews will appear here.'
              : 'Change the filter or search to see other cases.'}
          </p>
        </div>
      ) : (
        <div className="eo-queue-table overflow-x-auto [&_small]:mt-[5px] [&_small]:block [&_small]:text-[10px] [&_small]:text-[var(--ep-muted)] [&_table]:w-full [&_table]:min-w-160 [&_table]:border-collapse [&_table]:text-left [&_tbody_tr:hover]:bg-[var(--ep-surface-raised)] [&_tbody_tr:hover]:bg-none [&_td]:[padding:19px_18px] [&_td]:text-[12px] [&_td]:[border-bottom:1px_solid_var(--ep-border)] [&_td:first-child]:pl-6 [&_th]:[padding:12px_18px] [&_th]:text-[11px] [&_th]:font-medium [&_th]:[border-block:1px_solid_var(--ep-border)] [&_th:first-child]:pl-6 [&_thead]:bg-[var(--ep-surface-raised)] [&_thead]:bg-none [&_thead]:text-[var(--ep-muted)] [&_tr:last-child_td]:[border-bottom:0]">
          <table>
            <caption className="sr-only">
              Loaded cases sorted by priority, with absolute deadlines in{' '}
              {timezone}
            </caption>
            <thead>
              <tr>
                <th>Case</th>
                <th>Status</th>
                <th>Deadline · {timezone}</th>
                <th>
                  <span className="sr-only">Case action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const overdue =
                  item.deadline.overdue &&
                  !item.deadline.paused &&
                  item.deadline.actor === 'EXPERT'
                return (
                  <tr
                    key={item.id}
                    className={
                      overdue
                        ? 'eo-overdue-row bg-[var(--ep-danger-bg)] bg-none [&_.eo-deadline_>_svg]:text-[var(--ep-danger)] [&_.eo-deadline_time]:text-[var(--ep-danger)]'
                        : ''
                    }
                  >
                    <td>
                      <Link
                        className="eo-case-name text-[13px] font-semibold [&:hover]:text-[var(--ep-accent-text)] [&:hover]:underline [&:hover]:underline-offset-[3px]"
                        to={`/expert/cases/${encodeURIComponent(item.id)}`}
                      >
                        {item.title}
                      </Link>
                      <small>
                        {item.id} · {item.serviceName}
                      </small>
                    </td>
                    <td>
                      <span
                        className={`eo-status inline-flex rounded-[5px] bg-[var(--ep-surface-raised)] bg-none [padding:4px_8px] text-[10px] font-semibold whitespace-nowrap text-[var(--ep-muted)] ${overdue ? 'eo-status-danger bg-[var(--ep-danger-bg)] bg-none text-[var(--ep-danger)]' : item.deadline.paused ? 'eo-status-paused bg-[var(--ep-warning-bg)] bg-none text-[var(--ep-warning)]' : ''}`}
                      >
                        {overdue
                          ? `Overdue · ${statusLabels[item.status]}`
                          : statusLabels[item.status]}
                      </span>
                    </td>
                    <td>
                      <div className="eo-deadline flex items-start gap-[7px] [&_>_svg]:mt-[2px] [&_>_svg]:shrink-0 [&_>_svg]:text-[var(--ep-muted)]">
                        {item.deadline.paused ? (
                          <Pause size={14} aria-hidden="true" />
                        ) : (
                          <Clock3 size={14} aria-hidden="true" />
                        )}
                        <div>
                          <time dateTime={item.deadline.at ?? undefined}>
                            {formatDeadline(item.deadline.at, timezone)}
                          </time>
                          <small>
                            {item.deadline.paused
                              ? 'Client response · Delivery paused'
                              : `${item.deadline.kind} · ${item.deadline.actor === 'EXPERT' ? 'Your action' : 'Client action'}`}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <Link
                        className="eo-row-action inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[7px] border border-[var(--ep-border)] text-[var(--ep-muted)]! [&:hover]:bg-[var(--ui-accent-soft)] [&:hover]:bg-none [&:hover]:text-[var(--ep-accent-text)]!"
                        aria-label={`${item.nextAction?.actor === 'EXPERT' ? item.nextAction.label : 'View case'}: ${item.id}`}
                        to={`/expert/cases/${encodeURIComponent(item.id)}`}
                      >
                        <ArrowUpRight size={18} aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {queue.status === 'available' && (
        <ExpertPanelFooter>
          <span>
            {items.length} shown · {queue.data.items.length} loaded
            {queue.data.hasMore ? ` of ${queue.data.total} total cases` : ''}
          </span>
          <span>Filtered results cover loaded cases only.</span>
        </ExpertPanelFooter>
      )}
    </ExpertPanel>
  )
}
