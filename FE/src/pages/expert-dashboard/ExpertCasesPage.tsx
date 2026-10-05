import { useExpertDashboard } from '../../features/expert-dashboard/hooks/useExpertDashboard'
import { useExpertContext } from '@/features/expert-context'
import {
  toDashboardViewModel,
  statusLabels,
  formatDeadline,
} from '../../features/expert-dashboard/utils/toDashboardViewModel'
import {
  DashboardSectionState,
  DashboardSkeleton,
} from '../../features/expert-dashboard/components/DashboardSectionState'
import { Link, useLocation } from 'react-router-dom'
import { Clock3, Pause, Filter, ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { CustomSelect } from '@/components/ui/forms/custom-select'
import { Pagination } from '@/components/ui/navigation/pagination'
import { usePagination } from '@/hooks/usePagination'
import type { WorkStatus } from '../../features/expert-dashboard/types'

const statusFilters: { value: WorkStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'PENDING_EXPERT_RESPONSE', label: 'Response needed' },
  { value: 'PAYMENT_CONFIRMED', label: 'Ready to start' },
  { value: 'IN_REVIEW', label: 'In review' },
  { value: 'AWAITING_USER_INFORMATION', label: 'Waiting for info' },
  { value: 'AWAITING_ACCEPTANCE', label: 'Awaiting acceptance' },
  { value: 'DISPUTED', label: 'Disputed' },
]

export default function ExpertCasesPage() {
  const { pathname } = useLocation()
  const scope = pathname.endsWith('/queue')
    ? 'queue'
    : pathname.endsWith('/active')
      ? 'active'
      : 'all'
  const heading =
    scope === 'queue'
      ? 'Work Queue'
      : scope === 'active'
        ? 'Active Cases'
        : 'Cases'
  const context = useExpertContext()
  const dashboard = useExpertDashboard()
  const [filter, setFilter] = useState<WorkStatus | 'ALL'>('ALL')
  const refresh = () => {
    void context.refetch()
    void dashboard.refetch()
  }
  const model =
    dashboard.data && context.data
      ? toDashboardViewModel(dashboard.data, context.data.version)
      : null
  const scopedItems =
    model?.queue.status === 'available'
      ? model.queue.data.items.filter(
          (item) =>
            scope === 'all' ||
            (scope === 'queue'
              ? item.status === 'PENDING_EXPERT_RESPONSE'
              : item.status !== 'PENDING_EXPERT_RESPONSE')
        )
      : []
  const visibleItems = scopedItems.filter(
    (item) => filter === 'ALL' || item.status === filter
  )
  const pagination = usePagination(visibleItems, `${scope}:${filter}`)
  const filters = statusFilters.filter(
    (option) =>
      option.value === 'ALL' ||
      (scope === 'queue'
        ? option.value === 'PENDING_EXPERT_RESPONSE'
        : scope === 'active'
          ? option.value !== 'PENDING_EXPERT_RESPONSE'
          : true)
  )

  return (
    <>
      <div className="ep-page-heading">
        <div>
          <h1>{heading}</h1>
          <p>
            {scope === 'queue'
              ? 'New requests awaiting your acceptance or decline.'
              : scope === 'active'
                ? 'Accepted cases, delivery deadlines and client follow-ups.'
                : 'All your review cases and requests.'}
          </p>
        </div>
      </div>
      {dashboard.isPending || context.isPending ? (
        <DashboardSkeleton />
      ) : !model ? (
        <DashboardSectionState
          title="Cases unavailable"
          message={dashboard.error?.message ?? 'Case data could not be loaded.'}
          retry={refresh}
        />
      ) : !model.consistent ? (
        <DashboardSectionState
          title="Data versions do not match"
          message="Refresh to load cases and expert context from the same snapshot."
          retry={refresh}
        />
      ) : model.queue.status !== 'available' ? (
        <DashboardSectionState
          title="Cases unavailable"
          message={model.queue.message}
          retry={refresh}
        />
      ) : (
        <>
          {(dashboard.isError || model.freshness.stale) && (
            <div className="ep-notice" role="status">
              <strong>Showing earlier data.</strong>{' '}
              {dashboard.isError
                ? 'The latest refresh failed.'
                : model.freshness.message}{' '}
              <button
                className="ep-inline-button"
                onClick={refresh}
                disabled={dashboard.isFetching}
              >
                Retry refresh
              </button>
            </div>
          )}
          <div className="ep-cases-toolbar">
            <div
              className="ep-filter-group"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Filter size={15} aria-hidden="true" />
              <CustomSelect
                value={filter}
                onChange={(val) => setFilter(val)}
                options={filters}
                label="Filter by status"
                className="flex items-center gap-2 [&>span]:hidden"
                triggerClassName="!min-h-[34px] !py-1 !text-xs !w-[200px]"
              />
            </div>
            <span className="ep-count-label">
              {visibleItems.length} shown
              {model.queue.data.hasMore ? ' · Partial dataset' : ''}
            </span>
          </div>
          {visibleItems.length === 0 ? (
            <div className="ep-empty">
              <h3>No cases match this filter</h3>
              <p>Try selecting a different status filter.</p>
            </div>
          ) : (
            <>
            <div className="ep-cases-table-wrapper rounded-b-none border-b-0 shadow-none">
              <table className="ep-cases-table">
                <thead>
                  <tr>
                    <th scope="col">Case</th>
                    <th scope="col">Status</th>
                    <th scope="col">Deadline</th>
                    <th scope="col"><span className="sr-only">Details</span></th>
                  </tr>
                </thead>
                <tbody>
                  {pagination.rows.map((item) => {
                    const overdue =
                      item.deadline.overdue &&
                      !item.deadline.paused &&
                      item.deadline.actor === 'EXPERT'
                    return (
                      <tr key={item.id}>
                        <td className="ep-case-title whitespace-normal!">
                          <span className="block font-semibold wrap-anywhere">{item.title}</span>
                          <span className="mt-1 block text-[12px] font-normal text-[var(--ep-muted)] wrap-anywhere">{item.serviceName}</span>
                        </td>
                        <td>
                          <span
                            className={`ep-status ${item.deadline.paused ? 'ep-status-paused' : ''}`}
                          >
                            {statusLabels[item.status]}
                          </span>
                        </td>
                        <td className="ep-case-deadline">
                          <div
                            className={`ep-deadline ${overdue ? 'ep-text-danger' : ''}`}
                          >
                            {item.deadline.paused ? (
                              <Pause size={13} aria-hidden="true" />
                            ) : (
                              <Clock3 size={13} aria-hidden="true" />
                            )}
                            <div>
                              <span>{overdue ? `Overdue: ${item.deadline.kind}` : item.deadline.kind}</span>
                              <time dateTime={item.deadline.at ?? undefined}>
                                {formatDeadline(
                                  item.deadline.at,
                                  model.timezone
                                )}
                              </time>
                            </div>
                          </div>
                        </td>
                        <td>
                          <Link
                            to={`/expert/cases/${item.id}`}
                            aria-label={`View details: ${item.title}`}
                            className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap text-[13px] font-medium hover:underline underline-offset-4"
                          >
                            View details <ArrowRight size={15} aria-hidden="true" />
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
              <Pagination
                page={pagination.page}
                pageSize={pagination.pageSize}
                total={pagination.total}
                onPageChange={pagination.setPage}
                onPageSizeChange={pagination.setPageSize}
                label="Case list pagination"
              />
            </>
          )}
        </>
      )}
    </>
  )
}
