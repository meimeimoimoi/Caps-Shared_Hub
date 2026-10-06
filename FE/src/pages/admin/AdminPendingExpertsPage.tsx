import { cn } from '@/lib/utils'
import { AdminLayout } from '@/app/layouts/admin/AdminLayout'
import { ApplicationsTable } from '../../features/admin/components/ApplicationsTable'
import { QUEUE_TABS } from '../../features/admin/constants'
import { useTranslation } from 'react-i18next'
import { useEffect } from 'react'
import { usePendingApplications } from '../../features/admin/hooks/usePendingApplications'

export default function AdminPendingExpertsPage() {
  const { tab, setTab, query, setQuery, countOf, paged, prev, next } =
    usePendingApplications()
  const { t } = useTranslation('admin')
  useEffect(() => {
    document.title = `${t('pendingExperts.title')} | Shared Hub`
  }, [t])

  return (
    <AdminLayout
      section="pending"
      breadcrumb={t('navigation.pendingExperts')}
      pendingCount={countOf('review')}
      search={query}
      onSearchChange={setQuery}
    >
      <h1 className="text-h1">{t('pendingExperts.title')}</h1>
      <p className="text-fg-muted mt-3">
        {t('pendingExperts.description')}
      </p>

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
            {t(label as any)}
            {showCount && <span className="num"> ({countOf(key)})</span>}
          </button>
        ))}
      </div>

      <ApplicationsTable paged={paged} onPrev={prev} onNext={next} />
    </AdminLayout>
  )
}


