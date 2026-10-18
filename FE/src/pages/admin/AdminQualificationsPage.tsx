import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { AdminLayout } from '@/app/layouts/admin/AdminLayout'
import { useAdminNav } from '@/app/layouts/admin/useAdminNav'
import { QualificationsTable } from '../../features/expert-vetting/components/QualificationsTable'
import { QUALIFICATION_TABS } from '../../features/expert-vetting/constants'
import { useQualificationQueue } from '../../features/expert-vetting/hooks/useQualificationQueue'

/** Gate 2 queue: Expert-Service qualifications waiting for competency review */
export default function AdminQualificationsPage() {
  const nav = useAdminNav()
  const { t } = useTranslation(['admin', 'common'])
  const { tab, setTab, query, setQuery, countOf, paged, prev, next, isLoading, error } =
    useQualificationQueue()

  return (
    <AdminLayout
      {...nav}
      section="competency"
      breadcrumb={t('navigation.competencyReview')}
      search={query}
      onSearchChange={setQuery}
    >
      <h1 className="text-h1">{t('qualifications.title')}</h1>
      <p className="text-fg-muted mt-3">{t('qualifications.description')}</p>

      <div
        role="group"
        aria-label={t('pendingExperts.filterAria')}
        className="mt-12 flex gap-7 overflow-x-auto"
      >
        {QUALIFICATION_TABS.map(({ key, showCount }) => (
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
            {t(`qualifications.tabs.${key}`)}
            {showCount && <span className="num"> ({countOf(key)})</span>}
          </button>
        ))}
      </div>

      <QualificationsTable
        paged={paged}
        onPrev={prev}
        onNext={next}
        empty={isLoading ? t('common:loading') : error?.message}
      />
    </AdminLayout>
  )
}
