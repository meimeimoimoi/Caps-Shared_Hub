import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Paged } from '@/lib/utils'
import { TablePager } from '@/components/ui/navigation/table-pager'
import type { QualificationRow } from '../types'
import { formatDate, waitedDays } from '../utils/applications'
import { useFieldLabel } from '../hooks/useLabels'

interface QualificationsTableProps {
  paged: Paged<QualificationRow>
  onPrev: () => void
  onNext: () => void
  /** Text when there are no rows, e.g. loading or an error */
  empty?: string
  /** Detail page path prefix, e.g. /admin/experts/qualifications */
  linkBase: string
}

/* Gate 2 queue: one row per Expert-Service qualification */
export function QualificationsTable({
  paged,
  onPrev,
  onNext,
  empty,
  linkBase,
}: QualificationsTableProps) {
  const { t } = useTranslation('admin')
  const fieldLabel = useFieldLabel()
  const { rows, total } = paged
  return (
    <section className="paper mt-4 overflow-x-auto">
      <div className="text-fg-muted flex justify-between px-4 py-3 text-sm">
        <span>{t('applicationsTable.sortBy')}</span>
        <span>
          <span className="num">{total}</span>{' '}
          {t('qualifications.count')}
        </span>
      </div>
      <table className="w-full min-w-[720px] text-sm">
        <thead className="bg-sunken text-fg-muted">
          <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:font-semibold">
            <th className="text-left">
              {t('applicationsTable.table.applicant')}
            </th>
            <th className="text-left">{t('qualifications.service')}</th>
            <th className="text-right">
              {t('applicationsTable.table.experienceYears')}
            </th>
            <th className="text-right">
              {t('applicationsTable.table.submittedAt')}
            </th>
            <th className="text-right">
              {t('applicationsTable.table.waited')}
            </th>
            <th>
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
                className="border-border-subtle border-t [&>td]:px-4 [&>td]:py-2"
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
          {rows.length === 0 && (
            <tr className="border-border-subtle border-t">
              <td colSpan={6} className="text-fg-muted px-4 py-10 text-center">
                {empty ?? t('qualifications.empty')}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <TablePager paged={paged} onPrev={onPrev} onNext={onNext} />
    </section>
  )
}
