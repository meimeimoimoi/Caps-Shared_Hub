import { Link } from 'react-router-dom'
import { TriangleAlert } from 'lucide-react'
import type { Paged } from '@/lib/utils'
import { TablePager } from '@/components/ui/navigation/table-pager'
import type { ExpertApplication } from '../types'
import { SLA_DAYS, formatDate, waitedDays } from '../utils/applications'

import { useTranslation } from 'react-i18next'
import { useMotion } from '@/components/ui/motion'

interface ApplicationsTableProps {
  paged: Paged<ExpertApplication>
  onPrev: () => void
  onNext: () => void
  /** Chữ khi không có dòng nào, vd. đang tải hoặc lỗi */
  empty?: string
}

export function ApplicationsTable({
  paged,
  onPrev,
  onNext,
  empty,
}: ApplicationsTableProps) {
  const { t } = useTranslation('admin')
  const { rows, total } = paged
  const motion = useMotion<HTMLTableSectionElement>({
    preset: 'fade',
    replayKey: rows.map((row) => row.id).join(','),
  })
  return (
    <section className="paper mt-4 overflow-x-auto">
      <div className="text-fg-muted flex justify-between px-4 py-3 text-sm">
        <span>{t('applicationsTable.sortBy')}</span>
        <span>
          <span className="num">{total}</span>{' '}
          {t('applicationsTable.applicationCount')}
        </span>
      </div>
      <table className="w-full min-w-[760px] text-sm">
        <thead className="bg-sunken text-fg-muted">
          <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:font-semibold">
            <th className="text-left">
              {t('applicationsTable.table.applicant')}
            </th>
            <th className="text-right">
              {t('applicationsTable.table.experienceYears')}
            </th>
            <th className="text-left">
              {t('applicationsTable.table.aiScreening')}
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
                  </div>
                  <div className="text-fg-muted">{a.email}</div>
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
                  ) : (
                    <span className="text-fg-muted">
                      {t('applicationsTable.noNotes')}
                    </span>
                  )}
                </td>
                <td className="num text-right">{formatDate(a.submittedAt)}</td>
                <td className="text-right">
                  {days > SLA_DAYS ? (
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
          {rows.length === 0 && (
            <tr className="border-border-subtle border-t">
              <td colSpan={6} className="text-fg-muted px-4 py-10 text-center">
                {empty ?? t('applicationsTable.noApplications')}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <TablePager paged={paged} onPrev={onPrev} onNext={onNext} />
    </section>
  )
}
