import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { ELIGIBILITY_RESULTS, EXPERIENCE_CODE } from '../constants'
import { needsNote } from '../hooks/useApplicationReview'
import type {
  ApplicationDetail,
  EligibilityAssessment,
  EligibilityResult,
} from '../types'
import { useEligibilityLabel } from '../hooks/useLabels'

interface EligibilityReviewProps {
  detail: ApplicationDetail
  assessments: EligibilityAssessment[]
  disabled: boolean
  onResult: (code: string, result: EligibilityResult) => void
  onNote: (code: string, note: string) => void
}

/* Gate 1 form: one result per requirement EV-01…EV-06; any result other than PASS needs a note */
export function EligibilityReview({
  detail,
  assessments,
  disabled,
  onResult,
  onNote,
}: EligibilityReviewProps) {
  const { t } = useTranslation('admin')
  const label = useEligibilityLabel()
  // Results of the previous decision (the applicant has supplemented since)
  const previous = new Map(detail.eligibility.map((c) => [c.code, c]))
  const belowMinimum = detail.suggestedExperienceResult === 'FAIL'

  return (
    <section className="paper p-5 md:p-6">
      <h2 className="text-h2">{t('eligibility.title')}</h2>
      <p className="text-fg-muted text-sm">{t('eligibility.subtitle')}</p>

      {assessments.map((a) => {
        const experience = a.code === EXPERIENCE_CODE
        const required = needsNote(a)
        const before = previous.get(a.code)
        return (
          <fieldset
            key={a.code}
            disabled={disabled}
            className="border-border-subtle mt-5 border-t pt-5"
          >
            <legend className="sr-only">{label(a.code)}</legend>
            <p className="text-fg-strong font-semibold">
              <span className="num">{a.code}</span> {label(a.code)}
            </p>
            {experience && (
              <p className="text-fg-muted text-sm">
                {t('eligibility.experienceHint', {
                  years: detail.years,
                  min: detail.minYearsExperience,
                })}
                {belowMinimum && ` ${t('eligibility.experienceBelow')}`}
              </p>
            )}
            {before && (
              <p className="text-fg-muted text-sm">
                {t('eligibility.previous', {
                  result: t(`eligibility.results.${before.result}`),
                })}
                {before.note && ` · ${before.note}`}
              </p>
            )}
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {ELIGIBILITY_RESULTS.map((result) => {
                const locked = experience && belowMinimum && result === 'PASS'
                return (
                  <label
                    key={result}
                    className={cn(
                      'rounded-control min-h-control flex items-center justify-center gap-1.5 border px-2 py-1 text-center text-sm',
                      locked
                        ? 'cursor-not-allowed opacity-55'
                        : 'cursor-pointer',
                      a.result === result
                        ? 'border-border-strong bg-sunken text-fg-strong shadow-pressed font-semibold'
                        : 'border-border-control shadow-control'
                    )}
                  >
                    <input
                      type="radio"
                      name={`result-${a.code}`}
                      checked={a.result === result}
                      disabled={locked}
                      onChange={() => onResult(a.code, result)}
                      className="accent-ink"
                    />
                    {t(`eligibility.results.${result}`)}
                  </label>
                )
              })}
            </div>
            <label className="mt-3 flex flex-col gap-2 text-sm font-semibold">
              {required
                ? t('eligibility.noteRequired')
                : t('eligibility.noteOptional')}
              <textarea
                required={required}
                rows={2}
                maxLength={2000}
                value={a.note}
                onChange={(e) => onNote(a.code, e.target.value)}
                placeholder={
                  required ? t('eligibility.notePlaceholder') : undefined
                }
                className="border-border-control rounded-control shadow-control bg-paper placeholder:text-fg-muted resize-y border px-3 py-2 text-base font-normal"
              />
            </label>
          </fieldset>
        )
      })}
    </section>
  )
}
