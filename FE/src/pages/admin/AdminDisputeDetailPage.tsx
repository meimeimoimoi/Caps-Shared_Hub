import { useCallback, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CaseHeader } from '@/components/ui/layout/case-header'
import { StatusBadge } from '@/components/ui/display/status-badge'
import { Toast } from '@/components/ui/feedback/toast'
import { AdminLayout } from '@/app/layouts/admin/AdminLayout'
import { DisputeDecision } from '../../features/disputes-escrow/components/DisputeDecision'
import { HistoryTab } from '../../features/expert-vetting/components/HistoryTab'
import { DISPUTE_RESOLVED } from '../../features/disputes-escrow/constants'
import {
  disputeBadgeKey,
  disputeHoursLeft,
  disputeSlaHours,
} from '../../features/disputes-escrow/utils/disputes'
import { useAdminNav } from '@/app/layouts/admin/useAdminNav'
import { useDispute } from '../../features/disputes-escrow/hooks/useDispute'
import { OperationsUnavailable } from '@/features/disputes-escrow/components/OperationsUnavailable'
import { LoadError } from '@/components/ui/feedback/load-error'
import { formatVnd } from '@/lib/format-money'
import { CaseAttachments } from '@/features/review-case/components/CaseAttachments'

export default function AdminDisputeDetailPage() {
  const id = useParams().id!
  const nav = useAdminNav()
  const { dispute, isLoading, error, decide, escalate } = useDispute(
    id,
    !nav.disputesUnavailable
  )
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

  // Deep links from bookmarks or the bell land here too: same honest state as the list
  if (nav.disputesUnavailable) {
    return (
      <AdminLayout {...layout} breadcrumb={listLink}>
        <h1 className="text-h1">{t('disputes.title')}</h1>
        <OperationsUnavailable area="disputes" />
      </AdminLayout>
    )
  }

  if (!dispute) {
    return (
      <AdminLayout {...layout} breadcrumb={listLink}>
        <h1 className="text-h1" aria-live="polite">
          {isLoading
            ? t('common:loading')
            : error
              ? t('disputes.title')
              : t('disputes.notFound', { id })}
        </h1>
        {error && <LoadError error={error} className="paper mt-6 px-4 py-8" />}
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
  const hoursLeft = disputeHoursLeft(dispute, now)
  const code = dispute.code ?? dispute.id
  // The server sends the client's email and the expert's name; the title is still demo-only
  const meta = (
    [
      [t('disputes.meta.kind'), t(`disputes.kind.${dispute.kind}`)],
      [t('disputes.meta.client'), dispute.client],
      [t('disputes.meta.expert'), dispute.expert],
      [t('disputes.meta.ground'), dispute.ground],
      [
        t('disputes.meta.fee'),
        dispute.fee == null ? undefined : formatVnd(dispute.fee),
      ],
      [
        t('disputes.meta.platformFee'),
        dispute.platformFeePct == null
          ? undefined
          : `${dispute.platformFeePct}%`,
      ],
    ] as [string, string | undefined][]
  ).filter((row): row is [string, string] => !!row[1])

  return (
    <AdminLayout
      {...layout}
      breadcrumb={
        <>
          {listLink} <span aria-hidden="true">/</span>{' '}
          <span className="text-fg-strong num" aria-current="page">
            {code}
          </span>
        </>
      }
    >
      <div className="flex items-start justify-between gap-4">
        <CaseHeader
          code={code}
          title={t('disputes.caseTitle', {
            title: dispute.title ?? t(`disputes.kind.${dispute.kind}`),
          })}
          meta={meta}
        />
        <StatusBadge
          status={
            dispute.resolvedAt
              ? { ...DISPUTE_RESOLVED, label: t(DISPUTE_RESOLVED.label) }
              : { label: t(disputeBadgeKey(dispute)), tone: 'warning' }
          }
        />
      </div>

      <div className="mt-6 grid items-start gap-4 md:gap-6 lg:grid-cols-[minmax(420px,1fr)_340px]">
        <div className="min-w-0 space-y-4 md:space-y-6">
          {evidence && (
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
                    <ins className="text-revised">
                      {evidence.revision.change}
                    </ins>
                  </p>
                </div>
              </div>
              <p className="text-fg-muted mt-3 text-sm">{evidence.note}</p>
            </section>
          )}

          <section className="paper p-5 md:p-6">
            <h2 className="text-h2">{t('disputes.complaint.title')}</h2>
            <dl className="divide-border-subtle mt-3 divide-y text-sm">
              {[
                [t('disputes.complaint.issue'), complaint.issue],
                [t('disputes.complaint.description'), complaint.description],
                // TODO(api): download links for the case files (admin attachments endpoint)
                ...(complaint.attachment
                  ? [
                      [
                        t('disputes.complaint.attachment'),
                        <span
                          key="file"
                          className="underline underline-offset-4"
                        >
                          {complaint.attachment}
                        </span>,
                      ],
                    ]
                  : []),
              ].map(([label, value]) => (
                <div
                  key={label as string}
                  className="grid grid-cols-[110px_1fr] gap-3 py-2"
                >
                  <dt className="text-fg-muted">{label}</dt>
                  <dd className="text-fg-strong break-words whitespace-pre-wrap">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Both sides of the complaint: the expert's reply and what was delivered */}
          {dispute.decideBy && (
            <section className="paper p-5 md:p-6">
              <h2 className="text-h2">{t('disputes.expertSide.title')}</h2>
              <dl className="divide-border-subtle mt-3 divide-y text-sm">
                {[
                  [
                    t('disputes.expertSide.statement'),
                    dispute.expertStatement ??
                      t('disputes.expertSide.noStatement'),
                  ],
                  [
                    t('disputes.expertSide.summary'),
                    dispute.reviewSummary ?? t('disputes.expertSide.noSummary'),
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="grid grid-cols-[110px_1fr] gap-3 py-2"
                  >
                    <dt className="text-fg-muted">{label}</dt>
                    <dd className="text-fg-strong break-words whitespace-pre-wrap">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {/* A real case: the files both parties added and the document under review */}
          {dispute.decideBy && (
            <CaseAttachments caseId={dispute.id} scope="admin" />
          )}

          {dispute.history.length > 0 && (
            <HistoryTab
              title={t('disputes.auditLog')}
              history={dispute.history}
            />
          )}
        </div>

        <div className="lg:sticky lg:top-20">
          <DisputeDecision
            hoursLeft={hoursLeft}
            slaHours={disputeSlaHours(dispute)}
            decided={!!dispute.resolvedAt}
            escalated={!!dispute.escalatedAt}
            onEscalate={() =>
              escalate().then(() => setToast(t('disputes.escalation.toast')))
            }
            onDecide={(outcome, reason, refundPct) =>
              decide({ outcome, reason, refundPct }).then(() =>
                setToast(t('disputes.decided'))
              )
            }
          />
        </div>
      </div>

      {toast && <Toast message={toast} onDone={clearToast} />}
    </AdminLayout>
  )
}
