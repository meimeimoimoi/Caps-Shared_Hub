import { Trans, useTranslation } from 'react-i18next'
import {
  ArrowRight,
  Check,
  ScanLine,
  ShieldCheck,
  Clock3,
  CircleAlert,
} from 'lucide-react'
import { labels } from '../constants'
import type { Stage } from '../types'
import { SupplementForm, type SupplementFormProps } from './SupplementForm'
import { ScenarioSelect } from './ScenarioSelect'

export interface ApplicationStatusProps {
  profileName: string
  stage: Stage
  supplement: boolean
  terminal: boolean
  timeline: string[]
  progress: number
  history: string[]
  supplementFormProps: SupplementFormProps
  onStageChange: (stage: Stage) => void
  onRequestSupplement: () => void
  onPreviewServiceReview: () => void
}

const btnBase =
  'cursor-pointer inline-flex items-center justify-center gap-2 min-h-11 px-[17px] py-[9px] border border-ex-btn-border rounded-md bg-surface text-ex-ink font-semibold transition-[background,border-color,opacity] duration-[var(--motion-feedback)] ease-in-out hover:bg-ex-btn-hover disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none'
const btnPrimary = `${btnBase} !bg-ex-accent !border-ex-accent !text-on-accent hover:!bg-ex-accent-hover`
const noteCls =
  'px-[18px] py-4 bg-ex-note-bg rounded-[5px] my-5 text-sm [&>p:last-child]:mb-0'
const mutedCls = 'text-[13px] text-ex-muted font-normal'
const stepBubbleCls =
  'flex items-center justify-center w-6 h-6 border border-ex-step-border rounded-full text-xs'
const stepBubbleActiveCls =
  'flex items-center justify-center w-6 h-6 border border-ex-accent rounded-full text-xs bg-ex-accent text-on-accent'

export function ApplicationStatus({
  profileName,
  stage,
  supplement,
  terminal,
  timeline,
  progress,
  history,
  supplementFormProps,
  onStageChange,
  onRequestSupplement,
  onPreviewServiceReview,
}: ApplicationStatusProps) {
  const { t } = useTranslation('expertRegistration')

  const visibleHistory = history.filter((entry) => !/demo/i.test(entry))

  return (
    <>
      <div className="expert-status-header">
        <div className="min-w-0">
          <h1 className="!text-[36px] !tracking-[-0.025em] [text-wrap:balance] md:!text-[48px]">
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
        <ScenarioSelect value={stage} onChange={onStageChange} />
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
        <div className="expert-status-action-top">
          <span className="expert-status-state-icon" aria-hidden="true">
            {terminal || stage === 'additional' ? (
              <CircleAlert size={26} />
            ) : stage === 'approved' || stage === 'eligible' ? (
              <ShieldCheck size={26} />
            ) : (
              <ScanLine size={26} />
            )}
          </span>
          <span className="expert-status-state-label">
            {terminal
              ? t('status.outcome')
              : stage === 'additional' || supplement
                ? t('status.action')
                : stage === 'approved' || stage === 'eligible'
                  ? t('status.complete')
                  : t('status.inProgress')}
          </span>
        </div>
        <h2>
          {supplement
            ? t('status.supplement')
            : terminal
              ? t('status.reassess')
              : stage === 'approved'
                ? t('status.selectedApproved')
                : stage === 'screening'
                  ? t('status.screening')
                  : t('status.next')}
        </h2>
        {supplement ? (
          <SupplementForm {...supplementFormProps} />
        ) : stage === 'additional' ? (
          <>
            <p>{t('status.additional')}</p>
            <div className={noteCls}>
              <strong>{t('status.qualification')}</strong>
              <p>{t('status.clarify')}</p>
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
              {stage === 'ineligible'
                ? t('status.eligibilityUnmet')
                : t('status.competencyUnmet')}
            </p>
            <div className={noteCls}>
              <strong>{t('status.illustrative')}</strong>
              <p>
                {stage === 'ineligible'
                  ? t('status.experienceUnmet')
                  : t('status.evidenceUnmet')}
              </p>
            </div>
            <p>
              {t('dynamic.reapply', { days: stage === 'ineligible' ? 30 : 90 })}
            </p>
            <p>{t('status.corrections')}</p>
          </>
        ) : stage === 'approved' ? (
          <>
            <p>
              <Trans
                ns="expertRegistration"
                i18nKey="dynamic.approved"
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
            <button onClick={onPreviewServiceReview} className={btnPrimary}>
              {t('status.preview')}
              <ArrowRight size={16} />
            </button>
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
                    ? t('status.competencyDescription')
                    : t('status.finalDescription')}
            </p>
            <p className={mutedCls}>{t('status.noDate')}</p>
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
          <details className="expert-status-history">
            <summary>{t('status.history')}</summary>
            <ul>
              {visibleHistory.map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ul>
          </details>
        )}
      </section>
    </>
  )
}
