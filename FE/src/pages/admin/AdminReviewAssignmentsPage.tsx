import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ListFilter, UserRound } from 'lucide-react'
import { ApiError } from '@/lib/api-client'
import { APPLICATION_STATUS, QUALIFICATION_STATUS } from '@/lib/constants'
import { AdminLayout } from '@/app/layouts/admin/AdminLayout'
import { useAdminNav } from '@/app/layouts/admin/useAdminNav'
import { CustomSelect } from '@/components/ui/forms/custom-select'
import { HelpTip } from '@/components/ui/feedback/help-tip'
import { Toast } from '@/components/ui/feedback/toast'
import { StatusBadge } from '@/components/ui/display/status-badge'
import { Pagination } from '@/components/ui/navigation/pagination'
import { reassignReview, searchAssignments } from '../../features/expert-vetting/api/assignmentApi'
import { adminKeys } from '../../features/expert-vetting/api/queryKeys'
import type { ClaimFilter, ReviewQueueRow } from '../../features/expert-vetting/api/reviewQueueApi'
import { ReassignDialog } from '../../features/expert-vetting/components/ReassignDialog'
import { formatDate, formatDateTime } from '../../features/expert-vetting/utils/applications'

// Open reviews of both gates: waiting for a reviewer or for the expert's supplement
const GATES = {
  ALL: {
    applicationStatuses: ['SUBMITTED', 'NEED_MORE_INFORMATION'],
    qualificationStatuses: ['COMPETENCY_REVIEW', 'NEED_MORE_INFORMATION'],
  },
  GATE_1: { applicationStatuses: ['SUBMITTED', 'NEED_MORE_INFORMATION'], qualificationStatuses: [] },
  GATE_2: { applicationStatuses: [], qualificationStatuses: ['COMPETENCY_REVIEW', 'NEED_MORE_INFORMATION'] },
} as const
type GateFilter = keyof typeof GATES
const CLAIMS = ['ALL', 'UNCLAIMED'] as const

const REASSIGN_ERRORS = [
  'CLAIM_REASSIGN_REASON_REQUIRED',
  'CLAIM_REASSIGN_REASON_TOO_LONG',
  'REVIEWER_NOT_FOUND',
  'SELF_REVIEW_NOT_ALLOWED',
  'APPLICATION_NOT_IN_REVIEW',
  'QUALIFICATION_NOT_IN_REVIEW',
] as const
type ReassignError = (typeof REASSIGN_ERRORS)[number]
const isReassignError = (code?: string): code is ReassignError =>
  (REASSIGN_ERRORS as readonly (string | undefined)[]).includes(code)

/** System Admin: who works on each open Gate 1 and Gate 2 review, and handing a review to another reviewer */
export default function AdminReviewAssignmentsPage() {
  const nav = useAdminNav()
  const { t } = useTranslation(['admin', 'common'])
  const qc = useQueryClient()
  const [gate, setGate] = useState<GateFilter>('ALL')
  const [claim, setClaim] = useState<ClaimFilter>('ALL')
  const [paging, setPaging] = useState({ key: '', page: 1, pageSize: 10 })
  const filterKey = `${gate}:${claim}`
  const page = paging.key === filterKey ? paging.page : 1
  const [target, setTarget] = useState<ReviewQueueRow | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const clearToast = useCallback(() => setToast(null), [])

  const params = { ...GATES[gate], search: '', page, pageSize: paging.pageSize, claim }
  const list = useQuery({
    queryKey: adminKeys.queue('assignment', params),
    queryFn: ({ signal }) => searchAssignments(params, signal),
    placeholderData: keepPreviousData,
  })
  const reassign = useMutation({
    mutationFn: (input: { row: ReviewQueueRow; reviewerUserId: string; reason: string }) =>
      reassignReview(input.row.gate, input.row.id, {
        reviewerUserId: input.reviewerUserId,
        reason: input.reason,
      }),
    onSuccess: async () => {
      setTarget(null)
      setToast(t('admin:assignments.done'))
      await qc.invalidateQueries({ queryKey: adminKeys.queueAll() })
    },
    onError: (e: unknown) =>
      setToast(
        e instanceof ApiError && isReassignError(e.code)
          ? t(`admin:assignments.errors.${e.code}`)
          : t('admin:assignments.errors.failed')
      ),
  })

  const rows = list.data?.items ?? []
  const total = list.data?.total ?? 0
  const status = (row: ReviewQueueRow) =>
    row.gate === 'GATE_1'
      ? APPLICATION_STATUS[row.status as keyof typeof APPLICATION_STATUS]
      : QUALIFICATION_STATUS[row.status as keyof typeof QUALIFICATION_STATUS]
  const name = (row: ReviewQueueRow) => row.displayName ?? row.applicantUserId.slice(0, 8)

  return (
    <AdminLayout {...nav} section="assignments" breadcrumb={t('admin:navigation.assignments')}>
      <div className="flex items-center gap-2">
        <h1 className="text-h1">{t('admin:assignments.title')}</h1>
        <HelpTip label={t('admin:assignments.helpLabel')}>{t('admin:assignments.help')}</HelpTip>
      </div>

      <div className="mt-10 mb-4 flex flex-wrap gap-2">
        <CustomSelect
          label={t('admin:assignments.gateFilter')}
          value={gate}
          options={(Object.keys(GATES) as GateFilter[]).map((value) => ({
            value,
            label: t(`admin:assignments.gates.${value}`),
          }))}
          onChange={(value) => setGate(value as GateFilter)}
          triggerLeading={<ListFilter size={14} aria-hidden="true" className="text-text-muted" />}
          className="inline-flex min-w-0 flex-col items-start text-xs [&>span]:sr-only"
          triggerClassName="!h-9 !min-h-9 !w-auto !gap-2 !rounded-md !px-3 !py-0 text-sm !shadow-none"
        />
        <CustomSelect
          label={t('admin:assignments.claimFilter')}
          value={claim}
          options={CLAIMS.map((value) => ({ value, label: t(`admin:assignments.claims.${value}`) }))}
          onChange={(value) => setClaim(value as ClaimFilter)}
          triggerLeading={<UserRound size={14} aria-hidden="true" className="text-text-muted" />}
          className="inline-flex min-w-0 flex-col items-start text-xs [&>span]:sr-only"
          triggerClassName="!h-9 !min-h-9 !w-auto !gap-2 !rounded-md !px-3 !py-0 text-sm !shadow-none"
        />
      </div>

      <div className="paper overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="text-fg-muted text-left">
            <tr className="border-border border-b">
              <th className="px-4 py-3 font-medium">{t('admin:assignments.columns.expert')}</th>
              <th className="px-4 py-3 font-medium">{t('admin:assignments.columns.gate')}</th>
              <th className="px-4 py-3 font-medium">{t('admin:assignments.columns.submitted')}</th>
              <th className="px-4 py-3 font-medium">{t('admin:assignments.columns.status')}</th>
              <th className="px-4 py-3 font-medium">{t('admin:assignments.columns.holder')}</th>
              <th className="px-4 py-3">
                <span className="sr-only">{t('admin:assignments.columns.actions')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.gate}:${row.id}`} className="border-border border-b last:border-b-0">
                <td className="text-fg-strong px-4 py-3 font-medium">{name(row)}</td>
                <td className="px-4 py-3">
                  {t(`admin:assignments.gates.${row.gate}`)}
                  {row.serviceName ? ` · ${row.serviceName}` : ''}
                </td>
                <td className="px-4 py-3 tabular-nums">{row.submittedAt ? formatDate(row.submittedAt) : '—'}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={status(row)} />
                </td>
                <td className="px-4 py-3">
                  {row.claimedByUserId ? (
                    <>
                      <span className="text-fg-strong block">{row.claimedByEmail ?? row.claimedByUserId.slice(0, 8)}</span>
                      <span className="text-fg-muted block text-xs tabular-nums">
                        {row.claimExpiresAt
                          ? t('admin:assignments.until', { time: formatDateTime(row.claimExpiresAt) })
                          : t('admin:claim.waitingForExpert')}
                      </span>
                    </>
                  ) : (
                    <span className="text-fg-muted">{t('admin:claim.free')}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => setTarget(row)}
                    aria-label={`${t('admin:assignments.reassign')}: ${name(row)}`}
                    className="btn btn-press btn-secondary whitespace-nowrap"
                  >
                    {t('admin:assignments.reassign')}
                  </button>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={6} className="text-fg-muted px-4 py-8 text-center">
                  {list.isLoading ? t('common:loading') : (list.error?.message ?? t('admin:assignments.empty'))}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {total > 0 && (
        <div className="mt-3">
          <Pagination
            page={page}
            pageSize={paging.pageSize}
            total={total}
            onPageChange={(value) => setPaging({ ...paging, key: filterKey, page: value })}
            onPageSizeChange={(size) => setPaging({ key: filterKey, page: 1, pageSize: size })}
            pageSizeOptions={[10, 20, 50]}
            label={t('admin:assignments.pagination')}
          />
        </div>
      )}

      {target && (
        <ReassignDialog
          expertName={name(target)}
          currentHolderId={target.claimedByUserId ?? null}
          submitting={reassign.isPending}
          onCancel={() => setTarget(null)}
          onConfirm={(reviewerUserId, reason) => reassign.mutate({ row: target, reviewerUserId, reason })}
        />
      )}
      {toast && <Toast message={toast} onDone={clearToast} />}
    </AdminLayout>
  )
}
