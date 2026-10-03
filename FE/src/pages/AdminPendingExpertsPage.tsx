import { cn } from '@/lib/utils'
import {
  AdminLayout,
  ApplicationsTable,
  usePendingApplications,
  type ApplicationStatus,
} from '@/features/admin'

const tabs: { key: ApplicationStatus; label: string; showCount: boolean }[] = [
  { key: 'pending', label: 'Chờ đánh giá', showCount: true },
  { key: 'reconciling', label: 'Đang đối soát', showCount: true },
  { key: 'supplement', label: 'Cần bổ sung', showCount: true },
  { key: 'ineligible', label: 'Không đủ điều kiện', showCount: true },
  { key: 'processed', label: 'Đã xử lý', showCount: false },
]

export default function AdminPendingExpertsPage() {
  const { tab, setTab, query, setQuery, countOf, rows, total, from, to, canPrev, canNext, prev, next } =
    usePendingApplications()

  return (
    <AdminLayout
      title="Hồ sơ chờ duyệt"
      pendingCount={countOf('pending')}
      search={query}
      onSearchChange={setQuery}
    >
      <h1 className="text-ex-heading text-3xl font-bold">Hồ sơ chờ duyệt</h1>
      <p className="text-ex-muted mt-2 text-sm">
        Hồ sơ đã qua đối soát tài liệu và kiểm tra giấy tờ pháp lý, đang chờ System Admin đánh giá
        năng lực.
      </p>

      <div role="tablist" className="mt-8 flex gap-7 overflow-x-auto">
        {tabs.map(({ key, label, showCount }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              'border-b-2 pb-2 text-sm whitespace-nowrap',
              tab === key
                ? 'border-ex-accent text-ex-heading font-semibold'
                : 'text-ex-muted border-transparent',
            )}
          >
            {label}
            {showCount && ` (${countOf(key)})`}
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
