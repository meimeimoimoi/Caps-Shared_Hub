import { useTranslation } from 'react-i18next'
import { Check, CheckCircle2, MailWarning } from 'lucide-react'
import { useFormatters } from '@/hooks/useFormatters'
import type { steps as wizardSteps } from '../constants'

/** Server codes of what is still missing before submitting (ExpertProfile.MissingRequirements). */
const MISSING_LABEL = {
  phone: 'rail.missing.phone',
  yearsExperience: 'rail.missing.yearsExperience',
  fields: 'rail.missing.fields',
  CV: 'rail.missing.cv',
} as const

const missingLabel = (code: string) =>
  code in MISSING_LABEL
    ? MISSING_LABEL[code as keyof typeof MISSING_LABEL]
    : null

export interface ApplicationProgressRailProps {
  /** The wizard steps, in order */
  steps: typeof wizardSteps
  step: number
  /** Furthest step reached; steps up to it stay open */
  furthest: number
  onMove: (step: number) => void
  email: string
  emailVerified: boolean
  /** Current file limit, shown while the email is unverified */
  fileLimit?: number
  /** Opens the verification dialog */
  onVerify: () => void
  /** Codes from the server; empty when everything required is there */
  missing: string[]
}

/**
 * Side rail of the application wizard: where the applicant is, whether the email is verified, and what
 * still blocks submitting. Sticks beside the form on wide screens and sits above it on narrow ones.
 */
export function ApplicationProgressRail({
  steps,
  step,
  furthest,
  onMove,
  email,
  emailVerified,
  fileLimit,
  onVerify,
  missing,
}: ApplicationProgressRailProps) {
  const { t } = useTranslation('expertRegistration')
  const format = useFormatters()

  return (
    <aside className="expert-progress-rail" aria-label={t('rail.title')}>
      <section>
        <div className="expert-rail-head">
          <h2 className="expert-rail-title">{t('rail.title')}</h2>
          <span className="expert-rail-count">
            {t('rail.stepCount', {
              current: format.number(step + 1),
              total: format.number(steps.length),
            })}
          </span>
        </div>
        <ol className="expert-rail-steps">
          {steps.map((s, i) => {
            const state =
              i === step
                ? 'current'
                : i <= Math.max(furthest, step)
                  ? 'done'
                  : 'next'
            return (
              <li key={s} data-state={state}>
                <button
                  type="button"
                  disabled={i > Math.max(furthest, step)}
                  onClick={() => onMove(i)}
                  aria-current={i === step ? 'step' : undefined}
                  aria-label={t(
                    state === 'done'
                      ? 'counts.completedStep'
                      : 'counts.stepLabel',
                    { step: format.number(i + 1), label: t(s) }
                  )}
                >
                  <span className="expert-rail-bubble" aria-hidden="true">
                    {state === 'done' ? (
                      <Check size={14} strokeWidth={3} />
                    ) : (
                      i + 1
                    )}
                  </span>
                  <span className="expert-rail-step-text">
                    <span className="expert-rail-step-label">{t(s)}</span>
                    {state !== 'next' && (
                      <span className="expert-rail-step-state">
                        {t(
                          state === 'done'
                            ? 'rail.stepDone'
                            : 'rail.stepCurrent'
                        )}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </section>

      <section className="expert-rail-block">
        {emailVerified ? (
          <p className="expert-rail-status" data-tone="ok">
            <CheckCircle2 size={18} aria-hidden="true" />
            <span>{t('rail.emailVerified')}</span>
          </p>
        ) : (
          <>
            <p className="expert-rail-status" data-tone="warn">
              <MailWarning size={18} aria-hidden="true" />
              <span>{t('rail.emailUnverified')}</span>
            </p>
            <p className="expert-rail-note">
              {t('rail.emailSentTo')} <strong>{email}</strong>
            </p>
            {fileLimit != null && (
              <p className="expert-rail-note">
                {t('rail.fileLimit', { max: format.number(fileLimit) })}
              </p>
            )}
            <button
              type="button"
              className="expert-rail-action"
              onClick={onVerify}
            >
              {t('rail.verify')}
            </button>
          </>
        )}
      </section>

      <section className="expert-rail-block">
        <h3 className="expert-rail-subtitle">{t('rail.requirementsTitle')}</h3>
        {missing.length === 0 ? (
          <p className="expert-rail-status" data-tone="ok">
            <CheckCircle2 size={18} aria-hidden="true" />
            <span>{t('rail.requirementsDone')}</span>
          </p>
        ) : (
          <ul className="expert-rail-missing">
            {missing.map((code) => {
              const label = missingLabel(code)
              return <li key={code}>{label ? t(label) : code}</li>
            })}
          </ul>
        )}
      </section>
    </aside>
  )
}
