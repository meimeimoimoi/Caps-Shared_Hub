import { SortableTh } from '@/components/ui/navigation/sortable-th'
import type { TableSort } from '@/lib/table-sort'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Paged } from '@/lib/utils'
import { TablePager } from '@/components/ui/navigation/table-pager'
import type { QualificationRow } from '../types'
import { formatDate, waitedDays } from '../utils/applications'
import { useFieldLabel } from '../hooks/useLabels'
import { SkeletonRows } from '@/components/ui/display/skeleton-rows'

interface QualificationsTableProps {
  paged: Paged<QualificationRow>
  sort?: TableSort
  onSort?: (key: string) => void
  onPrev: () => void
  onNext: () => void
  onPageChange?: (page: number) => void
  onPageSizeChange?: (size: number) => void
  /** Text when there are no rows, e.g. loading or an error */
  empty?: ReactNode
  /** Shows skeleton rows while the queue loads */
  loading?: boolean
  /** Detail page path prefix, e.g. /admin/experts/qualifications */
  linkBase: string
}

/* Gate 2 queue: one row per Expert-Service qualification */
export function QualificationsTable({
  paged,
  sort,
  onSort,
  onPrev,
  onNext,
  onPageChange,
  onPageSizeChange,
  empty,
  loading = false,
  linkBase,
}: QualificationsTableProps) {
  const { t } = useTranslation('admin')
  const fieldLabel = useFieldLabel()
  const { rows, total } = paged
  return (
    <section className="paper mt-4">
      <div className="text-fg-muted flex justify-between px-4 py-3 text-sm">
        <span>{sort && sort.key !== 'queue' ? t('qualifications.caption') : t('applicationsTable.sortBy')}</span>
        <span>
          <span className="num">{total}</span>{' '}
          {t('qualifications.count')}
        </span>
      </div>
      <div className="overflow-x-auto">
      <table className="w-full min-w-180 text-sm">
        <caption className="sr-only">{t('qualifications.caption')}</caption>
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
            <th scope="col" className="text-left">{t('qualifications.service')}</th>
            <SortableTh
              className="text-right"
              column="years"
              sort={sort}
              onSort={onSort}
            >
              {t('applicationsTable.table.experienceYears')}
            </SortableTh>
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
        <tbody>
          {rows.map((q) => {
            const days = waitedDays(q.submittedAt)
            return (
              <tr
                key={q.id}
                className={`border-border-subtle border-t [&>td]:px-4 [&>td]:py-2 ${q.finalApprovalOverdue ? 'bg-danger/5' : ''}`}
              >
                <td>
                  <div className="text-fg-strong text-base font-semibold">
                    {q.name}
                    {q.isReapplication && (
                      <span className="text-fg-muted ml-2 text-sm font-normal">
                        · {t('applicationsTable.reapplication')}
                      </span>
                    )}
                  </div>
                  <div className="text-fg-muted">
                    {q.fields.map(fieldLabel).join(', ')}
                  </div>
                </td>
                <td>{q.serviceName ?? q.serviceCode}</td>
                <td className="num text-right">{q.years}</td>
                <td className="num text-right">{formatDate(q.submittedAt)}</td>
                <td className="text-right">
                  {t('applicationsTable.days', { count: days })}
                  {/* Final approval rows show their due date; overdue ones are red and listed first */}
                  {q.finalApprovalDueAt && (
                    <div
                      className={
                        q.finalApprovalOverdue
                          ? 'text-danger font-semibold'
                          : 'text-fg-muted'
                      }
                    >
                      {q.finalApprovalOverdue
                        ? `${t('finalApproval.overdue')} · `
                        : ''}
                      {t('finalApproval.dueOn', {
                        date: formatDate(q.finalApprovalDueAt),
                      })}
                    </div>
                  )}
                </td>
                <td className="text-right">
                  <Link
                    to={`${linkBase}/${q.id}`}
                    aria-label={t('applicationsTable.viewLabel', {
                      name: q.name,
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
                {empty ?? t('qualifications.empty')}
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
