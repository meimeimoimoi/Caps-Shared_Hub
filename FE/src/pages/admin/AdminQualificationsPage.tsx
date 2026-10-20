import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { AdminLayout } from '@/app/layouts/admin/AdminLayout'
import { useAdminNav } from '@/app/layouts/admin/useAdminNav'
import { QualificationsTable } from '../../features/expert-vetting/components/QualificationsTable'
import {
  tabsOf,
  useQualificationQueue,
} from '../../features/expert-vetting/hooks/useQualificationQueue'
import type { QualificationScope } from '../../features/expert-vetting/types'

/** Gate 2 queue for reviewers, or the final approval queue for System Admins */
export default function AdminQualificationsPage({
  scope = 'review',
}: {
  scope?: QualificationScope
}) {
  const nav = useAdminNav()
  const { t } = useTranslation(['admin', 'common'])
  const { tab, setTab, query, setQuery, countOf, paged, prev, next, isLoading, error } =
    useQualificationQueue(scope)
  const review = scope === 'review'

  return (
    <AdminLayout
      {...nav}
      section={review ? 'competency' : 'approvals'}
      breadcrumb={
        review ? t('navigation.competencyReview') : t('navigation.finalApproval')
      }
      search={query}
      onSearchChange={setQuery}
    >
      <h1 className="text-h1">
        {review ? t('qualifications.title') : t('finalApproval.title')}
      </h1>
      <p className="text-fg-muted mt-3">
        {review
          ? t('qualifications.description')
          : t('finalApproval.description')}
      </p>

      <div
        role="group"
        aria-label={t('pendingExperts.filterAria')}
        className="mt-12 flex gap-7 overflow-x-auto"
      >
        {tabsOf(scope).map(({ key, showCount }) => (
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
        linkBase={
          review ? '/admin/experts/qualifications' : '/admin/experts/approvals'
        }
      />
    </AdminLayout>
  )
}
