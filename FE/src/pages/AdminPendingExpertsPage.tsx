import { cn } from '@/lib/utils'
import {
  AdminLayout,
  ApplicationsTable,
  QUEUE_TABS,
  usePendingApplications,
} from '@/features/admin'

export default function AdminPendingExpertsPage() {
  const {
    tab,
    setTab,
    query,
    setQuery,
    countOf,
    rows,
    total,
    from,
    to,
    canPrev,
    canNext,
    prev,
    next,
  } = usePendingApplications()

  return (
    <AdminLayout
      breadcrumb="Hồ sơ chờ duyệt"
      pendingCount={countOf('review')}
      search={query}
      onSearchChange={setQuery}
    >
      <h1 className="text-h1">Hồ sơ chờ duyệt</h1>
      <p className="text-fg-muted mt-3">
        Hồ sơ đã qua đối soát tài liệu và kiểm tra giấy tờ pháp lý, đang chờ
        System Admin đánh giá năng lực.
      </p>

      <div
        role="group"
        aria-label="Lọc theo trạng thái"
        className="mt-12 flex gap-7 overflow-x-auto"
      >
        {QUEUE_TABS.map(({ key, label, showCount }) => (
          <button
            key={key}
            type="button"
            aria-pressed={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              'border-b-2 pb-2 whitespace-nowrap',
              tab === key
                ? 'border-indicator text-fg-strong font-semibold'
                : 'text-fg-muted border-transparent'
            )}
          >
            {label}
            {showCount && <span className="num"> ({countOf(key)})</span>}
          </button>
        ))}
      </div>

      <ApplicationsTable
        rows={rows}
        total={total}
        from={from}
        to={to}
        canPrev={canPrev}
        canNext={canNext}
        onPrev={prev}
        onNext={next}
      />
    </AdminLayout>
  )
}
