import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate } from 'react-router-dom'
import { ArrowLeft, CircleAlert, SearchX } from 'lucide-react'
import { DecisionBar } from '@/components/ui/actions/decision-bar'
import { Toast } from '@/components/ui/feedback/toast'
import { CaseHeader } from '@/components/ui/layout/case-header'
import { useAuthStore } from '@/features/auth'
import { openCaseDispute, reviewCaseActions } from '../api/reviewCaseApi'
import { useCaseError, useCaseRun, useLiveCase } from '../hooks/useReviewCases'
import { ExtensionStatus } from './CaseExtension'
import type { CaseStatus } from '../types'
import { useCaseFormat } from '../ui'
import { CaseAside } from './CaseAside'
import { CaseAttachments } from './CaseAttachments'
import { RevisedContentView } from './RevisedContentView'
import { CaseChat } from './CaseChat'
import { AcceptDialog, EarlyCancelDialog, ReportDialog } from './CaseDialogs'
import { CasePanel, type PanelActions } from './CasePanel'
import { ReviewResultView } from './ReviewResultView'
import { SettlementReceipt } from './SettlementReceipt'

// The client pays first, then the expert answers: the reverse of the demo's order
const RAIL = ['payment', 'accept', 'review', 'acceptance'] as const
const RAIL_STEP: Partial<Record<CaseStatus, number>> = {
  AWAITING_PAYMENT: 0,
  CANCELLED_UNPAID: 0,
  PENDING_EXPERT_RESPONSE: 1,
  DECLINED_BY_EXPERT: 1,
  EXPERT_RESPONSE_TIMEOUT: 1,
  WITHDRAWN: 1,
  IN_REVIEW: 2,
  AWAITING_USER_INFORMATION: 2,
  TERMINATED: 2,
  AWAITING_ACCEPTANCE: 3,
  DISPUTED: 3,
  COMPLETED: 4,
  RESOLVED: 4,
}
const CHAT_STATUSES: CaseStatus[] = [
  'IN_REVIEW',
  'AWAITING_USER_INFORMATION',
  'AWAITING_ACCEPTANCE',
]
const UPLOAD_STATUSES: CaseStatus[] = [...CHAT_STATUSES, 'DISPUTED']

/** The client's page of a real case: every action goes to the workflow API. */
export function LiveCaseView({ caseId }: { caseId: string }) {
  const { t } = useTranslation(['reviewCase', 'common'])
  const f = useCaseFormat()
  const userId = useAuthStore((s) => s.user?.id)
  const {
    dto,
    view: c,
    isPending,
    notFound,
    isError,
    refetch,
  } = useLiveCase(caseId)
  const { run, busy } = useCaseRun()
  const toMessage = useCaseError()
  const [dialog, setDialog] = useState<
    'accept' | 'earlyCancel' | 'report' | null
  >(null)
  const [toast, setToast] = useState<string | null>(null)
  const expire = useCallback(() => void refetch(), [refetch])

  useEffect(() => {
    document.title = `${c?.code ?? t('pageTitle')} | Shared Hub`
  }, [c?.code, t])

  if (isPending)
    return (
      <div role="status" aria-label={t('common:loading')} className="space-y-4">
        <span className="bg-sunken block h-8 w-1/3 rounded motion-safe:animate-pulse" />
        <span className="bg-sunken block h-48 w-full rounded motion-safe:animate-pulse" />
      </div>
    )

  if (!c || !dto)
    return (
      <div className="paper mx-auto max-w-lg p-8 text-center">
        {notFound || !isError ? (
          <SearchX
            size={28}
            aria-hidden="true"
            className="text-fg-muted mx-auto"
          />
        ) : (
          <CircleAlert
            size={28}
            aria-hidden="true"
            className="text-danger mx-auto"
          />
        )}
        <h1 className="text-h2 mt-4 font-serif">
          {notFound ? t('notFound.title') : t('errors.failed')}
        </h1>
        {notFound && <p className="text-fg-muted mt-2">{t('notFound.body')}</p>}
        <div className="mt-6 flex justify-center gap-2">
          {!notFound && (
            <button
              type="button"
              onClick={expire}
              className="btn btn-secondary"
            >
              {t('retry')}
            </button>
          )}
          <Link to="/cases" className="btn btn-secondary">
            {t('nav.cases')}
          </Link>
        </div>
      </div>
    )

  // A notification or a shared link can bring the case's expert here
  if (dto.requesterUserId !== userId)
    return <Navigate to={`/expert/cases/${caseId}`} replace />

  const perform = (
    action: () => Promise<unknown>,
    toastKey:
      | 'paid'
      | 'answered'
      | 'accepted'
      | 'disputed'
      | 'withdrawn'
      | 'rated'
      | 'cancelledEarly'
      | 'disputeWithdrawn'
      | 'extensionAccepted'
      | 'extensionDeclined'
  ) =>
    run(action, {
      onSuccess: () => {
        setDialog(null)
        setToast(t(`toast.${toastKey}`))
      },
      onError: (e) => {
        setDialog(null)
        setToast(toMessage(e))
      },
    })

  const actions: PanelActions = {
    busy,
    pay: () => perform(() => reviewCaseActions.pay(caseId), 'paid'),
    answer: (text) =>
      perform(
        () => reviewCaseActions.provideInformation(caseId, text),
        'answered'
      ),
    expire,
    requestEarlyCancel: () => setDialog('earlyCancel'),
    rate: (stars, comment) =>
      perform(() => reviewCaseActions.rate(caseId, stars, comment), 'rated'),
    withdrawDispute: () =>
      perform(
        () => reviewCaseActions.withdrawDispute(caseId),
        'disputeWithdrawn'
      ),
  }

  return (
    <>
      <nav
        aria-label="Breadcrumb"
        className="text-fg-muted mb-6 flex items-center gap-2 text-sm"
      >
        <Link
          to="/cases"
          className="hover:text-fg-strong inline-flex items-center gap-1.5"
        >
          <ArrowLeft size={15} aria-hidden="true" />
          {t('nav.cases')}
        </Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page" className="num text-fg-strong">
          {c.code}
        </span>
      </nav>

      <CaseHeader
        code={c.code ?? c.id}
        title={c.title}
        meta={[
          [t('meta.expert'), c.expert.name],
          [t('meta.service'), c.serviceName],
          [t('meta.fee'), f.money(c.amount)],
          [t('meta.requested'), f.at(c.requestedAt)],
        ]}
        rail={{
          steps: RAIL.map((k) => t(`rail.${k}`)),
          current: RAIL_STEP[c.status] ?? 0,
          label: t(`status.${c.status}`),
        }}
      />

      <div className="mt-10 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-8">
          {dto.extension && dto.status === 'IN_REVIEW' && (
            <ExtensionStatus
              extension={dto.extension}
              busy={busy}
              onDecide={(accept) =>
                perform(
                  () => reviewCaseActions.decideExtension(caseId, accept),
                  accept ? 'extensionAccepted' : 'extensionDeclined'
                )
              }
            />
          )}
          <CasePanel c={c} actions={actions} />
          {c.settlement && (
            <SettlementReceipt amount={c.amount} settlement={c.settlement} />
          )}
          {c.result && (
            <ReviewResultView
              result={c.result}
              caseId={c.code ?? c.id}
              expert={c.expert}
            />
          )}
          {dto.sourceContent && dto.revisedContent && (
            <RevisedContentView
              source={dto.sourceContent}
              revised={dto.revisedContent}
            />
          )}
          <section className="paper p-6 md:p-8">
            <h2 className="eyebrow font-sans">{t('live.request')}</h2>
            <p className="text-fg-strong mt-2 max-w-[65ch] break-words whitespace-pre-wrap">
              {c.problemDescription}
            </p>
            {c.expectedOutcome && (
              <>
                <h3 className="eyebrow mt-5 font-sans">{t('live.expected')}</h3>
                <p className="text-fg-strong mt-2 max-w-[65ch] break-words whitespace-pre-wrap">
                  {c.expectedOutcome}
                </p>
              </>
            )}
          </section>
          {CHAT_STATUSES.includes(c.status) && (
            <CaseChat caseId={caseId} role="CLIENT" />
          )}
        </div>
        <div className="min-w-0 space-y-6">
          <CaseAside c={c} />
          <CaseAttachments
            caseId={caseId}
            until={c.dispute?.openedAt}
            canUpload={UPLOAD_STATUSES.includes(c.status) && c.status !== 'DISPUTED'}
            canRemove={UPLOAD_STATUSES.includes(c.status) && c.status !== 'DISPUTED'}
            requesterUserId={dto.requesterUserId}
            sourceFileName={dto.sourceContent ? null : (dto.sourceFileName ?? undefined)}
          />
        </div>
      </div>

      {c.status === 'AWAITING_ACCEPTANCE' && (
        <DecisionBar
          className="rounded-surface shadow-overlay mt-10"
          blockers={[]}
          secondary={
            <button
              type="button"
              disabled={busy}
              onClick={() => setDialog('report')}
              className="btn btn-press btn-secondary"
            >
              {t('panel.AWAITING_ACCEPTANCE.report')}
            </button>
          }
          primary={{
            label: t('panel.AWAITING_ACCEPTANCE.accept'),
            onClick: () => setDialog('accept'),
          }}
        />
      )}

      {dialog === 'accept' && (
        <AcceptDialog
          refund={c.clientTerms?.acceptRefund}
          onClose={() => setDialog(null)}
          onConfirm={() =>
            perform(() => reviewCaseActions.confirm(caseId), 'accepted')
          }
        />
      )}
      {dialog === 'earlyCancel' &&
        (c.status === 'PENDING_EXPERT_RESPONSE' ||
          c.status === 'AWAITING_PAYMENT') && (
          <EarlyCancelDialog
            stage={c.status}
            live
            onClose={() => setDialog(null)}
            onConfirm={() =>
              perform(
                () => reviewCaseActions.withdraw(caseId),
                c.status === 'AWAITING_PAYMENT' ? 'cancelledEarly' : 'withdrawn'
              )
            }
          />
        )}
      {dialog === 'report' && (
        <ReportDialog
          disputeRefund={c.clientTerms?.disputeRefund}
          onClose={() => setDialog(null)}
          onSubmit={(issue, description) =>
            perform(
              () => openCaseDispute(caseId, issue, description),
              'disputed'
            )
          }
        />
      )}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </>
  )
}
