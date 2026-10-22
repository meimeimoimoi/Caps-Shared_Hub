import { useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Circle, CircleAlert, CircleSlash, FileCheck2, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { HelpTip } from '@/components/ui/feedback/help-tip'
import { ELIGIBILITY_RESULTS, EXPERIENCE_CODE, isEligibilityMet } from '../constants'
import { needsNote } from '../hooks/useApplicationReview'
import type { ApplicationDetail, EligibilityAssessment, EligibilityResult } from '../types'
import { useEligibilityLabel } from '../hooks/useLabels'
import { CriterionDeclarations, CriterionEvidence, CriterionPrevious } from './CriterionContext'

interface EligibilityReviewProps {
  detail: ApplicationDetail
  assessments: EligibilityAssessment[]
  disabled: boolean
  onResult: (code: string, result: EligibilityResult) => void
  onNote: (code: string, note: string) => void
  onShowDocument: (key: string) => void
  /** Note set aside when the criterion was switched to PASS, and a way to bring it back */
  setAsideNote?: (code: string) => string | undefined
  onRestoreNote?: (code: string) => void
}

const resultStyle = {
  PASS: { Icon: Check, selected: 'border-success bg-success/10 text-success' },
  NEED_MORE_INFORMATION: { Icon: CircleAlert, selected: 'border-warning bg-warning/10 text-warning' },
  FAIL: { Icon: X, selected: 'border-danger bg-danger/10 text-danger' },
  NOT_APPLICABLE: { Icon: CircleSlash, selected: 'border-border-strong bg-surface-muted text-text-strong' },
}

const isComplete = (assessment: EligibilityAssessment) =>
  !!assessment.result && (!needsNote(assessment) || !!assessment.note.trim())

const chipStyle: Record<EligibilityResult, string> = {
  PASS: 'bg-success/10 text-success',
  NEED_MORE_INFORMATION: 'bg-warning/10 text-warning',
  FAIL: 'bg-danger/10 text-danger',
  NOT_APPLICABLE: 'bg-surface-muted text-text-muted',
}

interface CriterionRowProps {
  item: EligibilityAssessment
  label: string
  active: boolean
  byDeclaration: boolean
  onSelect: () => void
}

/** One row of the checklist: status icon, criterion, and the result once one is chosen */
function CriterionRow({ item, label, active, byDeclaration, onSelect }: CriterionRowProps) {
  const { t } = useTranslation('admin')
  const done = isComplete(item)
  const Icon = byDeclaration ? FileCheck2 : done ? Check : item.result ? CircleAlert : Circle
  const iconTone = byDeclaration || (done && item.result === 'PASS')
    ? 'text-success'
    : done && item.result === 'FAIL'
      ? 'text-danger'
      : done && item.result === 'NOT_APPLICABLE'
        ? 'text-text-muted'
        : item.result
          ? 'text-warning'
          : 'text-text-muted'
  return (
    <li>
      <button type="button" aria-current={active ? 'step' : undefined} aria-controls="criterion-editor" onClick={onSelect} className={cn('focus-visible:ring-[var(--ui-border-strong)] relative flex min-h-11 w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:outline-none', active ? 'bg-surface-muted text-text-strong font-medium before:bg-text-strong before:absolute before:inset-y-0 before:left-0 before:w-0.5' : 'text-text hover:bg-surface-muted/60')}>
        <Icon size={16} aria-hidden="true" className={cn('shrink-0', iconTone)} />
        <span className="min-w-0 flex-1 leading-5">{label}</span>
        {byDeclaration ? (
          <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-xs font-medium', chipStyle.PASS)}>{t('eligibility.declarations.chip')}</span>
        ) : item.result && (
          <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-xs font-medium', done ? chipStyle[item.result] : chipStyle.NEED_MORE_INFORMATION)}>
            {done ? t(`eligibility.results.${item.result}`) : t('reviewWorkspace.missingNote')}
          </span>
        )}
      </button>
    </li>
  )
}

/** A visible checklist keeps navigation separate from the focused assessment editor. */
export function EligibilityReview({ detail, assessments, disabled, onResult, onNote, onShowDocument, setAsideNote, onRestoreNote }: EligibilityReviewProps) {
  const { t } = useTranslation('admin')
  const label = useEligibilityLabel()
  // EV-04/EV-05 pass on the agreed statement; the reviewer only reads them, so they are listed apart
  const byDeclaration = (code: string) => (detail.declarationPassedCriteria ?? []).includes(code)
  const toAssess = assessments.filter((item) => !byDeclaration(item.code))
  const passedByDeclaration = assessments.filter((item) => byDeclaration(item.code))
  const [activeCode, setActiveCode] = useState(() => (toAssess.find((item) => !isComplete(item)) ?? toAssess[0])?.code)
  const heading = useRef<HTMLHeadingElement>(null)
  // Statement-proven criteria the reviewer opened to record grounds against the statement
  const [contested, setContested] = useState<string[]>([])
  const current =Math.max(0, assessments.findIndex((item) => item.code === activeCode))
  const assessment = assessments[current]
  const completed = toAssess.filter(isComplete).length
  const position = toAssess.findIndex((item) => item.code === assessment?.code)
  const nextIncomplete = [...assessments.slice(current + 1), ...assessments.slice(0, current)].find((item) => !isComplete(item))

  if (!assessment) return null

  const required = needsNote(assessment)
  const missingNote = required && !assessment.note.trim()
  const experience = assessment.code === EXPERIENCE_CODE
  const belowMinimum = detail.suggestedExperienceResult === 'FAIL'
  const before = detail.eligibility.find((item) => item.code === assessment.code)
  // Files the applicant attached to this requirement; the experience requirement is judged on the CV, and a
  // requirement sent back also lists the supplementary files sent in reply
  const sentBack = !!before && !isEligibilityMet(before.result)
  const evidence = detail.documents.filter(
    (d) => d.code === assessment.code || (experience && d.code === 'CV') || (sentBack && d.code === 'SUPPLEMENT')
  )
  // Criteria proven by a statement (EV-04, EV-05) are judged on its wording; files are optional extras
  const declarations = (detail.criterionDeclarations ?? []).filter((d) => d.criterion === assessment.code)
  // Passes on the statement by default; the reviewer opens the result only when they have grounds against it
  const declared = byDeclaration(assessment.code)
  const contesting = declared && (assessment.result !== 'PASS' || contested.includes(assessment.code))
  const declarationPassed = declared && !contesting
  const keepDeclarationPass = () => {
    onResult(assessment.code, 'PASS')
    onNote(assessment.code, '')
    setContested((codes) => codes.filter((code) => code !== assessment.code))
  }
  // NOT_APPLICABLE is offered only where the server's policy allows it
  const results = ELIGIBILITY_RESULTS.filter(
    (result) => result !== 'NOT_APPLICABLE' || (detail.notApplicableCriteria ?? []).includes(assessment.code)
  )
  const moveTo = (code: string) => {
    setActiveCode(code)
    requestAnimationFrame(() => heading.current?.focus())
  }

  return (
    <section aria-labelledby="eligibility-title" className="border-border bg-surface overflow-hidden rounded-lg border xl:flex xl:flex-1 xl:flex-col">
      <header className="border-border border-b px-4 py-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <h2 id="eligibility-title" className="text-text-strong !font-sans !text-base font-semibold">{t('eligibility.title')}</h2>
            <HelpTip label={t('eligibility.title')}>{t('reviewWorkspace.assessmentHint')}</HelpTip>
          </div>
          <span role="status" aria-label={t('reviewWorkspace.progress')} className="text-text-muted text-sm tabular-nums">{t('eligibility.progress', { done: completed, total: toAssess.length })}</span>
        </div>
        <progress value={completed} max={toAssess.length} aria-label={t('reviewWorkspace.progress')} className="mt-3 block h-1 w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:bg-[var(--ui-surface-muted)] [&::-webkit-progress-value]:bg-[var(--ui-text-strong)] [&::-moz-progress-bar]:bg-[var(--ui-text-strong)]" />
      </header>

      <label className="border-border bg-surface-muted/50 block border-b p-5 text-sm font-medium sm:hidden">
        {t('reviewWorkspace.criteriaNavigation')}
        <select value={assessment.code} onChange={(event) => moveTo(event.target.value)} className="border-border-control bg-surface text-text-strong focus-visible:ring-[var(--ui-border-strong)] mt-2 min-h-12 w-full rounded-lg border px-3 py-2 text-sm focus-visible:ring-2">
          {assessments.map((item) => <option key={item.code} value={item.code}>{label(item.code)} · {byDeclaration(item.code) && item.result === 'PASS' ? t('eligibility.declarations.chip') : item.result ? t(`eligibility.results.${item.result}`) : t('reviewWorkspace.notAssessed')}</option>)}
        </select>
      </label>
      <nav aria-label={t('reviewWorkspace.criteriaNavigation')} className="border-border hidden border-b py-2 sm:block">
        <p className="text-text-muted px-4 pt-1 pb-1.5 text-xs font-medium">{t('eligibility.groups.toAssess')}</p>
        <ul>
          {toAssess.map((item) => (
            <CriterionRow key={item.code} item={item} label={label(item.code)} active={item.code === assessment.code} byDeclaration={false} onSelect={() => moveTo(item.code)} />
          ))}
        </ul>
        {passedByDeclaration.length > 0 && (
          <>
            <p className="text-text-muted border-border mt-2 border-t px-4 pt-3 pb-1.5 text-xs font-medium">{t('eligibility.groups.byDeclaration')}</p>
            <ul>
              {passedByDeclaration.map((item) => (
                <CriterionRow key={item.code} item={item} label={label(item.code)} active={item.code === assessment.code} byDeclaration={item.result === 'PASS'} onSelect={() => moveTo(item.code)} />
              ))}
            </ul>
          </>
        )}
      </nav>

      <div id="criterion-editor" className="p-4 xl:flex-1">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h3 id="criterion-heading" ref={heading} tabIndex={-1} className="text-text-strong scroll-mt-24 text-base font-semibold outline-none">{label(assessment.code)}</h3>
          <span className="text-text-muted shrink-0 text-sm tabular-nums">{declared ? (declarationPassed ? t('eligibility.declarations.chip') : '') : `${position + 1}/${toAssess.length}`}</span>
        </div>
        {declarationPassed && (
          <div className="mb-5">
            <p role="status" className="border-success bg-success/10 text-success flex items-start gap-2.5 rounded-md border px-3 py-2.5 text-sm leading-6">
              <Check size={16} aria-hidden="true" className="mt-1 shrink-0" />
              {t('eligibility.declarations.passed')}
            </p>
            <button type="button" disabled={disabled} onClick={() => setContested((codes) => [...codes, assessment.code])} className="text-text-muted focus-visible:ring-[var(--ui-border-strong)] mt-2 min-h-11 rounded-md px-1 text-sm underline-offset-2 hover:text-text-strong hover:underline focus-visible:ring-2 disabled:opacity-40">
              {t('eligibility.declarations.contest')}
            </button>
          </div>
        )}
        {contesting && (
          <div className="border-warning bg-warning/10 text-warning mb-5 flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2.5 text-sm leading-6">
            <span className="flex items-start gap-2.5"><CircleAlert size={16} aria-hidden="true" className="mt-1 shrink-0" />{t('eligibility.declarations.contesting')}</span>
            <button type="button" disabled={disabled} onClick={keepDeclarationPass} className="text-text-strong focus-visible:ring-[var(--ui-border-strong)] min-h-11 rounded-md px-2 font-medium hover:underline focus-visible:ring-2 disabled:opacity-40">
              {t('eligibility.declarations.keep')}
            </button>
          </div>
        )}
        <CriterionDeclarations declarations={declarations} />
        {(evidence.length > 0 || declarations.length === 0) && <CriterionEvidence documents={evidence} onShowDocument={onShowDocument} />}
        {experience && <p className="bg-surface-muted text-text mb-5 rounded-lg p-4 text-sm leading-6">{t('eligibility.experienceHint', { years: detail.years, min: detail.minYearsExperience })}{belowMinimum && ` ${t('eligibility.experienceBelow')}`}</p>}
        <CriterionPrevious before={before} />

        {!declarationPassed && (
        <fieldset disabled={disabled}>
          <legend className="text-text-strong mb-2 text-sm font-medium">{t('reviewWorkspace.assessmentResult')}</legend>
          {/* Two per row when there are four options, so labels never wrap in the narrow column */}
          <div role="radiogroup" className={cn('grid grid-cols-2 gap-2', results.length === 3 && 'sm:grid-cols-3')}>
            {results.map((result) => {
              const locked = experience && belowMinimum && result === 'PASS'
              const selected = assessment.result === result
              const { Icon, selected: selectedStyle } = resultStyle[result]
              return (
                <label key={result} className={cn('flex min-h-11 items-center gap-2 rounded-md border px-3 py-2 text-sm leading-5 transition-colors has-[:focus-visible]:ring-1 has-[:focus-visible]:ring-current', locked || disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer', selected ? `${selectedStyle} font-medium` : 'border-border text-text hover:bg-surface-muted')}>
                  {/* The icon carries the state; the native radio stays for keyboard and screen readers */}
                  <input type="radio" name={`result-${assessment.code}`} checked={selected} disabled={locked} onChange={() => onResult(assessment.code, result)} className="sr-only" />
                  <Icon size={16} aria-hidden="true" className={cn('shrink-0', !selected && 'text-text-muted')} />
                  <span className="min-w-0 truncate">{t(`eligibility.results.${result}`)}</span>
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
          {assessment.result === 'PASS' && setAsideNote?.(assessment.code) && (
            <p role="status" className="text-text-muted mt-2 flex flex-wrap items-center gap-x-2 text-xs leading-5">
              {t('eligibility.noteSetAside')}
              <button type="button" onClick={() => onRestoreNote?.(assessment.code)} className="text-text-strong focus-visible:ring-[var(--ui-border-strong)] min-h-8 rounded-sm font-medium underline-offset-2 hover:underline focus-visible:ring-2">
                {t('eligibility.restoreNote')}
              </button>
            </p>
          )}
        </fieldset>
        )}
      </div>

      <footer className="border-border flex flex-wrap items-center justify-between gap-3 border-t px-4 py-2.5">
        <button type="button" disabled={current === 0 || disabled} onClick={() => moveTo(assessments[current - 1].code)} className="text-text-muted focus-visible:ring-[var(--ui-border-strong)] flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm hover:text-text-strong focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-40"><ArrowLeft size={16} aria-hidden="true" />{t('reviewWorkspace.previousCriterion')}</button>
        {nextIncomplete ? <button type="button" disabled={disabled} onClick={() => moveTo(nextIncomplete.code)} className="text-text-strong focus-visible:ring-[var(--ui-border-strong)] flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-medium hover:underline focus-visible:ring-2 disabled:opacity-40">{t('reviewWorkspace.nextIncomplete')}<ArrowRight size={16} aria-hidden="true" /></button> : <span role="status" className={cn('flex items-center gap-2 text-sm font-medium', completed === toAssess.length ? 'text-success' : 'text-warning')}>{completed === toAssess.length ? <Check size={16} aria-hidden="true" /> : <CircleAlert size={16} aria-hidden="true" />}{t(completed === toAssess.length ? 'reviewWorkspace.allComplete' : 'reviewWorkspace.completeCurrent')}</span>}
      </footer>
    </section>
  )
}
