import { cn } from '@/lib/utils'
import { AdminLayout } from '@/app/layouts/admin/AdminLayout'
import { ApplicationsTable } from '../../features/expert-vetting/components/ApplicationsTable'
import { QUEUE_TABS } from '../../features/expert-vetting/constants'
import { useAdminNav } from '@/app/layouts/admin/useAdminNav'
import { usePendingApplications } from '../../features/expert-vetting/hooks/usePendingApplications'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/ui/layout/page-header'
import { LoadError } from '@/components/ui/feedback/load-error'

export default function AdminPendingExpertsPage() {
  const nav = useAdminNav()
  const { tab, setTab, query, setQuery, countOf, paged, prev, next, isLoading, error } =
    usePendingApplications()
  const { t } = useTranslation(['admin', 'common'])

  return (
    <AdminLayout
      {...nav}
      section="pending"
      breadcrumb={t('navigation.pendingExperts')}
      pendingCount={countOf('review')}
      search={query}
      onSearchChange={setQuery}
    >
      <PageHeader
        title={t('pendingExperts.title')}
        help={t('pendingExperts.description')}
      />

      <div
        role="group"
        aria-label={t('pendingExperts.filterAria')}
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
            {t(label)}
            {showCount && <span className="num"> ({countOf(key)})</span>}
          </button>
        ))}
      </div>

      <ApplicationsTable
        paged={paged}
        onPrev={prev}
        onNext={next}
        loading={isLoading}
        empty={error ? <LoadError /> : undefined}
      />
    </AdminLayout>
  )
}


