import { SortableTh } from '@/components/ui/navigation/sortable-th'
import type { TableSort } from '@/lib/table-sort'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { TriangleAlert } from 'lucide-react'
import type { Paged } from '@/lib/utils'
import { TablePager } from '@/components/ui/navigation/table-pager'
import type { ExpertApplication } from '../types'
import { formatDate, waitedDays } from '../utils/applications'
import { isOverdue, useReviewSlaDays } from '../hooks/useReviewSlaDays'

import { useTranslation } from 'react-i18next'
import { useMotion } from '@/components/ui/motion'
import { useFieldLabel } from '../hooks/useLabels'
import { SkeletonRows } from '@/components/ui/display/skeleton-rows'
import { EmptyState } from '@/components/ui/feedback/empty-state'

interface ApplicationsTableProps {
  paged: Paged<ExpertApplication>
  sort?: TableSort
  onSort?: (key: string) => void
  onPrev: () => void
  onNext: () => void
  onPageChange?: (page: number) => void
  onPageSizeChange?: (size: number) => void
  /** Chữ khi không có dòng nào, vd. đang tải hoặc lỗi */
  empty?: ReactNode
  /** Shows skeleton rows while the queue loads */
  loading?: boolean
}

export function ApplicationsTable({
  paged,
  sort,
  onSort,
  onPrev,
  onNext,
  onPageChange,
  onPageSizeChange,
  empty,
  loading = false,
}: ApplicationsTableProps) {
  const slaDays = useReviewSlaDays()
  const { t } = useTranslation('admin')
  const fieldLabel = useFieldLabel()
  const { rows, total } = paged
  const motion = useMotion<HTMLTableSectionElement>({
    preset: 'fade',
    replayKey: rows.map((row) => row.id).join(','),
  })
  return (
    <section className="paper mt-4">
      <div className="text-fg-muted flex justify-between px-4 py-3 text-sm">
        <span>{sort && sort.key !== 'queue' ? t('applicationsTable.caption') : t('applicationsTable.sortBy')}</span>
        <span>
          <span className="num">{total}</span>{' '}
          {t('applicationsTable.applicationCount')}
        </span>
      </div>
      <div className="overflow-x-auto">
      <table className="w-full min-w-190 text-sm">
        <caption className="sr-only">{t('applicationsTable.caption')}</caption>
        <thead className="bg-sunken text-fg-muted">
          <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:font-semibold">
            <SortableTh
              className="text-left"
              column="name"
              sort={sort}
              onSort={onSort}
            >
              {t('applicationsTable.table.applicant')}
            </SortableTh>
            <SortableTh
              className="text-right"
              column="years"
              sort={sort}
              onSort={onSort}
            >
              {t('applicationsTable.table.experienceYears')}
            </SortableTh>
            <th scope="col" className="text-left">
              {t('applicationsTable.table.aiScreening')}
            </th>
            <SortableTh
              className="text-right"
              column="submittedAt"
              sort={sort}
              onSort={onSort}
            >
              {t('applicationsTable.table.submittedAt')}
            </SortableTh>
            <SortableTh
              className="text-right"
              column="waiting"
              sort={sort}
              onSort={onSort}
            >
              {t('applicationsTable.table.waited')}
            </SortableTh>
            <th scope="col">
              <span className="sr-only">{t('applicationsTable.actions')}</span>
            </th>
          </tr>
        </thead>
        <tbody ref={motion}>
          {rows.map((a) => {
            const days = waitedDays(a.submittedAt)
            return (
              <tr
                key={a.id}
                className="border-border-subtle border-t [&>td]:px-4 [&>td]:py-2"
              >
                <td>
                  <div className="text-fg-strong text-base font-semibold">
                    {a.name}
                    {a.isReapplication && (
                      <span className="text-fg-muted ml-2 text-sm font-normal">
                        · {t('applicationsTable.reapplication')}
                      </span>
                    )}
                  </div>
                  {/* The review API returns fields instead of the email */}
                  <div className="text-fg-muted">
                    {a.email ?? a.fields?.map(fieldLabel).join(', ')}
                  </div>
                </td>
                <td className="num text-right">{a.years}</td>
                <td>
                  {a.aiFlags > 0 ? (
                    <span className="text-warning inline-flex items-center gap-1.5">
                      <TriangleAlert size={14} aria-hidden="true" />
                      <span className="num">{a.aiFlags}</span>{' '}
                      {t('applicationsTable.aiFlags', { count: a.aiFlags })
                        .replace(String(a.aiFlags), '')
                        .trim()}
                    </span>
                  ) : a.screeningStatus === 'RUNNING' ? (
                    <span className="text-fg-muted">
                      {t('detail.aiScreening.runStatus.RUNNING')}
                    </span>
                  ) : (
                    <span className="text-fg-muted">
                      {t('applicationsTable.noNotes')}
                    </span>
                  )}
                </td>
                <td className="num text-right">{formatDate(a.submittedAt)}</td>
                <td className="text-right">
                  {isOverdue(days, slaDays) ? (
                    <span className="text-warning inline-flex items-center gap-1.5">
                      <TriangleAlert
                        size={14}
                        aria-label={t('applicationsTable.overdue')}
                      />
                      <span className="num">{days}</span>{' '}
                      {t('applicationsTable.days', { count: days })
                        .replace(String(days), '')
                        .trim()}
                    </span>
                  ) : (
                    <>
                      <span className="num">{days}</span>{' '}
                      {t('applicationsTable.days', { count: days })
                        .replace(String(days), '')
                        .trim()}
                    </>
                  )}
                </td>
                <td className="text-right">
                  <Link
                    to={`/admin/experts/${a.id}`}
                    aria-label={t('applicationsTable.viewLabel', {
                      name: a.name,
                    })}
                    className="btn btn-press btn-secondary no-underline"
                  >
                    {t('applicationsTable.view')}
                  </Link>
                </td>
              </tr>
            )
          })}
          {loading && <SkeletonRows cols={6} />}
          {!loading && rows.length === 0 && (
            <tr className="border-border-subtle border-t">
              <td colSpan={6} className="text-fg-muted px-4 py-10 text-center">
                {empty ?? (
                  <EmptyState title={t('applicationsTable.noApplications')} />
                )}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
      <TablePager
        paged={paged}
        onPrev={onPrev}
        onNext={onNext}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </section>
  )
}
