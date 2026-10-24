import { useTranslation } from 'react-i18next'
import { ListFilter } from 'lucide-react'
import { CustomSelect } from '@/components/ui/forms/custom-select'
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

      {/* Status filter as one compact dropdown; the count of each status sits in its option */}
      <div className="mt-10 mb-4">
        <CustomSelect
          label={t('pendingExperts.filterAria')}
          value={tab}
          options={tabsOf(scope).map(({ key, showCount }) => ({
            value: key,
            label: showCount
              ? `${t(`qualifications.tabs.${key}`)} (${countOf(key)})`
              : t(`qualifications.tabs.${key}`),
          }))}
          onChange={setTab}
          triggerLeading={<ListFilter size={14} aria-hidden="true" className="text-text-muted" />}
          className="inline-flex min-w-0 flex-col items-start text-xs [&>span]:sr-only"
          triggerClassName="!h-9 !min-h-9 !w-auto !gap-2 !rounded-md !px-3 !py-0 text-sm !shadow-none"
        />
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
