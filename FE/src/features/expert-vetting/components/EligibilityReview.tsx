import { useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Circle, CircleAlert, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { ELIGIBILITY_RESULTS, EXPERIENCE_CODE } from '../constants'
import { needsNote } from '../hooks/useApplicationReview'
import type { ApplicationDetail, EligibilityAssessment, EligibilityResult } from '../types'
import { useEligibilityLabel } from '../hooks/useLabels'
import { EvidenceList } from './EvidenceList'
import { documentKey } from '../utils/applications'

interface EligibilityReviewProps {
  detail: ApplicationDetail
  assessments: EligibilityAssessment[]
  disabled: boolean
  onResult: (code: string, result: EligibilityResult) => void
  onNote: (code: string, note: string) => void
  onShowDocument: (key: string) => void
}

const resultStyle = {
  PASS: { Icon: Check, selected: 'border-success bg-success/10 text-success' },
  NEED_MORE_INFORMATION: { Icon: CircleAlert, selected: 'border-warning bg-warning/10 text-warning' },
  FAIL: { Icon: X, selected: 'border-danger bg-danger/10 text-danger' },
}

const isComplete = (assessment: EligibilityAssessment) =>
  !!assessment.result && (!needsNote(assessment) || !!assessment.note.trim())

/** A visible checklist keeps navigation separate from the focused assessment editor. */
export function EligibilityReview({ detail, assessments, disabled, onResult, onNote, onShowDocument }: EligibilityReviewProps) {
  const { t } = useTranslation('admin')
  const label = useEligibilityLabel()
  const [activeCode, setActiveCode] = useState(() => assessments.find((item) => !isComplete(item))?.code)
  const heading = useRef<HTMLHeadingElement>(null)
  const current = Math.max(0, assessments.findIndex((item) => item.code === activeCode))
  const assessment = assessments[current]
  const completed = assessments.filter(isComplete).length
  const nextIncomplete = [...assessments.slice(current + 1), ...assessments.slice(0, current)].find((item) => !isComplete(item))

  if (!assessment) return null

  const required = needsNote(assessment)
  const missingNote = required && !assessment.note.trim()
  const experience = assessment.code === EXPERIENCE_CODE
  const belowMinimum = detail.suggestedExperienceResult === 'FAIL'
  const before = detail.eligibility.find((item) => item.code === assessment.code)
  // Files the applicant attached to this requirement; the experience requirement is judged on the CV, and a
  // requirement sent back also lists the supplementary files sent in reply
  const sentBack = !!before && before.result !== 'PASS'
  const evidence = detail.documents.filter(
    (d) => d.code === assessment.code || (experience && d.code === 'CV') || (sentBack && d.code === 'SUPPLEMENT')
  )
  const moveTo = (code: string) => {
    setActiveCode(code)
    requestAnimationFrame(() => heading.current?.focus())
  }

  return (
    <section aria-labelledby="eligibility-title" className="border-border bg-surface overflow-hidden rounded-lg border">
      <header className="border-border border-b px-4 py-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="eligibility-title" className="text-text-strong !font-sans !text-base font-semibold">{t('eligibility.title')}</h2>
          <span role="status" aria-label={t('reviewWorkspace.progress')} className="text-text-muted text-sm tabular-nums">{completed}/{assessments.length}</span>
        </div>
        <p className="text-text-muted mt-0.5 text-sm">{t('reviewWorkspace.assessmentHint')}</p>
        <progress value={completed} max={assessments.length} aria-label={t('reviewWorkspace.progress')} className="mt-3 block h-1 w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:bg-[var(--ui-surface-muted)] [&::-webkit-progress-value]:bg-[var(--ui-text-strong)] [&::-moz-progress-bar]:bg-[var(--ui-text-strong)]" />
      </header>

      <label className="border-border bg-surface-muted/50 block border-b p-5 text-sm font-medium sm:hidden">
        {t('reviewWorkspace.criteriaNavigation')}
        <select value={assessment.code} onChange={(event) => moveTo(event.target.value)} className="border-border-control bg-surface text-text-strong focus-visible:ring-[var(--ui-border-strong)] mt-2 min-h-12 w-full rounded-lg border px-3 py-2 text-sm focus-visible:ring-2">
          {assessments.map((item) => <option key={item.code} value={item.code}>{label(item.code)} · {item.result ? t(`eligibility.results.${item.result}`) : t('reviewWorkspace.notAssessed')}</option>)}
        </select>
      </label>
      <nav aria-label={t('reviewWorkspace.criteriaNavigation')} className="border-border divide-border hidden border-b sm:grid sm:grid-cols-2 sm:divide-x [&>*:nth-child(n+3)]:border-t [&>*:nth-child(n+3)]:border-[var(--ui-border)]">
        {assessments.map((item) => {
          const done = isComplete(item)
          const active = item.code === assessment.code
          const Icon = done ? Check : item.result ? CircleAlert : Circle
          return (
            <button key={item.code} type="button" aria-current={active ? 'step' : undefined} aria-controls="criterion-editor" onClick={() => moveTo(item.code)} className={cn('focus-visible:ring-[var(--ui-border-strong)] relative flex min-h-14 items-center gap-3 px-4 py-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:outline-none', active ? 'bg-surface-muted text-text-strong before:bg-text-strong before:absolute before:inset-y-0 before:left-0 before:w-0.5' : 'text-text-muted hover:bg-surface-muted/60')}>
              <Icon size={16} aria-hidden="true" className={cn('shrink-0', done && (item.result === 'PASS' ? 'text-success' : item.result === 'FAIL' ? 'text-danger' : 'text-warning'))} />
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-x-1.5 text-xs"><span className={cn(done && item.result === 'PASS' && 'text-success', done && item.result === 'FAIL' && 'text-danger', ((done && item.result === 'NEED_MORE_INFORMATION') || (!done && item.result)) && 'text-warning')}>{done && item.result ? t(`eligibility.results.${item.result}`) : item.result ? t('reviewWorkspace.missingNote') : t('reviewWorkspace.notAssessed')}</span></span>
                <span className={cn('mt-0.5 block text-sm leading-5', active ? 'font-medium' : 'text-text-strong')}>{label(item.code)}</span>
              </span>
            </button>
          )
        })}
      </nav>

      <div id="criterion-editor" className="p-4">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h3 id="criterion-heading" ref={heading} tabIndex={-1} className="text-text-strong scroll-mt-24 text-base font-semibold outline-none">{label(assessment.code)}</h3>
          <span className="text-text-muted shrink-0 text-sm tabular-nums">{current + 1}/{assessments.length}</span>
        </div>
        <section aria-labelledby="criterion-evidence" className="mb-5">
          <h4 id="criterion-evidence" className="text-text-strong mb-2 text-sm font-medium">{t('detail.documents.forCriterion')}</h4>
          <EvidenceList documents={evidence} onOpen={(d) => onShowDocument(documentKey(d))} showGroup={false} emptyText={t('detail.documents.noneForCriterion')} />
        </section>
        {experience && <p className="bg-surface-muted text-text mb-5 rounded-lg p-4 text-sm leading-6">{t('eligibility.experienceHint', { years: detail.years, min: detail.minYearsExperience })}{belowMinimum && ` ${t('eligibility.experienceBelow')}`}</p>}
        {before && <p className="text-text-muted mb-5 text-sm leading-6">{t('eligibility.previous', { result: t(`eligibility.results.${before.result}`) })}{before.note && ` · ${before.note}`}</p>}

        <fieldset disabled={disabled}>
          <legend className="text-text-strong mb-2 text-sm font-medium">{t('reviewWorkspace.assessmentResult')}</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {ELIGIBILITY_RESULTS.map((result) => {
              const locked = experience && belowMinimum && result === 'PASS'
              const selected = assessment.result === result
              const { Icon, selected: selectedStyle } = resultStyle[result]
              return (
                <label key={result} className={cn('flex min-h-11 items-center gap-2.5 rounded-md border px-3 py-2 text-sm leading-5 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--ui-border-strong)]', locked || disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer', selected ? `${selectedStyle} font-medium` : 'border-border text-text hover:bg-surface-muted')}>
                  <input type="radio" name={`result-${assessment.code}`} checked={selected} disabled={locked} onChange={() => onResult(assessment.code, result)} className="size-4 shrink-0 accent-current focus-visible:outline-none" />
                  <span className="flex flex-1 flex-wrap items-center justify-between gap-1">{t(`eligibility.results.${result}`)}<Icon size={16} aria-hidden="true" /></span>
                </label>
              )
            })}
          </div>
          <label htmlFor={`note-${assessment.code}`} className="text-text-strong mt-5 block text-sm font-medium">{required ? t('eligibility.noteRequired') : t('eligibility.noteOptional')}</label>
          <textarea key={assessment.code} id={`note-${assessment.code}`} required={required} rows={4} maxLength={2000} value={assessment.note} onChange={(event) => onNote(assessment.code, event.target.value)} aria-describedby={missingNote ? 'criterion-note-hint' : undefined} placeholder={required ? t('eligibility.notePlaceholder') : t('reviewWorkspace.optionalNotePlaceholder')} className={cn('bg-surface text-text placeholder:text-text-muted focus-visible:ring-[var(--ui-border-strong)] mt-1.5 min-h-24 w-full resize-y rounded-md border px-3 py-2 text-sm leading-6 focus-visible:ring-2 focus-visible:outline-none', missingNote ? 'border-warning' : 'border-border-control')} />
          <div className="mt-2 flex items-start justify-between gap-3 text-xs leading-5">
            <span id="criterion-note-hint" className={missingNote ? 'text-warning' : 'text-text-muted'}>{missingNote ? t('reviewWorkspace.noteHint') : t('reviewWorkspace.noteVisibility')}</span>
            <span className="text-text-muted shrink-0 tabular-nums">{assessment.note.length}/2000</span>
          </div>
        </fieldset>
      </div>

      <footer className="border-border flex flex-wrap items-center justify-between gap-3 border-t px-4 py-2.5">
        <button type="button" disabled={current === 0 || disabled} onClick={() => moveTo(assessments[current - 1].code)} className="text-text-muted focus-visible:ring-[var(--ui-border-strong)] flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm hover:text-text-strong focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-40"><ArrowLeft size={16} aria-hidden="true" />{t('reviewWorkspace.previousCriterion')}</button>
        {nextIncomplete ? <button type="button" disabled={disabled} onClick={() => moveTo(nextIncomplete.code)} className="text-text-strong focus-visible:ring-[var(--ui-border-strong)] flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-medium hover:underline focus-visible:ring-2 disabled:opacity-40">{t('reviewWorkspace.nextIncomplete')}<ArrowRight size={16} aria-hidden="true" /></button> : <span role="status" className={cn('flex items-center gap-2 text-sm font-medium', completed === assessments.length ? 'text-success' : 'text-warning')}>{completed === assessments.length ? <Check size={16} aria-hidden="true" /> : <CircleAlert size={16} aria-hidden="true" />}{t(completed === assessments.length ? 'reviewWorkspace.allComplete' : 'reviewWorkspace.completeCurrent')}</span>}
      </footer>
    </section>
  )
}
