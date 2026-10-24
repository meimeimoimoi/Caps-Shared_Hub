import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, FileText, Link2 } from 'lucide-react'
import { ApiError } from '@/lib/api-client'
import { Button } from '@/components/ui/actions/button'
import { HelpTip } from '@/components/ui/feedback/help-tip'
import { useExpertPresentation } from '@/features/expert-dashboard/hooks/useExpertPresentation'
import {
  COMPETENCY_CODES,
  CompetencyEvidenceStep,
  ServiceNextSteps,
  openOwnFile,
  useQualification,
  type QualificationFile,
} from '@/features/expert-qualifications'

type CompetencyCode = (typeof COMPETENCY_CODES)[number]
const isCompetencyCode = (code: string): code is CompetencyCode =>
  (COMPETENCY_CODES as readonly string[]).includes(code)

const ACTION_ERRORS = [
  'EVIDENCE_REQUIRED',
  'EVIDENCE_TOO_LARGE',
  'EVIDENCE_INVALID_TYPE',
  'EVIDENCE_LIMIT',
  'EVIDENCE_LOCKED',
  'QUALIFICATION_LOCKED',
  'SUPPLEMENT_EMPTY',
  'EMAIL_NOT_VERIFIED',
  'NEW_EVIDENCE_REQUIRED',
  'EVIDENCE_INVALID_URL',
  'EVIDENCE_NOT_FOUND',
  'EVIDENCE_COMPETENCY_REQUIRED',
  'INVALID_COMPETENCY_CODE',
  'COMPETENCY_DESCRIPTION_TOO_LONG',
  'COMPETENCY_EVIDENCE_MISSING',
  'COMPETENCY_NEW_EVIDENCE_REQUIRED',
] as const
type ActionError = (typeof ACTION_ERRORS)[number]
const isActionError = (code?: string): code is ActionError =>
  (ACTION_ERRORS as readonly (string | undefined)[]).includes(code)

/** One competency assessment: evidence by competency while preparing or supplementing, results and history */
export default function ExpertQualificationPage() {
  const { t } = useTranslation('expert')
  const display = useExpertPresentation()
  const { id = '' } = useParams()
  const q = useQualification(id)
  const [note, setNote] = useState('')
  const [message, setMessage] = useState<{
    tone: 'ok' | 'error'
    text: string
  } | null>(null)
  const data = q.data
  const time = (at: string) =>
    display.timestamp(at, 'Asia/Ho_Chi_Minh', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
  const competencyName = (code: string) =>
    isCompetencyCode(code) ? t(`qualifications.competencies.${code}`) : code
  const fail = (e: unknown) =>
    setMessage({
      tone: 'error',
      text:
        e instanceof ApiError && isActionError(e.code)
          ? t(`qualifications.errors.${e.code}`)
          : t('qualifications.errors.failed'),
    })

  const back = (
    <Link
      to="/expert/qualifications"
      className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm text-[var(--ep-muted)]"
    >
      <ArrowLeft size={16} aria-hidden="true" />
      {t('qualifications.back')}
    </Link>
  )
  if (!data)
    return (
      <>
        {back}
        <p className="text-sm text-[var(--ep-muted)]">
          {q.isLoading
            ? t('qualifications.loading')
            : t('qualifications.notFound')}
        </p>
      </>
    )

  // Open a blank tab first so the browser does not block the popup after the download
  const open = (evidenceId: string) => {
    const win = window.open('', '_blank')
    openOwnFile(evidenceId)
      .then((blob) => {
        if (!win) throw new Error('blocked')
        win.location.href = URL.createObjectURL(blob)
      })
      .catch(() => {
        win?.close()
        setMessage({ tone: 'error', text: t('qualifications.errors.open') })
      })
  }
  // A link opens directly; a file is downloaded through the expert's own file endpoint
  const openEvidence = (e: QualificationFile) => {
    if (e.sourceUrl && /^https?:\/\//i.test(e.sourceUrl))
      window.open(e.sourceUrl, '_blank', 'noopener,noreferrer')
    else open(e.id)
  }
  const tiedNames = (evidenceId: string) =>
    data.submitted
      .filter((s) => s.evidenceIds.includes(evidenceId))
      .map((s) => competencyName(s.code))
      .join(', ')
  const supplement = () => {
    setMessage(null)
    q.supplement.mutate(note, {
      onSuccess: () => {
        setNote('')
        setMessage({ tone: 'ok', text: t('qualifications.supplemented') })
      },
      onError: fail,
    })
  }
  const issues = data.competencies.filter((c) => c.result !== 'PASS')
  const needsInfo = data.status === 'NEED_MORE_INFORMATION'
  const preparing = data.status === 'PREPARING'
  // Gate 2 and final approval read as one review to the expert; evidence is locked meanwhile (D4, D5)
  const underReview =
    data.status === 'COMPETENCY_REVIEW' || data.status === 'PENDING_FINAL_APPROVAL'
  const busy = q.upload.isPending || q.remove.isPending || q.supplement.isPending

  return (
    <>
      {back}
      <div className="ep-page-heading">
        <div>
          <h1>{data.serviceName}</h1>
          <p>
            {display.qualification(data.status)} ·{' '}
            {t('qualifications.submittedAt', { date: time(data.submittedAt) })}
          </p>
        </div>
      </div>

      {message && (
        <p
          role={message.tone === 'error' ? 'alert' : 'status'}
          className={`mt-4 rounded-lg p-3 text-sm ${message.tone === 'error' ? 'bg-[var(--ep-danger-bg)] text-[var(--ep-danger)]' : 'bg-[var(--ep-success-bg)] text-[var(--ep-success)]'}`}
        >
          {message.text}
        </p>
      )}

      <section className="mt-6 rounded-lg border border-[var(--ep-border)] bg-[var(--ep-surface)] p-5">
        <h2 className="font-semibold text-[var(--ep-ink)]">
          {t('qualifications.statusTitle')}
        </h2>
        <p className="mt-2 text-sm">
          {data.awaitsNewEvidence
            ? t('qualifications.newEvidenceRequired')
            : t(`qualifications.statusHelp.${data.status}`)}
        </p>
        {underReview && data.expectedResultBy && (
          <p className="mt-2 text-sm font-semibold text-[var(--ep-ink)]">
            {t('qualifications.expectedBy', {
              date: display.timestamp(data.expectedResultBy, 'Asia/Ho_Chi_Minh', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              }),
            })}
          </p>
        )}
        {data.earliestReapplyAt && (
          <p className="mt-2 text-sm">
            {t('qualifications.reapplyFrom', {
              date: time(data.earliestReapplyAt),
            })}
          </p>
        )}
        {data.decisionNote && (
          <p className="mt-2 text-sm whitespace-pre-line">
            {data.decisionNote}
          </p>
        )}
        {data.competencies.length > 0 && (
          <ul className="mt-4 divide-y divide-[var(--ep-line)] text-sm">
            {(needsInfo ? issues : data.competencies).map((c) => (
              <li key={c.code} className="py-2.5">
                <div className="flex justify-between gap-4">
                  <span className="text-[var(--ep-ink)]">
                    {competencyName(c.code)}
                  </span>
                  <span
                    className={`shrink-0 font-semibold ${c.result === 'FAIL' ? 'text-[var(--ep-danger)]' : c.result === 'NEED_MORE_INFORMATION' ? 'text-[var(--ep-warning)]' : 'text-[var(--ep-success)]'}`}
                  >
                    {t(`qualifications.results.${c.result}`)}
                  </span>
                </div>
                <p className="mt-1 whitespace-pre-line text-[var(--ep-muted)]">
                  {c.note}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {data.status === 'APPROVED_FOR_SERVICE' && (
        <ServiceNextSteps serviceCode={data.serviceCode} />
      )}

      {preparing || needsInfo ? (
        <CompetencyEvidenceStep
          data={data}
          upload={q.upload}
          addLink={q.addLink}
          tie={q.tie}
          describe={q.describe}
          remove={q.remove}
          submit={
            preparing
              ? {
                  isPending: q.submit.isPending,
                  mutateAsync: () =>
                    q.submit.mutateAsync().then(() =>
                      setMessage({ tone: 'ok', text: t('qualifications.evidence.submitted') })
                    ),
                }
              : undefined
          }
          onOpen={openEvidence}
          onError={(e) => {
            setMessage(null)
            fail(e)
          }}
        />
      ) : (
        <section className="mt-6 rounded-lg border border-[var(--ep-border)] bg-[var(--ep-surface)] p-5">
          <div className="flex items-center gap-1.5">
            <h2 className="font-semibold text-[var(--ep-ink)]">
              {t('qualifications.filesTitle')}
            </h2>
            {underReview && (
              <HelpTip label={t('qualifications.filesTitle')}>
                {t('qualifications.lockedHelp')}
              </HelpTip>
            )}
          </div>
          <ul className="mt-3 divide-y divide-[var(--ep-line)] text-sm">
            {data.evidence
              .filter((e) => e.code === 'COMPETENCY')
              .map((e) => (
                <li key={e.id} className="py-2">
                  <button
                    type="button"
                    onClick={() => openEvidence(e)}
                    className="inline-flex min-h-11 items-center gap-2 text-left text-[var(--ep-accent-text)]"
                  >
                    {e.sourceUrl ? <Link2 size={15} aria-hidden="true" /> : <FileText size={15} aria-hidden="true" />}
                    <span>{e.sourceUrl || e.fileName}</span>
                  </button>
                  {tiedNames(e.id) && (
                    <p className="text-[var(--ep-muted)]">{tiedNames(e.id)}</p>
                  )}
                </li>
              ))}
          </ul>
        </section>
      )}

      {needsInfo && (
        <section className="mt-6 rounded-lg border border-[var(--ep-border)] bg-[var(--ep-surface)] p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-[var(--ep-ink)]">
              {t('qualifications.supplementTitle')}
            </h2>
            {data.rounds.used > 0 && (
              <span className="rounded bg-[var(--ep-bg)] px-1.5 py-0.5 text-xs text-[var(--ep-muted)] tabular-nums">
                {t('qualifications.rounds', { used: data.rounds.used, max: data.rounds.max })}
              </span>
            )}
          </div>
          <label className="mt-3 flex flex-col gap-2 text-sm font-semibold">
            {t('qualifications.supplementNote')}
            <textarea
              rows={3}
              maxLength={2000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="resize-y rounded-lg border border-[var(--ep-border)] bg-[var(--ep-bg)] px-3 py-2 font-normal"
            />
          </label>
          {!data.canSupplement && (
            <p className="mt-2 text-sm text-[var(--ep-warning)]">
              {t('qualifications.errors.EMAIL_NOT_VERIFIED')}
            </p>
          )}
          <div className="mt-4 flex justify-end">
            <Button
              className="min-h-11"
              disabled={busy || !data.canSupplement}
              onClick={supplement}
            >
              {t('qualifications.supplementSubmit')}
            </Button>
          </div>
        </section>
      )}

      <section className="mt-6 rounded-lg border border-[var(--ep-border)] bg-[var(--ep-surface)] p-5">
        <h2 className="font-semibold text-[var(--ep-ink)]">
          {t('qualifications.historyTitle')}
        </h2>
        <ol className="mt-3 divide-y divide-[var(--ep-line)] text-sm">
          {[...data.history].reverse().map((h, i) => (
            <li key={i} className="grid gap-1 py-2 sm:grid-cols-[150px_1fr]">
              <span className="text-[var(--ep-muted)]">{time(h.at)}</span>
              <span>
                {display.qualification(h.toStatus)}
                {h.note && ` · ${h.note}`}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </>
  )
}
