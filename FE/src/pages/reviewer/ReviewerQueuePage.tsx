import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'
import { useReviewer, ReviewStatusBadge } from '@/features/reviewer'
import { CustomSelect } from '@/components/ui/forms/custom-select'
import { Pagination } from '@/components/ui/navigation/pagination'
import { Button } from '@/components/ui/actions/button'
import { useFormatters } from '@/hooks/useFormatters'

export default function ReviewerQueuePage() {
  const { t } = useTranslation('reviewer')
  const { state, query, setQuery, actor } = useReviewer()
  const format = useFormatters()
  const [params, setParams] = useSearchParams()
  const gate = params.get('gate') ?? 'ALL'
  const [status, setStatus] = useState('OPEN')
  const [paging, setPaging] = useState({ key: '', page: 1 })
  const filterKey = `${query}:${gate}:${status}`
  const filtered = state.records.filter(
    (row) =>
      row.assignedTo === actor.id &&
      (gate === 'ALL' || gate === row.gate) &&
      (status === 'ALL' ||
        ['PENDING_REVIEW', 'NEED_MORE_INFORMATION'].includes(row.status)) &&
      `${row.name} ${row.id} ${row.applicationId} ${row.serviceLabel}`
        .toLocaleLowerCase()
        .includes(query.trim().toLocaleLowerCase())
  )
  const page = Math.min(
    paging.key === filterKey ? paging.page : 1,
    Math.max(1, Math.ceil(filtered.length / 5))
  )
  const clear = () => {
    setQuery('')
    setParams({})
    setStatus('OPEN')
  }
  return (
    <>
      <div className="mb-8 max-w-3xl">
        <h1 className="text-text-strong text-3xl font-semibold tracking-tight">
          {t('queue')}
        </h1>
        <p className="text-text-muted mt-3 leading-relaxed">
          {t('queueIntro')}
        </p>
      </div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <p className="text-text-muted text-sm">
          {t('assignedCount', { count: filtered.length })}
        </p>
        <div className="flex flex-wrap gap-3">
          <CustomSelect
            label={t('gateFilter')}
            value={gate}
            options={[
              { value: 'ALL', label: t('allGates') },
              { value: 'GATE_1', label: t('gate1') },
              { value: 'GATE_2', label: t('gate2') },
            ]}
            onChange={(value) =>
              setParams(value === 'ALL' ? {} : { gate: value })
            }
            className="flex flex-col gap-2 text-sm"
            triggerClassName="!w-56 max-w-full"
          />
          <CustomSelect
            label={t('statusFilter')}
            value={status}
            options={[
              { value: 'OPEN', label: t('openOnly') },
              { value: 'ALL', label: t('allStatuses') },
            ]}
            onChange={setStatus}
            className="flex flex-col gap-2 text-sm"
            triggerClassName="!w-48 max-w-full"
          />
        </div>
      </div>
      <div className="border-border bg-surface overflow-hidden rounded-xl border">
        {filtered.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-surface-muted text-text-muted">
                <tr>
                  {(['applicant', 'scope', 'submitted', 'status'] as const).map(
                    (key) => (
                      <th
                        key={key}
                        scope="col"
                        className="px-5 py-3 font-medium"
                      >
                        {t(key)}
                      </th>
                    )
                  )}
                  <th scope="col">
                    <span className="sr-only">{t('openReview')}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {filtered.slice((page - 1) * 5, page * 5).map((row) => (
                  <tr key={row.id} className="hover:bg-surface-muted">
                    <td className="px-5 py-5">
                      <p className="text-text-strong font-semibold">
                        {row.name}
                      </p>
                      <p className="text-text-muted mt-1 text-xs">
                        {row.applicationId} · {row.id}
                      </p>
                    </td>
                    <td className="px-5 py-5">
                      <p>{t(row.gate === 'GATE_1' ? 'gate1' : 'gate2')}</p>
                      <p className="text-text-muted mt-1 max-w-52 text-xs">
                        {row.gate === 'GATE_1'
                          ? t('expertScope')
                          : row.serviceLabel}
                      </p>
                    </td>
                    <td className="text-text-muted px-5 py-5 whitespace-nowrap">
                      {format.timestamp(row.submittedAt, 'Asia/Bangkok', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td className="px-5 py-5">
                      <ReviewStatusBadge status={row.status} />
                    </td>
                    <td className="px-5 py-5">
                      <Link
                        to={`/reviewer/${row.gate === 'GATE_1' ? 'gate-1' : 'gate-2'}/${row.id}`}
                        className="text-accent-text inline-flex min-h-11 items-center gap-2 font-medium whitespace-nowrap"
                      >
                        {t(
                          ['PENDING_REVIEW', 'NEED_MORE_INFORMATION'].includes(
                            row.status
                          )
                            ? 'openReview'
                            : 'viewReview'
                        )}
                        <ArrowRight size={16} aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center">
            <h2 className="text-text-strong text-lg font-semibold">
              {t('noReviews')}
            </h2>
            <p className="text-text-muted mt-2">{t('noReviewsBody')}</p>
            <Button variant="outline" className="mt-5 min-h-11" onClick={clear}>
              {t('clearFilters')}
            </Button>
          </div>
        )}
        <Pagination
          page={page}
          pageSize={5}
          total={filtered.length}
          onPageChange={(value) => setPaging({ key: filterKey, page: value })}
        />
      </div>
    </>
  )
}
