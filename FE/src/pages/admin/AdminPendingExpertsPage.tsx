import { cn } from '@/lib/utils'
import { AdminLayout } from '@/app/layouts/admin/AdminLayout'
import { ApplicationsTable } from '../../features/expert-vetting/components/ApplicationsTable'
import { QUEUE_TABS } from '../../features/expert-vetting/constants'
import { useAdminNav } from '@/app/layouts/admin/useAdminNav'
import { usePendingApplications } from '../../features/expert-vetting/hooks/usePendingApplications'

export default function AdminPendingExpertsPage() {
  const nav = useAdminNav()
  const { tab, setTab, query, setQuery, countOf, paged, prev, next, isLoading, error } =
    usePendingApplications()

  return (
    <AdminLayout
      {...nav}
      section="pending"
      breadcrumb="Hồ sơ chờ duyệt"
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
        paged={paged}
        onPrev={prev}
        onNext={next}
        empty={isLoading ? 'Đang tải…' : error?.message}
      />
    </AdminLayout>
  )
}


