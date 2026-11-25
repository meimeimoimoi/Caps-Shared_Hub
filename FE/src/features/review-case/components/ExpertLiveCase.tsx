import { useCallback, useId, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { ExtensionForm, ExtensionStatus } from './CaseExtension'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { HelpTip } from '@/components/ui/feedback/help-tip'
import { DISPUTE_SLA_DAYS } from '@/features/disputes-escrow/constants'
import { Toast } from '@/components/ui/feedback/toast'
import { addDisputeStatement, reviewCaseActions } from '../api/reviewCaseApi'
import { useCaseError, useCaseRun, useLiveCase } from '../hooks/useReviewCases'
import { caseCode } from '../mapper'
import { caseText, fieldClass, useCaseFormat } from '../ui'
import { CaseAttachments, EvidenceUpload } from './CaseAttachments'
import { CaseChat } from './CaseChat'
import { Deadline } from './CaseUi'
import { RevisedContentView } from './RevisedContentView'
import { fieldText } from './fieldText'
import { cn } from '@/lib/utils'

const MAX_TEXT = 4000
// Mirrors ReviewCase.MaxCitations / MaxCitationLength on the server
const MAX_CITATIONS = 20
const MAX_CITATION_LENGTH = 500
const ATTESTED_TASKS = ['T1', 'T2', 'T3'] as const
const CHAT_STATUSES = [
  'IN_REVIEW',
  'AWAITING_USER_INFORMATION',
  'AWAITING_ACCEPTANCE',
]
const UPLOAD_STATUSES = [...CHAT_STATUSES, 'DISPUTED']

/** A required text and one button; used for every action that needs the expert's words. */
// Expert-side deadlines turn amber within the last 24 hours
const DUE_SOON_MS = 24 * 60 * 60 * 1000

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
  source,
  draft,
  onSaveDraft,
  onSubmit,
}: {
  busy: boolean
  /** The AI draft under review; its fields can be edited or removed. */
  source: Record<string, unknown> | null
  /** The revision the expert saved earlier, so edits survive leaving the page */
  draft: Record<string, unknown> | null
  onSaveDraft: (revised: Record<string, unknown> | null) => void
  onSubmit: (
    result: 'VERIFIED' | 'CANNOT_VERIFY',
    summary: string,
    reason: string | null,
    citations: string[],
    revised: Record<string, unknown> | null
  ) => void
}) {
  const { t } = useTranslation('reviewCase')
  const id = useId()
  const [result, setResult] = useState<'VERIFIED' | 'CANNOT_VERIFY'>('VERIFIED')
  const [summary, setSummary] = useState('')
  const [reason, setReason] = useState('')
  const [citeText, setCiteText] = useState('')
  // T1-T3 must be confirmed before delivery (attestation)
  const [checked, setChecked] = useState<string[]>([])
  const citations = citeText
    .split('\n')
    .map((c) => c.trim())
    .filter(Boolean)
  const [fields, setFields] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      Object.entries(source ?? {}).map(([k, v]) => [
        k,
        fieldText(draft && k in draft ? draft[k] : v),
      ])
    )
  )
  // A field missing from the saved draft was removed by the expert
  const [removed, setRemoved] = useState<string[]>(() =>
    draft ? Object.keys(source ?? {}).filter((k) => !(k in draft)) : []
  )
  const cannot = result === 'CANNOT_VERIFY'
  // A file the client uploaded has no AI draft (the server sends no source content), so T2 does not apply
  const tasks = ATTESTED_TASKS.filter((k) => k !== 'T2' || source)
  // What still blocks delivery, named by the field labels the expert sees
  const missing = [
    !summary.trim() && t('live.expert.summary'),
    cannot && !reason.trim() && t('live.expert.cannotVerifyReason'),
    ((!cannot && citations.length === 0) ||
      citations.length > MAX_CITATIONS ||
      citations.some((c) => c.length > MAX_CITATION_LENGTH)) &&
      t('live.expert.citations'),
    tasks.some((k) => !checked.includes(k)) &&
      t('live.expert.missingAttest', { count: tasks.length }),
  ].filter((x): x is string => Boolean(x))
  const ready = missing.length === 0
  const [tried, setTried] = useState(false)
  // Fields that were not text go back as JSON when they still parse
  const revised = () =>
    source &&
    Object.fromEntries(
      Object.entries(fields)
        .filter(([k]) => !removed.includes(k))
        .map(([k, v]) => {
          if (typeof source[k] === 'string') return [k, v]
          try {
            return [k, JSON.parse(v)]
          } catch {
            return [k, v]
          }
        })
    )
  return (
    <form
      className="space-y-4"
      // The missing-fields line below replaces the browser's one-field-at-a-time bubbles
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        setTried(true)
        if (ready)
          onSubmit(
            result,
            summary.trim(),
            cannot ? reason.trim() : null,
            citations,
            revised()
          )
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
      {/* An empty source ({}) has nothing to edit: no heading without fields */}
      {source && Object.keys(fields).length > 0 && (
        <fieldset className="space-y-3">
          <legend className="text-fg-strong text-sm font-semibold">
            {t('live.expert.editFields')}
          </legend>
          {Object.keys(fields).map((key) => {
            const original = fieldText(source[key])
            const edited = !removed.includes(key) && fields[key] !== original
            return (
              <div key={key} className="space-y-1">
                <div className="flex flex-wrap items-center gap-x-2">
                  <label htmlFor={`${id}-f-${key}`} className="text-fg text-sm">
                    {key}
                  </label>
                  {edited && (
                    <>
                      <span className="text-accent-text text-caption font-semibold">
                        {t('live.expert.fieldChanged')}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setFields({ ...fields, [key]: original })
                        }
                        className="text-fg-muted hover:text-fg-strong text-caption underline underline-offset-2"
                      >
                        {t('live.expert.undo')}
                      </button>
                    </>
                  )}
                </div>
                <textarea
                  id={`${id}-f-${key}`}
                  rows={1}
                  disabled={removed.includes(key)}
                  value={fields[key]}
                  onChange={(e) =>
                    setFields({ ...fields, [key]: e.target.value })
                  }
                  className={cn(
                    fieldClass,
                    'field-sizing-content min-h-11 resize-y disabled:line-through disabled:opacity-60',
                    edited && 'border-accent'
                  )}
                />
                <label className="text-fg-muted flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={removed.includes(key)}
                    onChange={(e) =>
                      setRemoved(
                        e.target.checked
                          ? [...removed, key]
                          : removed.filter((r) => r !== key)
                      )
                    }
                    className="accent-ink size-4"
                  />
                  {t('live.expert.removeField')}
                </label>
              </div>
            )
          })}
        </fieldset>
      )}
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
      <div className="space-y-2">
        <div className="flex items-center gap-1">
          <label
            htmlFor={`${id}-citations`}
            className="text-fg-strong block text-sm font-semibold"
          >
            {t('live.expert.citations')}
          </label>
          <HelpTip label={t('live.expert.citationsHelpLabel')}>
            {t('live.expert.citationsHelp')}
          </HelpTip>
        </div>
        <textarea
          id={`${id}-citations`}
          required={!cannot}
          rows={3}
          value={citeText}
          onChange={(e) => setCiteText(e.target.value)}
          className={cn(fieldClass, 'resize-y')}
        />
      </div>
      <fieldset className="space-y-2">
        <legend className="text-fg-strong text-sm font-semibold">
          {t('live.expert.attest')}
        </legend>
        {tasks.map((k) => (
          <label key={k} className="text-fg flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={checked.includes(k)}
              onChange={(e) =>
                setChecked(
                  e.target.checked
                    ? [...checked, k]
                    : checked.filter((c) => c !== k)
                )
              }
              className="accent-ink size-4"
            />
            {t(`tasks.${k}`)}
          </label>
        ))}
      </fieldset>
      {tried && missing.length > 0 && (
        <p role="alert" className="text-danger text-sm">
          {t('live.expert.missing', { items: missing.join(', ') })}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        {/* Always looks clickable: a greyed-out button read as "no button"; a click says what is missing */}
        <button
          type="submit"
          disabled={busy}
          className="btn btn-press btn-primary disabled:opacity-60"
        >
          {t('live.expert.deliver')}
        </button>
        {source && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onSaveDraft(revised())}
            className="btn btn-press btn-secondary disabled:opacity-60"
          >
            {t('live.expert.saveDraft')}
          </button>
        )}
      </div>
    </form>
  )
}

// Mirrors ReviewCase.MaxInfoRequests in the workflow service
const MAX_INFO_REQUESTS = 2

const Card = ({
  title,
  help,
  children,
}: {
  title: string
  help?: string
  children: React.ReactNode
}) => (
  <section className="paper space-y-4 p-6">
    <h2 className="text-h2 inline-flex items-center gap-2 font-serif">
      {title}
      {help && <HelpTip label={title}>{help}</HelpTip>}
    </h2>
    {children}
  </section>
)

// Same as the server's reminder (ReviewCase.ReminderHours): from here the late rule turns into a warning
const URGENT_MS = 3 * 3_600_000

/** The expert's page of a real case. The client's name and contact details are never shown. */
export function ExpertLiveCase({
  caseId,
  returnTo,
  returnLabel,
}: {
  caseId: string
  returnTo: string
  returnLabel: string
}) {
  const { t } = useTranslation(['reviewCase', 'common'])
  const tr = t as unknown as (key: string, options?: object) => string
  const f = useCaseFormat()
  const { dto, dispute, view, isPending, isFetching, notFound, refetch } =
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
        {!notFound && (
          <button type="button" className="ep-button mb-3" onClick={expire} disabled={isFetching}>
            {t('retry')}
          </button>
        )}
        <Link className="ep-link block" to={returnTo}>
          {returnLabel}
        </Link>
      </div>
    )

  const perform = (action: () => Promise<unknown>, success = t('live.expert.saved')) =>
    run(action, {
      onSuccess: () => setToast(success),
      onError: (e) => setToast(toMessage(e)),
    })
  const a = reviewCaseActions
  const open = dto.infoRequests?.find((q) => q.status === 'OPEN')
  const asked = dto.infoRequests?.length ?? 0
  // Whole hours past the delivery deadline, 0 when delivered on time
  const lateHours =
    dto.deliveredAt && dto.deliveryDeadline
      ? Math.max(
          0,
          Math.ceil(
            (new Date(dto.deliveredAt).getTime() -
              new Date(dto.deliveryDeadline).getTime()) /
              3_600_000
          )
        )
      : 0
  const canWithdraw =
    dto.status === 'IN_REVIEW' || dto.status === 'AWAITING_USER_INFORMATION'

  const lateRule =
    dto.expertTerms &&
    t('live.expert.lateRule', {
      hours: dto.expertTerms.latePenaltyHours,
      payout: f.money(dto.expertTerms.latePayout),
      cancel: dto.expertTerms.lateCancelHours,
    })
  const deliveryUrgent =
    !!view.due?.delivery &&
    new Date(view.due.delivery).getTime() - Date.now() < URGENT_MS

  return (
    <div className="mx-auto max-w-340">
      <Link
        to={returnTo}
        className="text-fg-muted mb-5 inline-flex items-center gap-2 text-sm"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        {returnLabel}
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

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
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
                soonMs={DUE_SOON_MS}
                dueAt={view.due.response}
                onExpire={expire}
              />
            )}
            {view.due?.delivery && (
              <Deadline
                label={t('panel.IN_REVIEW.due')}
                soonMs={DUE_SOON_MS}
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
              {dto.expertTerms && (
                <p className="text-fg-strong">
                  {t('live.expert.netPayout', {
                    amount: f.money(dto.expertTerms.payout),
                  })}
                </p>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() => perform(() => a.accept(caseId), t('live.expert.acceptedFeedback'))}
                className="btn btn-press btn-primary disabled:opacity-60"
              >
                {t('live.expert.accept')}
              </button>
              <details>
                <summary className="text-fg-strong cursor-pointer text-sm font-semibold">
                  {t('live.expert.decline')}
                </summary>
                <div className="mt-3 space-y-3">
                  {/* Matches workflow DeclineReviewHandler: case closes as declined, full refund, no violation */}
                  <p className="text-fg-strong text-sm">
                    {t('live.expert.declineEffect')}
                  </p>
                  <TextAction
                    label={t('live.expert.declineReason')}
                    submit={t('live.expert.decline')}
                    busy={busy}
                    danger
                    onSubmit={(r) => perform(() => a.decline(caseId, r), t('live.expert.declinedFeedback'))}
                  />
                </div>
              </details>
            </Card>
          )}

          {dto.status === 'IN_REVIEW' && (
            <Card
              title={t('live.expert.deliverTitle')}
              // Far from the deadline the late rule is reference only; close to it, it becomes the warning below
              help={lateRule && !deliveryUrgent ? lateRule : undefined}
            >
              {lateRule && deliveryUrgent && (
                <p className="para-check text-warning text-sm">{lateRule}</p>
              )}
              <DeliverForm
                busy={busy}
                source={dto.sourceContent}
                draft={dto.revisedContent}
                onSaveDraft={(revisedContent) =>
                  perform(
                    () => a.saveRevision(caseId, revisedContent),
                    t('live.expert.draftSaved')
                  )
                }
                onSubmit={(
                  result,
                  summary,
                  cannotVerifyReason,
                  citations,
                  revisedContent
                ) =>
                  perform(
                    () =>
                      a.deliver(caseId, {
                        result,
                        summary,
                        cannotVerifyReason,
                        citations,
                        // The form only submits once T1-T3 are all ticked
                        attested: true,
                        revisedContent,
                      }),
                    t('live.expert.deliveredFeedback')
                  )
                }
              />
            </Card>
          )}

          {/* Right under the delivery form: it is what the client receives with the result */}
          {dto.sourceContent && dto.revisedContent && (
            <RevisedContentView
              source={dto.sourceContent}
              revised={dto.revisedContent}
            />
          )}

          {dto.status === 'IN_REVIEW' && !dto.extension && (
            <Card title={t('extension.title')}>
              <ExtensionForm
                busy={busy}
                onSubmit={(days, reason) =>
                  perform(
                    () => a.requestExtension(caseId, days, reason),
                    t('extension.requestedFeedback')
                  )
                }
              />
            </Card>
          )}

          {dto.extension && (
            <Card title={t('extension.title')}>
              <ExtensionStatus extension={dto.extension} />
            </Card>
          )}

          {dto.status === 'IN_REVIEW' && asked < MAX_INFO_REQUESTS && (
            <Card title={t('live.expert.askTitle')}>
              <p className="text-fg text-sm">
                {t('live.expert.askLeft', {
                  left: MAX_INFO_REQUESTS - asked,
                  max: MAX_INFO_REQUESTS,
                })}
              </p>
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
              <p className="text-fg text-sm">{t('live.expert.deliveryPaused')}</p>
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
              {dto.deliveredAt && (
                <p className="text-fg text-sm">
                  {lateHours > 0
                    ? t('live.expert.deliveredLate', {
                        time: f.at(dto.deliveredAt),
                        hours: lateHours,
                      })
                    : t('live.expert.deliveredOnTime', {
                        time: f.at(dto.deliveredAt),
                      })}
                </p>
              )}
              <p className="text-fg-strong break-words whitespace-pre-wrap">
                {dto.reviewSummary}
              </p>
              {dto.cannotVerifyReason && (
                <p className="text-fg break-words whitespace-pre-wrap">
                  {dto.cannotVerifyReason}
                </p>
              )}
              {dto.citations?.length > 0 && (
                <ol className="text-fg list-decimal space-y-1 pl-5 text-sm">
                  {dto.citations.map((c, i) => (
                    <li key={i} className="break-words">
                      {c}
                    </li>
                  ))}
                </ol>
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
                dto.status === 'DISPUTED' &&
                (new Date(dispute.statementDueBy).getTime() > Date.now() ? (
                  <>
                    <Deadline
                      label={t('live.expert.statementDue')}
                soonMs={DUE_SOON_MS}
                      dueAt={dispute.statementDueBy}
                      onExpire={expire}
                    />
                    <TextAction
                      label={t('live.expert.statement')}
                      submit={t('live.expert.sendStatement')}
                      busy={busy}
                      onSubmit={(m) =>
                        perform(() => addDisputeStatement(caseId, m))
                      }
                    />
                  </>
                ) : (
                  <p className="text-fg-muted mt-3 text-sm">
                    {t('live.expert.statementClosed')}
                  </p>
                ))
              )}
              {dto.status === 'DISPUTED' && (
                <p className="text-fg-muted text-sm">
                  {new Date(dispute.decideBy).getTime() < Date.now()
                    ? t('live.expert.decisionLate')
                    : t('panel.DISPUTED.sla', { days: DISPUTE_SLA_DAYS })}
                </p>
              )}
              {dto.status === 'DISPUTED' && (
                // Evidence sits next to the statement so the arbiter can weigh it against the client's
                <EvidenceUpload caseId={caseId} label={t('live.files.evidence.add')} />
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
        </div>

        {/* Chat sits beside the work instead of below every form, so the client's messages stay in view */}
        <aside className="min-w-0 space-y-6">
          {CHAT_STATUSES.includes(dto.status) && (
            <CaseChat caseId={caseId} role="EXPERT" />
          )}
          {dto.settlement && (
            <section className="paper p-5 text-sm">
              <h2 className="eyebrow font-sans">{t('settlement.title')}</h2>
              <dl className="mt-3 space-y-2">
                <div className="flex justify-between gap-4">
                  <dt className="text-fg-muted">{t('settlement.expert')}</dt>
                  <dd className="num text-fg-strong font-semibold">
                    {f.money(dto.settlement.expertAmount ?? 0)}
                  </dd>
                </div>
              </dl>
            </section>
          )}
          <CaseAttachments
            caseId={caseId}
            canUpload={UPLOAD_STATUSES.includes(dto.status)}
            requesterUserId={dto.requesterUserId}
            // A draft written in the app has content and no file; an unnamed upload keeps the generic button
            sourceFileName={dto.sourceContent ? null : (dto.sourceFileName ?? undefined)}
          />
        </aside>
      </div>
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}
