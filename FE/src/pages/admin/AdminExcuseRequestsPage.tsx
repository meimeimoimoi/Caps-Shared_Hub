import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AdminLayout } from '@/app/layouts/admin/AdminLayout'
import { useAdminNav } from '@/app/layouts/admin/useAdminNav'
import { PageHeader } from '@/components/ui/layout/page-header'
import { LoadError } from '@/components/ui/feedback/load-error'
import { SkeletonRows } from '@/components/ui/display/skeleton-rows'
import {
  declineExcuse,
  excuseViolation,
  getExcuseRequests,
} from '@/features/expert-vetting/api/adminApi'
import { adminKeys } from '@/features/expert-vetting/api/queryKeys'
import { ExcuseDialog } from '@/features/expert-vetting/components/ExpertViolationsSection'
import { ExcuseFiles } from '@/features/expert-vetting/components/ExcuseFiles'
import type { ExcuseRequest } from '@/features/expert-vetting/types'
import { foldVietnamese, formatDateTime } from '@/features/expert-vetting/utils/applications'

/** Force-majeure excuse requests from experts, oldest first: read the reason and evidence, then excuse or decline. */
export default function AdminExcuseRequestsPage() {
  const nav = useAdminNav()
  const { t } = useTranslation('admin')
  const qc = useQueryClient()
  const requests = useQuery({
    queryKey: adminKeys.excuseRequests(),
    queryFn: ({ signal }) => getExcuseRequests(signal),
  })
  const [excusing, setExcusing] = useState<ExcuseRequest | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [query, setQuery] = useState('')

  // Both decisions take the request off the queue and change the expert's points shown elsewhere
  const refresh = (r: ExcuseRequest) =>
    Promise.all([
      qc.invalidateQueries({ queryKey: adminKeys.excuseRequests() }),
      qc.invalidateQueries({ queryKey: adminKeys.violations(r.expertProfileId) }),
    ])

  const decline = async (r: ExcuseRequest) => {
    setBusy(r.violation.reviewCaseId)
    setFailed(false)
    try {
      await declineExcuse(r.expertProfileId, r.violation.reviewCaseId)
      await refresh(r)
    } catch {
      setFailed(true)
    } finally {
      setBusy(null)
    }
  }

  const all = requests.data ?? []
  // Short queue: filter here by expert name, email or case code (what the email and the drawer show)
  const q = foldVietnamese(query.trim())
  const rows = q
    ? all.filter((r) =>
        [r.expertName ?? '', r.expertEmail ?? '', r.violation.reviewCaseId.slice(0, 8)].some((text) =>
          foldVietnamese(text).includes(q)
        )
      )
    : all

  return (
    <AdminLayout
      {...nav}
      section="excuseRequests"
      breadcrumb={t('navigation.excuseRequests')}
      search={query}
      searchLabel={t('excuseRequests.search')}
      onSearchChange={setQuery}
    >
      <PageHeader
        title={t('excuseRequests.title')}
        help={t('excuseRequests.help')}
        helpLabel={t('excuseRequests.title')}
        badge={
          requests.data && (
            <span className="text-fg-muted num text-sm">
              {t('excuseRequests.count', { count: all.length })}
            </span>
          )
        }
      />
      {failed && (
        <p role="alert" className="text-danger mt-4 text-sm">
          {t('experts.violations.failed')}
        </p>
      )}

      <section className="bg-paper border-border-subtle mt-8 overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="text-fg-muted border-border-subtle border-b text-xs">
            <tr>
              <th className="px-4 py-3 font-medium">{t('excuseRequests.expert')}</th>
              <th className="px-4 py-3 font-medium">{t('excuseRequests.violation')}</th>
              <th className="px-4 py-3 font-medium">{t('excuseRequests.request')}</th>
              <th className="px-4 py-3 font-medium">{t('excuseRequests.requestedAt')}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-border-subtle divide-y">
            {rows.map((r) => {
              const v = r.violation
              return (
                <tr key={v.reviewCaseId} className="align-top">
                  <td className="px-4 py-3">
                    <p className="text-fg-strong font-semibold">{r.expertName ?? '—'}</p>
                    <p className="text-fg-muted text-xs">{r.expertEmail}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-fg-strong">
                      {t(`experts.violations.kind.${v.kind}`)}{' '}
                      <span className="num">{t('experts.violations.plus', { count: v.points })}</span>
                    </p>
                    <p className="text-fg-muted num text-xs">
                      {t('experts.violations.case', { id: v.reviewCaseId.slice(0, 8).toUpperCase() })}
                      {' · '}
                      {formatDateTime(v.occurredAt)}
                    </p>
                  </td>
                  <td className="max-w-md px-4 py-3">
                    <p className="text-fg break-words whitespace-pre-wrap">{v.excuseRequest}</p>
                    <ExcuseFiles
                      expertId={r.expertProfileId}
                      reviewCaseId={v.reviewCaseId}
                      files={v.excuseFiles}
                    />
                  </td>
                  <td className="text-fg-muted num px-4 py-3 text-xs whitespace-nowrap">
                    {v.excuseRequestedAt && formatDateTime(v.excuseRequestedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        disabled={busy === v.reviewCaseId}
                        onClick={() => setExcusing(r)}
                        className="btn btn-press btn-primary disabled:opacity-60"
                      >
                        {t('experts.violations.excuse')}
                      </button>
                      <button
                        type="button"
                        disabled={busy === v.reviewCaseId}
                        onClick={() => void decline(r)}
                        className="btn btn-press btn-secondary disabled:opacity-60"
                      >
                        {t('experts.violations.decline')}
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {requests.isLoading && <SkeletonRows cols={5} />}
            {!requests.isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={5} className="text-fg-muted px-4 py-10 text-center">
                  {requests.isError ? (
                    <LoadError />
                  ) : all.length > 0 ? (
                    t('excuseRequests.noResults')
                  ) : (
                    t('excuseRequests.empty')
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {excusing && (
        <ExcuseDialog
          violation={excusing.violation}
          onConfirm={async (reason) => {
            await excuseViolation(excusing.expertProfileId, excusing.violation.reviewCaseId, reason)
            await refresh(excusing)
          }}
          onClose={() => setExcusing(null)}
        />
      )}
    </AdminLayout>
  )
}
