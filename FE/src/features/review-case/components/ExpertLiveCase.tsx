import { useCallback, useId, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { HelpTip } from '@/components/ui/feedback/help-tip'
import { Toast } from '@/components/ui/feedback/toast'
import { addDisputeStatement, reviewCaseActions } from '../api/reviewCaseApi'
import { useCaseError, useCaseRun, useLiveCase } from '../hooks/useReviewCases'
import { caseCode } from '../mapper'
import { caseText, fieldClass, useCaseFormat } from '../ui'
import { CaseAttachments } from './CaseAttachments'
import { CaseChat } from './CaseChat'
import { Deadline } from './CaseUi'
import { cn } from '@/lib/utils'

const MAX_TEXT = 4000
const CHAT_STATUSES = [
  'IN_REVIEW',
  'AWAITING_USER_INFORMATION',
  'AWAITING_ACCEPTANCE',
]
const UPLOAD_STATUSES = [...CHAT_STATUSES, 'DISPUTED']

/** A required text and one button; used for every action that needs the expert's words. */
function TextAction({
  label,
  submit,
  busy,
  danger,
  onSubmit,
}: {
  label: string
  submit: string
  busy: boolean
  danger?: boolean
  onSubmit: (text: string) => void
}) {
  const id = useId()
  const [text, setText] = useState('')
  return (
    <form
      className="space-y-3"
      onSubmit={(e: FormEvent) => {
        e.preventDefault()
        if (text.trim()) onSubmit(text.trim())
      }}
    >
      <label
        htmlFor={id}
        className="text-fg-strong block text-sm font-semibold"
      >
        {label}
      </label>
      <textarea
        id={id}
        required
        rows={3}
        maxLength={MAX_TEXT}
        value={text}
        onChange={(e) => setText(e.target.value)}
        className={cn(fieldClass, 'resize-y')}
      />
      <button
        type="submit"
        disabled={busy || !text.trim()}
        className={cn(
          'btn btn-press disabled:opacity-60',
          danger ? 'bg-danger text-paper hover:opacity-90' : 'btn-secondary'
        )}
      >
        {submit}
      </button>
    </form>
  )
}

function DeliverForm({
  busy,
  onSubmit,
}: {
  busy: boolean
  onSubmit: (
    result: 'VERIFIED' | 'CANNOT_VERIFY',
    summary: string,
    reason: string | null
  ) => void
}) {
  const { t } = useTranslation('reviewCase')
  const id = useId()
  const [result, setResult] = useState<'VERIFIED' | 'CANNOT_VERIFY'>('VERIFIED')
  const [summary, setSummary] = useState('')
  const [reason, setReason] = useState('')
  const cannot = result === 'CANNOT_VERIFY'
  const ready = summary.trim() && (!cannot || reason.trim())
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (ready)
          onSubmit(result, summary.trim(), cannot ? reason.trim() : null)
      }}
    >
      <fieldset>
        <legend className="text-fg-strong text-sm font-semibold">
          {t('live.expert.result')}
        </legend>
        <div className="mt-2 flex flex-wrap gap-4 text-sm">
          {(['VERIFIED', 'CANNOT_VERIFY'] as const).map((v) => (
            <label key={v} className="flex items-center gap-2">
              <input
                type="radio"
                name={`${id}-result`}
                checked={result === v}
                onChange={() => setResult(v)}
                className="accent-ink size-4"
              />
              {t(`result.${v}`)}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="space-y-2">
        <div className="flex items-center gap-1">
          <label
            htmlFor={`${id}-summary`}
            className="text-fg-strong block text-sm font-semibold"
          >
            {t('live.expert.summary')}
          </label>
          <HelpTip label={t('live.expert.summaryHelpLabel')}>
            {t('live.expert.summaryHelp')}
          </HelpTip>
        </div>
        <textarea
          id={`${id}-summary`}
          required
          rows={6}
          maxLength={MAX_TEXT}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          className={cn(fieldClass, 'resize-y')}
        />
      </div>
      {cannot && (
        <div className="space-y-2">
          <label
            htmlFor={`${id}-reason`}
            className="text-fg-strong block text-sm font-semibold"
          >
            {t('live.expert.cannotVerifyReason')}
          </label>
          <textarea
            id={`${id}-reason`}
            required
            rows={3}
            maxLength={MAX_TEXT}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={cn(fieldClass, 'resize-y')}
          />
        </div>
      )}
      <button
        type="submit"
        disabled={busy || !ready}
        className="btn btn-press btn-primary disabled:opacity-60"
      >
        {t('live.expert.deliver')}
      </button>
    </form>
  )
}

const Card = ({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) => (
  <section className="paper space-y-4 p-6">
    <h2 className="text-h2 font-serif">{title}</h2>
    {children}
  </section>
)

/** The expert's page of a real case. The client's name and contact details are never shown. */
export function ExpertLiveCase({ caseId }: { caseId: string }) {
  const { t } = useTranslation(['reviewCase', 'common'])
  const tr = t as unknown as (key: string, options?: object) => string
  const f = useCaseFormat()
  const { dto, dispute, view, isPending, notFound, refetch } =
    useLiveCase(caseId)
  const { run, busy } = useCaseRun()
  const toMessage = useCaseError()
  const [toast, setToast] = useState<string | null>(null)
  const expire = useCallback(() => void refetch(), [refetch])

  if (isPending)
    return (
      <div
        role="status"
        aria-label={t('common:loading')}
        className="bg-sunken h-48 w-full rounded motion-safe:animate-pulse"
      />
    )
  if (!dto || !view)
    return (
      <div className="ep-empty">
        <h1>{t(notFound ? 'notFound.title' : 'errors.failed')}</h1>
        <Link className="ep-link" to="/expert/cases">
          {t('nav.cases')}
        </Link>
      </div>
    )

  const perform = (action: () => Promise<unknown>) =>
    run(action, {
      onSuccess: () => setToast(t('live.expert.saved')),
      onError: (e) => setToast(toMessage(e)),
    })
  const a = reviewCaseActions
  const open = dto.infoRequests?.find((q) => q.status === 'OPEN')
  const canWithdraw =
    dto.status === 'IN_REVIEW' || dto.status === 'AWAITING_USER_INFORMATION'

  return (
    <div className="mx-auto max-w-340">
      <Link
        to="/expert/cases"
        className="text-fg-muted mb-5 inline-flex items-center gap-2 text-sm"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        {t('nav.cases')}
      </Link>
      <header className="mb-6 flex items-start justify-between gap-4 max-md:flex-col">
        <div className="min-w-0">
          <h1 className="text-h1 font-serif break-words">{view.title}</h1>
          <p className="text-fg-muted num mt-1 text-sm">
            {caseCode(dto.id)} · {view.serviceName} · {f.money(dto.fee)}
          </p>
        </div>
        <span className="ep-status shrink-0">
          {tr(`live.expert.status.${dto.status}`)}
        </span>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-6">
          <Card title={t('live.expert.request')}>
            <p className="text-fg-strong max-w-[65ch] break-words whitespace-pre-wrap">
              {dto.problemDescription}
            </p>
            {dto.expectedOutcome && (
              <div>
                <h3 className="eyebrow font-sans">{t('live.expected')}</h3>
                <p className="text-fg-strong mt-1 max-w-[65ch] break-words whitespace-pre-wrap">
                  {dto.expectedOutcome}
                </p>
              </div>
            )}
            {view.due?.response && (
              <Deadline
                label={t('live.expert.responseDue')}
                dueAt={view.due.response}
                onExpire={expire}
              />
            )}
            {view.due?.delivery && (
              <Deadline
                label={t('panel.IN_REVIEW.due')}
                dueAt={view.due.delivery}
                onExpire={expire}
              />
            )}
            {view.due?.acceptance && (
              <Deadline
                label={t('panel.AWAITING_ACCEPTANCE.due')}
                dueAt={view.due.acceptance}
                onExpire={expire}
              />
            )}
          </Card>

          {dto.status === 'PENDING_EXPERT_RESPONSE' && (
            <Card title={t('live.expert.decide')}>
              <button
                type="button"
                disabled={busy}
                onClick={() => perform(() => a.accept(caseId))}
                className="btn btn-press btn-primary disabled:opacity-60"
              >
                {t('live.expert.accept')}
              </button>
              <details>
                <summary className="text-fg-strong cursor-pointer text-sm font-semibold">
                  {t('live.expert.decline')}
                </summary>
                <div className="mt-3">
                  <TextAction
                    label={t('live.expert.declineReason')}
                    submit={t('live.expert.decline')}
                    busy={busy}
                    danger
                    onSubmit={(r) => perform(() => a.decline(caseId, r))}
                  />
                </div>
              </details>
            </Card>
          )}

          {dto.status === 'IN_REVIEW' && (
            <Card title={t('live.expert.deliverTitle')}>
              <DeliverForm
                busy={busy}
                onSubmit={(result, summary, cannotVerifyReason) =>
                  perform(() =>
                    a.deliver(caseId, { result, summary, cannotVerifyReason })
                  )
                }
              />
            </Card>
          )}

          {dto.status === 'IN_REVIEW' && (
            <Card title={t('live.expert.askTitle')}>
              <TextAction
                label={t('live.expert.askLabel')}
                submit={t('live.expert.ask')}
                busy={busy}
                onSubmit={(m) => perform(() => a.requestInformation(caseId, m))}
              />
            </Card>
          )}

          {open && (
            <Card title={t('live.expert.waitingTitle')}>
              <p className="text-fg-strong break-words whitespace-pre-wrap">
                {open.message}
              </p>
              <Deadline
                label={t('panel.AWAITING_USER_INFORMATION.due')}
                dueAt={open.dueAt}
                onExpire={expire}
              />
            </Card>
          )}

          {dto.infoRequests?.some((q) => q.response) && (
            <Card title={t('live.expert.answers')}>
              <ul className="space-y-4">
                {dto.infoRequests
                  .filter((q) => q.response)
                  .map((q) => (
                    <li key={q.id}>
                      <p className="text-fg-muted text-sm break-words">
                        {q.message}
                      </p>
                      <p className="text-fg-strong mt-1 break-words whitespace-pre-wrap">
                        {q.response}
                      </p>
                    </li>
                  ))}
              </ul>
            </Card>
          )}

          {dto.reviewSummary && (
            <Card title={t('result.title')}>
              <p className="text-fg-strong font-semibold">
                {t(`result.${dto.result ?? 'VERIFIED'}`)}
              </p>
              <p className="text-fg-strong break-words whitespace-pre-wrap">
                {dto.reviewSummary}
              </p>
              {dto.cannotVerifyReason && (
                <p className="text-fg break-words whitespace-pre-wrap">
                  {dto.cannotVerifyReason}
                </p>
              )}
            </Card>
          )}

          {dispute && (
            <Card title={t('panel.DISPUTED.title')}>
              <p className="text-fg-strong font-semibold">
                {caseText(`dialogs.report.issues.${dispute.reason}`) ??
                  dispute.reason}
              </p>
              <p className="text-fg-strong break-words whitespace-pre-wrap">
                {dispute.description}
              </p>
              {dispute.expertStatement ? (
                <div>
                  <h3 className="eyebrow font-sans">
                    {t('live.expert.statement')}
                  </h3>
                  <p className="text-fg-strong mt-1 break-words whitespace-pre-wrap">
                    {dispute.expertStatement}
                  </p>
                </div>
              ) : (
                dto.status === 'DISPUTED' && (
                  <TextAction
                    label={t('live.expert.statement')}
                    submit={t('live.expert.sendStatement')}
                    busy={busy}
                    onSubmit={(m) =>
                      perform(() => addDisputeStatement(caseId, m))
                    }
                  />
                )
              )}
              {dispute.resolutionNote && (
                <p className="text-fg break-words whitespace-pre-wrap">
                  {dispute.resolutionNote}
                </p>
              )}
            </Card>
          )}

          {canWithdraw && (
            <details className="paper p-6">
              <summary className="text-danger cursor-pointer font-semibold">
                {t('live.expert.withdraw')}
              </summary>
              <p className="text-fg-muted mt-3 text-sm">
                {t('live.expert.withdrawHint')}
              </p>
              <div className="mt-3">
                <TextAction
                  label={t('live.expert.withdrawReason')}
                  submit={t('live.expert.withdraw')}
                  busy={busy}
                  danger
                  onSubmit={(r) => perform(() => a.expertWithdraw(caseId, r))}
                />
              </div>
            </details>
          )}

          {CHAT_STATUSES.includes(dto.status) && (
            <CaseChat caseId={caseId} role="EXPERT" />
          )}
        </div>

        <aside className="min-w-0 space-y-6">
          {dto.settlement && (
            <section className="paper p-5 text-sm">
              <h2 className="eyebrow font-sans">{t('settlement.title')}</h2>
              <dl className="mt-3 space-y-2">
                {(
                  [
                    ['expert', dto.settlement.expertAmount],
                    ['platform', dto.settlement.platformFee],
                    ['refund', dto.settlement.clientRefund],
                  ] as const
                ).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4">
                    <dt className="text-fg-muted">{t(`settlement.${k}`)}</dt>
                    <dd className="num text-fg-strong font-semibold">
                      {f.money(v)}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
          <CaseAttachments
            caseId={caseId}
            canUpload={UPLOAD_STATUSES.includes(dto.status)}
            requesterUserId={dto.requesterUserId}
          />
        </aside>
      </div>
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}
