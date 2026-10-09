import { useRef, useState } from 'react'
import { Link, useBeforeUnload, useBlocker, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, FileText, Save } from 'lucide-react'
import {
  useReviewer,
  ReviewStatusBadge,
  blankDraft,
  eligibilityIds,
  competencyIds,
  reviewAccess,
  validateDecision,
  type Gate,
  type ReviewRecord,
  type ReviewDraft,
  type Assessment,
  type Decision,
  type ReviewError,
} from '@/features/reviewer'
import { Button } from '@/components/ui/actions/button'
import { CustomSelect } from '@/components/ui/forms/custom-select'
import { FormField } from '@/components/ui/forms/form-field'
import { Modal } from '@/components/ui/feedback/modal'
import { useFormatters } from '@/hooks/useFormatters'

const textAreaClass =
  'border-border-control bg-surface text-text placeholder:text-text-muted aria-[invalid=true]:border-danger min-h-24 w-full resize-y rounded-lg border px-3 py-2.5 text-sm'

function AssessmentForm({ record }: { record: ReviewRecord }) {
  const { t } = useTranslation('reviewer')
  const { state, actor, policy, saveDraft, submit } = useReviewer()
  const format = useFormatters()
  const previous =
    state.drafts[record.id] ??
    state.history.filter((entry) => entry.recordId === record.id).at(-1)
      ?.draft ??
    blankDraft(record.gate)
  const [draft, setDraft] = useState<ReviewDraft>(() =>
    structuredClone(previous)
  )
  const [saved, setSaved] = useState(() => JSON.stringify(previous))
  const [error, setError] = useState<ReviewError | null>(null)
  const [message, setMessage] = useState<'draftSaved' | 'decisionSaved' | null>(
    null
  )
  const [confirm, setConfirm] = useState(false)
  // Sau lần ghi quyết định bị thiếu: đánh dấu từng ô còn trống cho tới khi điền xong
  const [tried, setTried] = useState(false)
  const errorSummary = useRef<HTMLDivElement>(null)
  const denied = reviewAccess(record, actor)
  const dirty = JSON.stringify(draft) !== saved
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && currentLocation.pathname !== nextLocation.pathname
  )
  useBeforeUnload((event) => {
    if (dirty) {
      event.preventDefault()
      event.returnValue = ''
    }
  })
  const ids = record.gate === 'GATE_1' ? eligibilityIds : competencyIds
  const isGate1 = record.gate === 'GATE_1'
  const policyMissing = !isGate1 && !policy.competencyConfigured
  const decisions: Decision[] = [
    'PASS',
    'NEED_MORE_INFORMATION',
    isGate1 ? 'NOT_ELIGIBLE' : 'FAIL',
  ]
  const update = (patch: Partial<ReviewDraft>) => {
    setDraft((current) => ({ ...current, ...patch }))
    setMessage(null)
    setError(null)
  }
  const updateAssessment = (id: string, patch: Partial<Assessment>) =>
    update({
      assessments: {
        ...draft.assessments,
        [id]: { ...draft.assessments[id], ...patch },
      },
    })
  const showError = (value: ReviewError) => {
    setError(value)
    requestAnimationFrame(() => errorSummary.current?.focus())
  }
  const save = () => {
    const issue = saveDraft(record.id, draft)
    if (issue) showError(issue)
    else {
      setSaved(JSON.stringify(draft))
      setMessage('draftSaved')
      setError(null)
    }
  }
  const required = (empty: boolean) =>
    tried && empty ? t('required') : undefined
  const prepareDecision = () => {
    setTried(true)
    const issue = validateDecision(record, draft, actor, policy)
    if (issue) showError(issue)
    else setConfirm(true)
  }
  const commit = () => {
    const issue = submit(record.id, draft)
    setConfirm(false)
    if (issue) showError(issue)
    else {
      setSaved(JSON.stringify(draft))
      setTried(false)
      setMessage('decisionSaved')
      setError(null)
    }
  }
  const finalEntry = state.history
    .filter((entry) => entry.recordId === record.id)
    .at(-1)
  return (
    <>
      <Link
        to="/reviewer"
        className="text-text-muted hover:text-accent-text mb-6 inline-flex min-h-11 items-center gap-2 text-sm"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        {t('back')}
      </Link>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <h1 className="text-text-strong text-3xl font-semibold tracking-tight">
            {record.name}
          </h1>
          <p className="text-text-muted mt-2 text-sm">
            {record.applicationId} · {record.id} ·{' '}
            {t(isGate1 ? 'gate1' : 'gate2')}
          </p>
          <p className="text-text-muted mt-4 leading-relaxed">
            {t(isGate1 ? 'gate1Intro' : 'gate2Intro')}
          </p>
        </div>
        <ReviewStatusBadge status={record.status} />
      </div>
      {denied && (
        <p
          className="bg-surface-muted mb-5 rounded-lg p-4 text-sm"
          role="status"
        >
          {t(`errors.${denied}`)}
        </p>
      )}
      {policyMissing && (
        <section className="bg-warning-soft text-warning mb-6 rounded-xl p-4">
          <h2 className="font-semibold">{t('criteriaPending')}</h2>
          <p className="mt-2 max-w-4xl text-sm leading-relaxed">
            {t('criteriaPendingBody')}
          </p>
        </section>
      )}
      {error && (
        <div
          ref={errorSummary}
          tabIndex={-1}
          role="alert"
          className="bg-danger-soft text-danger mb-5 rounded-lg p-4 text-sm"
        >
          {t(`errors.${error}`)}
        </div>
      )}
      {message && (
        <p
          role="status"
          className="bg-success-soft text-success mb-5 rounded-lg p-4 text-sm"
        >
          {t(message)}
        </p>
      )}
      <div className="grid items-start gap-8 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-6">
          <dl className="border-border space-y-4 rounded-xl border p-5 text-sm">
            <div>
              <dt className="text-text-muted">{t('policy')}</dt>
              <dd className="text-text-strong mt-1 font-medium">
                {policy.version}
              </dd>
            </div>
            <div>
              <dt className="text-text-muted">{t('experience')}</dt>
              <dd className="mt-1">
                {t('years', { count: record.experienceYears })}
              </dd>
              <dd className="text-text-muted mt-1 text-xs">
                {t('minimum', { count: policy.minimumExperience })}
              </dd>
            </div>
            {!isGate1 && (
              <div>
                <dt className="text-text-muted">{t('scope')}</dt>
                <dd className="mt-1">{record.serviceLabel}</dd>
                <dd
                  className={`mt-1 text-xs ${record.gate1Passed ? 'text-success' : 'text-danger'}`}
                >
                  {record.gate1Passed
                    ? t('gate1Passed')
                    : t('errors.gate1Required')}
                </dd>
              </div>
            )}
          </dl>
          <section>
            <h2 className="text-text-strong font-semibold">{t('evidence')}</h2>
            <p className="text-text-muted mt-2 text-xs leading-relaxed">
              {t('evidenceIntro')}
            </p>
            <div className="border-border divide-border mt-4 divide-y rounded-xl border">
              {record.evidence.map((evidence) => (
                <details key={evidence.id} className="p-3">
                  <summary className="text-text-strong cursor-pointer text-sm">
                    <FileText
                      size={15}
                      aria-hidden="true"
                      className="mr-2 inline"
                    />
                    {evidence.id} · {evidence.title}
                  </summary>
                  <p className="text-text-muted mt-3 text-sm leading-relaxed">
                    {evidence.excerpt}
                  </p>
                </details>
              ))}
            </div>
          </section>
          {!!record.flags.length && (
            <section className="bg-warning-soft text-warning rounded-xl p-4">
              <h2 className="text-sm font-semibold">{t('flags')}</h2>
              <ul className="mt-3 list-disc space-y-2 pl-4 text-sm">
                {record.flags.map((flag) => (
                  <li key={flag}>{flag}</li>
                ))}
              </ul>
            </section>
          )}
        </aside>
        <div className="min-w-0">
          <fieldset
            disabled={!!denied}
            className="border-border bg-surface min-w-0 rounded-xl border px-5 sm:px-6"
          >
            <legend className="sr-only">{t('assessments')}</legend>
            {ids.map((id, index) => {
              const row = draft.assessments[id]
              return (
                <section
                  key={id}
                  className="border-border border-b py-6 last:border-0"
                >
                  <h2 className="text-text-strong font-semibold">
                    {isGate1
                      ? t(
                          `eligibility.${id as (typeof eligibilityIds)[number]}`
                        )
                      : t('competencyCriterion', { number: index + 1 })}
                  </h2>
                  {!isGate1 && (
                    <p className="text-text-muted mt-2 text-sm">
                      {t('undefinedCriterion')}
                    </p>
                  )}
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <CustomSelect
                      label={t('result')}
                      value={row.result}
                      placeholder={t('chooseResult')}
                      options={(
                        ['PASS', 'NEED_MORE_INFORMATION', 'FAIL'] as const
                      ).map((value) => ({
                        value,
                        label: t(`results.${value}`),
                      }))}
                      onChange={(result) => updateAssessment(id, { result })}
                      disabled={!!denied}
                      error={required(!row.result)}
                      className="flex flex-col gap-2 text-sm"
                    />
                    <CustomSelect
                      label={t('evidence')}
                      value={row.evidenceId}
                      placeholder={t('chooseEvidence')}
                      options={record.evidence.map((evidence) => ({
                        value: evidence.id,
                        label: `${evidence.id} · ${evidence.title}`,
                      }))}
                      onChange={(evidenceId) =>
                        updateAssessment(id, { evidenceId })
                      }
                      disabled={!!denied}
                      error={required(!row.evidenceId)}
                      className="flex flex-col gap-2 text-sm"
                    />
                  </div>
                  <FormField
                    label={t('note')}
                    htmlFor={`note-${id}`}
                    className="mt-4 !mb-0"
                    error={required(!row.note.trim())}
                    errorId={`note-${id}-error`}
                  >
                    <textarea
                      id={`note-${id}`}
                      value={row.note}
                      onChange={(event) =>
                        updateAssessment(id, { note: event.target.value })
                      }
                      placeholder={t('notePlaceholder')}
                      className={textAreaClass}
                      aria-required="true"
                      aria-invalid={!!required(!row.note.trim())}
                      aria-describedby={
                        required(!row.note.trim())
                          ? `note-${id}-error`
                          : undefined
                      }
                    />
                  </FormField>
                </section>
              )
            })}
          </fieldset>
          <section className="border-border mt-6 rounded-xl border p-5 sm:p-6">
            <h2 className="text-text-strong text-lg font-semibold">
              {t('decision')}
            </h2>
            <p className="text-text-muted mt-2 text-sm">{t('decisionIntro')}</p>
            <div className="mt-5">
              <CustomSelect
                label={t('decision')}
                value={draft.outcome}
                placeholder={t('chooseDecision')}
                options={decisions.map((value) => ({
                  value,
                  label: t(`decisions.${value}`),
                }))}
                disabled={!!denied || policyMissing}
                onChange={(outcome) => update({ outcome })}
                error={required(!draft.outcome)}
                className="flex max-w-sm flex-col gap-2 text-sm"
              />
            </div>
            <FormField
              label={t('decisionNote')}
              htmlFor="decision-note"
              className="mt-5 !mb-0"
              error={required(!draft.note.trim())}
              errorId="decision-note-error"
            >
              <textarea
                id="decision-note"
                value={draft.note}
                disabled={!!denied}
                onChange={(event) => update({ note: event.target.value })}
                placeholder={t('decisionPlaceholder')}
                className={textAreaClass}
                aria-required="true"
                aria-invalid={!!required(!draft.note.trim())}
                aria-describedby={
                  required(!draft.note.trim())
                    ? 'decision-note-error'
                    : undefined
                }
              />
            </FormField>
            {!!record.flags.length && (
              <label className="mt-4 flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={draft.flagsResolved}
                  disabled={!!denied}
                  onChange={(event) =>
                    update({ flagsResolved: event.target.checked })
                  }
                  className="accent-accent mt-0.5 size-5 shrink-0"
                />
                <span>{t('flagsResolved')}</span>
              </label>
            )}
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <Button
                variant="outline"
                className="min-h-11"
                onClick={save}
                disabled={!!denied}
              >
                <Save size={16} aria-hidden="true" />
                {t('saveDraft')}
              </Button>
              <Button
                className="min-h-11"
                onClick={prepareDecision}
                disabled={!!denied || policyMissing}
              >
                {t('submitDecision')}
              </Button>
            </div>
          </section>
          {finalEntry && (
            <section className="bg-surface-muted mt-6 space-y-3 rounded-xl p-5 text-sm">
              <p>
                {t(`decisions.${finalEntry.decision}`)} ·{' '}
                {format.timestamp(finalEntry.at, 'Asia/Bangkok', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}{' '}
                · {finalEntry.actorName}
              </p>
              {finalEntry.earliestReapplyAt && (
                <p>
                  {t('cooldown', {
                    date: format.timestamp(
                      finalEntry.earliestReapplyAt,
                      'Asia/Bangkok',
                      { dateStyle: 'medium', timeStyle: 'short' }
                    ),
                  })}
                </p>
              )}
              {finalEntry.decision === 'NEED_MORE_INFORMATION' && (
                <p>{t('sameApplication')}</p>
              )}
              {record.status === 'PENDING_FINAL_APPROVAL' && (
                <p>{t('handoff')}</p>
              )}
              <Link
                to="/reviewer/history"
                className="text-accent-text inline-flex min-h-11 items-center"
              >
                {t('history')}
              </Link>
            </section>
          )}
        </div>
      </div>
      {confirm && (
        <Modal
          title={t('submitDecision')}
          description={`${record.name} · ${t(isGate1 ? 'gate1' : 'gate2')}`}
          onClose={() => setConfirm(false)}
          footer={
            <>
              <Button
                variant="outline"
                className="min-h-11"
                onClick={() => setConfirm(false)}
              >
                {t('stay')}
              </Button>
              <Button className="min-h-11" onClick={commit}>
                {t('submitDecision')}
              </Button>
            </>
          }
        >
          <p className="text-accent-text mt-4 font-semibold">
            {draft.outcome && t(`decisions.${draft.outcome}`)}
          </p>
          <p className="mt-3 text-sm break-words whitespace-pre-wrap">
            {draft.note}
          </p>
          <p className="text-text-muted mt-3 text-xs">{t('demo')}</p>
        </Modal>
      )}
      {blocker.state === 'blocked' && (
        <Modal
          title={t('discardTitle')}
          description={t('discardBody')}
          onClose={() => blocker.reset()}
          footer={
            <>
              <Button
                variant="outline"
                className="min-h-11"
                onClick={() => blocker.reset()}
              >
                {t('stay')}
              </Button>
              <Button
                variant="destructive"
                className="min-h-11"
                onClick={() => blocker.proceed()}
              >
                {t('leave')}
              </Button>
            </>
          }
        />
      )}
    </>
  )
}
export default function ReviewerAssessmentPage({ gate }: { gate: Gate }) {
  const { t } = useTranslation('reviewer')
  const { id } = useParams()
  const { state, actor } = useReviewer()
  const record = state.records.find(
    (row) => row.id === id && row.gate === gate && row.assignedTo === actor.id
  )
  if (!record)
    return (
      <section className="border-border rounded-xl border p-8">
        <h1 className="text-text-strong text-2xl font-semibold">
          {t('notFound')}
        </h1>
        <p className="text-text-muted mt-3">{t('notFoundBody')}</p>
        <Link
          to="/reviewer"
          className="text-accent-text mt-5 inline-flex min-h-11 items-center"
        >
          {t('back')}
        </Link>
      </section>
    )
  return <AssessmentForm key={record.id} record={record} />
}
