import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, Clock3 } from 'lucide-react'
import { labels } from '../constants'
import type { Stage } from '../types'
import { SupplementForm, type SupplementFormProps } from './SupplementForm'

/** Gate 1 requirement to supplement or not met, with the reviewer's note */
export interface EligibilityIssue {
  code: string
  label: string
  result: 'FAIL' | 'NEED_MORE_INFORMATION'
  note: string
}

export interface ApplicationStatusProps {
  profileName: string
  stage: Stage
  /** Service whose qualification is furthest along, once the expert is eligible */
  serviceName?: string
  eligibilityIssues?: EligibilityIssue[]
  /** Formatted earliest date for a new application after NOT_ELIGIBLE */
  reapplyAt?: string | null
  /** Formatted time of the closing decision */
  decidedAt?: string | null
  decisionNote?: string | null
  /** Rounds of more information asked for so far and the policy limit */
  rounds?: { used: number; max: number }
  supplement: boolean
  terminal: boolean
  timeline: string[]
  progress: number
  history: string[]
  supplementFormProps: SupplementFormProps
  /** Ô xem thử các giai đoạn: chỉ ở chế độ demo khi dev */
  onRequestSupplement: () => void
}

const btnBase =
  'cursor-pointer inline-flex items-center justify-center gap-2 min-h-11 px-[17px] py-[9px] border border-ex-btn-border rounded-md bg-surface text-ex-ink font-semibold transition-[background,border-color,opacity] duration-[var(--motion-feedback)] ease-in-out hover:bg-ex-btn-hover disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none'
const btnPrimary = `${btnBase} !bg-ex-accent !border-ex-accent !text-on-accent hover:!bg-ex-accent-hover`
const noteCls =
  'px-[18px] py-4 bg-ex-note-bg rounded-[5px] my-5 text-sm [&>p:last-child]:mb-0'
const mutedCls = 'text-[13px] text-ex-muted font-normal'
const stepBubbleCls =
  'flex items-center justify-center w-6 h-6 border border-ex-step-border rounded-full text-xs'
function IssueList({
  title,
  issues,
  decisionNote,
}: {
  title: string
  issues: EligibilityIssue[]
  decisionNote?: string | null
}) {
  return (
    <>
      <strong>{title}</strong>
      <ul className="mt-2 mb-3 list-disc space-y-1 pl-5">
        {issues.map((i) => (
          <li key={i.code}>
            <span className="font-semibold">
              {i.code} · {i.label}
            </span>
            {i.note && <span className="whitespace-pre-line">: {i.note}</span>}
          </li>
        ))}
      </ul>
      {decisionNote && <p className="whitespace-pre-line">{decisionNote}</p>}
    </>
  )
}

const stepBubbleActiveCls =
  'flex items-center justify-center w-6 h-6 border border-ex-accent rounded-full text-xs bg-ex-accent text-on-accent'

export function ApplicationStatus({
  profileName,
  stage,
  eligibilityIssues = [],
  reapplyAt = null,
  decidedAt = null,
  decisionNote = null,
  rounds,
  supplement,
  terminal,
  timeline,
  progress,
  history,
  supplementFormProps,
  onRequestSupplement,
  serviceName = '',
}: ApplicationStatusProps) {
  const { t } = useTranslation('expertRegistration')

  const visibleHistory = history.filter((entry) => !/demo/i.test(entry))
  const toSupplement = eligibilityIssues.filter(
    (i) => i.result === 'NEED_MORE_INFORMATION'
  )
  const ineligible = stage === 'ineligible'
  // POL-EXP-REAPP: a new application needs a change for every failed criterion, not only the wait
  const toChange = eligibilityIssues.filter((i) => i.result === 'FAIL')
  // Colour of the status pill: problem, action needed, done, or still in review
  const tone = terminal
    ? 'danger'
    : stage === 'additional' || supplement
      ? 'warning'
      : stage === 'approved' || stage === 'eligible'
        ? 'success'
        : 'progress'

  return (
    <>
      <div className="expert-status-header">
        <div className="min-w-0">
          <h1 className="!text-[30px] !tracking-[-0.025em] [text-wrap:balance] md:!text-[34px]">
            {t(labels[stage])}
          </h1>
          <p className={mutedCls}>
            {t('dynamic.application', { name: profileName })}
          </p>
          <p>
            {stage === 'eligible'
              ? t('status.eligibleNext')
              : t('status.track')}
          </p>
        </div>
      </div>

      <ol className="expert-status-timeline">
        {timeline.map((s, i) => (
          <li
            key={s}
            className={`expert-status-stage ${i < progress ? 'is-complete' : i === progress ? 'is-current' : ''}`}
            aria-current={i === progress ? 'step' : undefined}
          >
            <span
              className={`mb-2 max-md:mb-0 ${i <= progress ? stepBubbleActiveCls : stepBubbleCls}`}
            >
              {i < progress ? <Check size={14} /> : i + 1}
            </span>
            {s}
            {i === progress && (
              <small className="text-ex-muted block max-md:ml-auto">
                {terminal
                  ? t('status.notApproved')
                  : stage === 'approved'
                    ? t('status.approved')
                    : t('status.current')}
              </small>
            )}
          </li>
        ))}
      </ol>

      <section
        className={`expert-status-action ${terminal ? 'is-terminal' : ''}`}
      >
        <span className="expert-status-pill" data-tone={tone}>
          <span className="expert-status-pill-dot" aria-hidden="true" />
          {terminal
            ? t('status.outcome')
            : stage === 'additional' || supplement
              ? t('status.action')
              : stage === 'approved' || stage === 'eligible'
                ? t('status.complete')
                : t('status.inProgress')}
        </span>
        <h2>
          {supplement
            ? t('status.supplement')
            : terminal
              ? t('status.reassess')
              : stage === 'approved'
                ? t('status.selectedApproved')
                : stage === 'screening'
                  ? t('status.screening')
                  : stage === 'eligibility'
                    ? t('status.eligibilityTitle')
                    : t('status.next')}
        </h2>
        {supplement ? (
          <SupplementForm {...supplementFormProps} />
        ) : stage === 'additional' ? (
          <>
            <p>{t('status.additional')}</p>
            {!!rounds?.used && (
              <p className={mutedCls}>
                {t('status.rounds', { used: rounds.used, max: rounds.max })}
              </p>
            )}
            <div className={noteCls}>
              {toSupplement.length ? (
                <IssueList
                  title={t('status.toSupplement')}
                  issues={toSupplement}
                  decisionNote={decisionNote}
                />
              ) : (
                <>
                  <strong>{t('status.qualification')}</strong>
                  <p>{t('status.clarify')}</p>
                </>
              )}
              <small>{t('status.noDeadline')}</small>
            </div>
            <button className={btnPrimary} onClick={onRequestSupplement}>
              {t('status.provide')}
              <ArrowRight size={16} />
            </button>
          </>
        ) : terminal ? (
          <>
            <p>
              {ineligible
                ? t('status.eligibilityUnmet')
                : t('status.competencyUnmet')}
            </p>
            <div className={noteCls}>
              {ineligible && eligibilityIssues.length ? (
                <IssueList
                  title={t('status.unmetCriteria')}
                  issues={eligibilityIssues}
                  decisionNote={decisionNote}
                />
              ) : (
                <>
                  <strong>{t('status.illustrative')}</strong>
                  <p>
                    {ineligible
                      ? t('status.experienceUnmet')
                      : t('status.evidenceUnmet')}
                  </p>
                </>
              )}
            </div>
            {ineligible && decidedAt && (
              <p>{t('dynamic.decidedAt', { date: decidedAt })}</p>
            )}
            <p>
              {ineligible && reapplyAt
                ? t('dynamic.reapplyFrom', { date: reapplyAt })
                : t('status.reapplyAfterWait')}
            </p>
            {ineligible && toChange.length > 0 && (
              <p>
                {t('dynamic.changeBeforeReapply', {
                  criteria: toChange.map((i) => i.label).join(', '),
                })}
              </p>
            )}
            <p>{t('status.corrections')}</p>
          </>
        ) : stage === 'approved' ? (
          <>
            <p>
              <Trans
                ns="expertRegistration"
                i18nKey="dynamic.approved"
                values={{ service: serviceName }}
                components={{ service: <strong /> }}
              />
            </p>
            <p>{t('status.priceNext')}</p>
            <div className={noteCls}>{t('status.priceDisconnected')}</div>
          </>
        ) : stage === 'eligible' ? (
          <>
            <p>{t('status.eligible')}</p>
            <p>{t('status.catalogue')}</p>
            {/* Next step: competency evidence. With one service it was opened automatically; otherwise the expert
                registers a service there first */}
            <Link to="/expert/qualifications" className={btnPrimary}>
              {t('status.preview')}
              <ArrowRight size={16} />
            </Link>
          </>
        ) : stage === 'returned' ? (
          <p>{t('status.returned')}</p>
        ) : (
          <>
            <p>
              {stage === 'screening'
                ? t('status.aiDescription')
                : stage === 'eligibility'
                  ? t('status.eligibilityDescription')
                  : stage === 'competency'
                    ? t('status.competencyDescription', { service: serviceName })
                    : t('status.finalDescription')}
            </p>
            {(stage === 'competency' || stage === 'final') && (
              <Link to="/expert/qualifications" className={btnBase}>
                {t('status.viewQualifications')}
                <ArrowRight size={16} />
              </Link>
            )}
          </>
        )}
        {!terminal &&
          !supplement &&
          stage !== 'additional' &&
          stage !== 'approved' &&
          stage !== 'eligible' && (
            <div className="expert-status-reassurance">
              <Clock3 size={17} aria-hidden="true" />
              <span>{t('status.noAction')}</span>
            </div>
          )}
        {visibleHistory.length > 0 && (
          <section className="expert-status-activity">
            <h3>{t('status.history')}</h3>
            <ol>
              {[...visibleHistory].reverse().map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ol>
          </section>
        )}
      </section>
    </>
  )
}
