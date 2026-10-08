import { useCallback, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CASE_STATUS } from '@/lib/constants'
import { CaseHeader } from '@/components/ui/layout/case-header'
import { StatusBadge } from '@/components/ui/display/status-badge'
import { Toast } from '@/components/ui/feedback/toast'
import { AdminLayout } from '@/app/layouts/admin/AdminLayout'
import { DisputeDecision } from '../../features/disputes-escrow/components/DisputeDecision'
import { HistoryTab } from '../../features/expert-vetting/components/HistoryTab'
import { DISPUTE_RESOLVED } from '../../features/disputes-escrow/constants'
import { disputeHoursLeft } from '../../features/disputes-escrow/utils/disputes'
import { useAdminNav } from '@/app/layouts/admin/useAdminNav'
import { useDispute } from '../../features/disputes-escrow/hooks/useDispute'

export default function AdminDisputeDetailPage() {
  const id = useParams().id!
  const { dispute, isLoading, decide } = useDispute(id)
  const nav = useAdminNav()
  const { t } = useTranslation(['admin', 'common'])
  const [now] = useState(() => Date.now())
  const [toast, setToast] = useState<string | null>(null)
  const clearToast = useCallback(() => setToast(null), [])

  const listLink = (
    <Link to="/admin/disputes" className="hover:text-fg-strong">
      {t('disputes.title')}
    </Link>
  )
  const layout = { ...nav, section: 'disputes' as const }

  if (!dispute) {
    return (
      <AdminLayout {...layout} breadcrumb={listLink}>
        <h1 className="text-h1-tool">
          {isLoading ? t('common:loading') : t('disputes.notFound', { id })}
        </h1>
        <Link
          to="/admin/disputes"
          className="text-accent-text mt-3 inline-block underline"
        >
          {t('disputes.back')}
        </Link>
      </AdminLayout>
    )
  }

  const { evidence, complaint } = dispute
  const hoursLeft = disputeHoursLeft(dispute.openedAt, now)

  return (
    <AdminLayout
      {...layout}
      breadcrumb={
        <>
          {listLink} <span aria-hidden="true">/</span>{' '}
          <span className="text-fg-strong num" aria-current="page">
            {dispute.id}
          </span>
        </>
      }
    >
      <div className="flex items-start justify-between gap-4">
        <CaseHeader
          code={dispute.id}
          title={t('disputes.caseTitle', { title: dispute.title })}
          meta={[
            [t('disputes.meta.client'), dispute.client],
            [t('disputes.meta.expert'), dispute.expert],
            [t('disputes.meta.ground'), dispute.ground],
          ]}
        />
        <StatusBadge
          status={
            dispute.resolvedAt
              ? { ...DISPUTE_RESOLVED, label: t(DISPUTE_RESOLVED.label) }
              : CASE_STATUS.DISPUTED
          }
        />
      </div>

      <div className="mt-6 grid items-start gap-4 md:gap-6 lg:grid-cols-[minmax(420px,1fr)_340px]">
        <div className="min-w-0 space-y-4 md:space-y-6">
          <section className="paper p-5 md:p-6">
            <h2 className="text-h2">{t('disputes.evidence')}</h2>
            <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <div className="bg-sunken rounded-surface p-3">
                <p className="text-fg-muted text-caption">
                  {evidence.draft.label}
                </p>
                <p className="mt-1">
                  {evidence.draft.text}
                  <del className="text-fg-muted">{evidence.draft.change}</del>
                </p>
              </div>
              <div className="bg-sunken rounded-surface p-3">
                <p className="text-fg-muted text-caption">
                  {evidence.revision.label}
                </p>
                <p className="mt-1">
                  {evidence.revision.text}
                  <ins className="text-revised">{evidence.revision.change}</ins>
                </p>
              </div>
            </div>
            <p className="text-fg-muted mt-3 text-sm">{evidence.note}</p>
          </section>

          <section className="paper p-5 md:p-6">
            <h2 className="text-h2">{t('disputes.complaint.title')}</h2>
            <dl className="divide-border-subtle mt-3 divide-y text-sm">
              {[
                [t('disputes.complaint.issue'), complaint.issue],
                [t('disputes.complaint.description'), complaint.description],
                [
                  t('disputes.complaint.attachment'),
                  // TODO(api): link tải file bằng chứng
                  <span key="file" className="underline underline-offset-4">
                    {complaint.attachment}
                  </span>,
                ],
              ].map(([label, value]) => (
                <div
                  key={label as string}
                  className="grid grid-cols-[110px_1fr] gap-3 py-2"
                >
                  <dt className="text-fg-muted">{label}</dt>
                  <dd className="text-fg-strong">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <HistoryTab
            title={t('disputes.auditLog')}
            history={dispute.history}
          />
        </div>

        <div className="lg:sticky lg:top-20">
          <DisputeDecision
            hoursLeft={hoursLeft}
            decided={!!dispute.resolvedAt}
            onDecide={(outcome, reason) =>
              decide({ outcome, reason })
                .then(() => setToast(t('disputes.decided')))
                .catch((e: Error) => setToast(e.message))
            }
          />
        </div>
      </div>

      {toast && <Toast message={toast} onDone={clearToast} />}
    </AdminLayout>
  )
}
