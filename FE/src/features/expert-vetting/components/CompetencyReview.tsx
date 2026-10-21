import { useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Circle, CircleAlert, Eye, FileText, Link2, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { COMPETENCY_RESULTS } from '../constants'
import { useCompetencyLabel } from '../hooks/useLabels'
import { isComplete } from '../hooks/useQualificationReview'
import { documentKey } from '../utils/applications'
import type {
  ApplicationDocument,
  CompetencyAssessment,
  CompetencyCheck,
  CompetencyResult,
} from '../types'

interface CompetencyReviewProps {
  assessments: CompetencyAssessment[]
  /** Files the reviewer may cite: eligibility documents and those added for the service */
  documents: ApplicationDocument[]
  /** Results of the previous decision (the expert has supplemented since) */
  previous: CompetencyCheck[]
  disabled: boolean
  onResult: (code: string, result: CompetencyResult) => void
  onNote: (code: string, note: string) => void
  onToggleEvidence: (code: string, evidenceId: string) => void
  /** Shows a file in the document viewer beside the form */
  onShowDocument: (key: string) => void
}

const resultStyle = {
  PASS: { Icon: Check, selected: 'border-success bg-success/10 text-success' },
  NEED_MORE_INFORMATION: { Icon: CircleAlert, selected: 'border-warning bg-warning/10 text-warning' },
  FAIL: { Icon: X, selected: 'border-danger bg-danger/10 text-danger' },
}

const ring = 'focus-visible:ring-[var(--ui-border-strong)] focus-visible:ring-2 focus-visible:outline-none'

/**
 * Competency form, one competency at a time like the eligibility form: every competency needs a note, and
 * Pass or Fail must cite at least one of the expert's files.
 */
export function CompetencyReview({
  assessments,
  documents,
  previous,
  disabled,
  onResult,
  onNote,
  onToggleEvidence,
  onShowDocument,
}: CompetencyReviewProps) {
  const { t } = useTranslation('admin')
  const label = useCompetencyLabel()
  const [activeCode, setActiveCode] = useState(() => assessments.find((a) => !isComplete(a))?.code)
  const heading = useRef<HTMLHeadingElement>(null)
  const current = Math.max(0, assessments.findIndex((a) => a.code === activeCode))
  const a = assessments[current]
  const completed = assessments.filter(isComplete).length
  const nextIncomplete = [...assessments.slice(current + 1), ...assessments.slice(0, current)].find((x) => !isComplete(x))
  const files = documents.filter((d) => d.evidenceId)

  if (!a) return null

  const last = previous.find((c) => c.code === a.code)
  const citeRequired = !!a.result && a.result !== 'NEED_MORE_INFORMATION'
  const missingNote = !!a.result && !a.note.trim()
  const missingFile = citeRequired && a.evidenceIds.length === 0
  const moveTo = (code: string) => {
    setActiveCode(code)
    requestAnimationFrame(() => heading.current?.focus())
  }
  const status = (x: CompetencyAssessment) =>
    isComplete(x) && x.result
      ? t(`eligibility.results.${x.result}`)
      : x.result
        ? t('competency.incomplete')
        : t('reviewWorkspace.notAssessed')

  return (
    <section aria-labelledby="competency-title" className="border-border bg-surface overflow-hidden rounded-lg border">
      <header className="border-border border-b px-4 py-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="competency-title" className="text-text-strong !font-sans !text-base font-semibold">{t('competency.title')}</h2>
          <span role="status" aria-label={t('reviewWorkspace.progress')} className="text-text-muted text-sm tabular-nums">{completed}/{assessments.length}</span>
        </div>
        <p className="text-text-muted mt-0.5 text-sm">{t('competency.subtitle')}</p>
        <progress value={completed} max={assessments.length} aria-label={t('reviewWorkspace.progress')} className="mt-3 block h-1 w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:bg-[var(--ui-surface-muted)] [&::-webkit-progress-value]:bg-[var(--ui-text-strong)] [&::-moz-progress-bar]:bg-[var(--ui-text-strong)]" />
      </header>

      <label className="border-border block border-b p-4 text-sm font-medium sm:hidden">
        {t('reviewWorkspace.criteriaNavigation')}
        <select value={a.code} onChange={(e) => moveTo(e.target.value)} className="border-border-control bg-surface text-text-strong mt-2 min-h-11 w-full rounded-md border px-3 py-2 text-sm">
          {assessments.map((x) => <option key={x.code} value={x.code}>{label.name(x.code)} · {status(x)}</option>)}
        </select>
      </label>
      <nav aria-label={t('reviewWorkspace.criteriaNavigation')} className="border-border divide-border hidden border-b sm:grid sm:grid-cols-2 sm:divide-x [&>*:nth-child(n+3)]:border-t [&>*:nth-child(n+3)]:border-[var(--ui-border)]">
        {assessments.map((x) => {
          const done = isComplete(x)
          const active = x.code === a.code
          const Icon = done ? Check : x.result ? CircleAlert : Circle
          return (
            <button key={x.code} type="button" aria-current={active ? 'step' : undefined} aria-controls="competency-editor" onClick={() => moveTo(x.code)} className={cn('relative flex min-h-14 items-center gap-3 px-4 py-2.5 text-left transition-colors focus-visible:ring-inset', ring, active ? 'bg-surface-muted text-text-strong before:bg-text-strong before:absolute before:inset-y-0 before:left-0 before:w-0.5' : 'text-text-muted hover:bg-surface-muted/60')}>
              <Icon size={16} aria-hidden="true" className={cn('shrink-0', done && (x.result === 'PASS' ? 'text-success' : x.result === 'FAIL' ? 'text-danger' : 'text-warning'), !done && x.result && 'text-warning')} />
              <span className="min-w-0">
                <span className={cn('block text-xs', done && x.result === 'PASS' && 'text-success', done && x.result === 'FAIL' && 'text-danger', ((done && x.result === 'NEED_MORE_INFORMATION') || (!done && x.result)) && 'text-warning')}>{status(x)}</span>
                <span className={cn('mt-0.5 block text-sm leading-5', active ? 'font-medium' : 'text-text-strong')}>{label.name(x.code)}</span>
              </span>
            </button>
          )
        })}
      </nav>

      <div id="competency-editor" className="p-4">
        <div className="mb-1 flex items-start justify-between gap-4">
          <h3 ref={heading} tabIndex={-1} className="text-text-strong scroll-mt-24 text-base font-semibold outline-none">{label.name(a.code)}</h3>
          <span className="text-text-muted shrink-0 text-sm tabular-nums">{current + 1}/{assessments.length}</span>
        </div>
        <p className="text-text-muted text-sm">{label.hint(a.code)}</p>
        {last && (
          <p className="text-text-muted mt-2 text-sm">
            {t('competency.previous', { result: t(`eligibility.results.${last.result}`) })}
            {last.note && ` · ${last.note}`}
          </p>
        )}

        <fieldset disabled={disabled} className="mt-5">
          <legend className="text-text-strong mb-2 text-sm font-medium">{t('reviewWorkspace.assessmentResult')}</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {COMPETENCY_RESULTS.map((result) => {
              const selected = a.result === result
              const { Icon, selected: selectedStyle } = resultStyle[result]
              return (
                <label key={result} className={cn('flex min-h-11 cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2 text-sm leading-5 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--ui-border-strong)]', disabled && 'cursor-not-allowed opacity-50', selected ? `${selectedStyle} font-medium` : 'border-border text-text hover:bg-surface-muted')}>
                  <input type="radio" name={`competency-${a.code}`} checked={selected} onChange={() => onResult(a.code, result)} className="size-4 shrink-0 accent-current focus-visible:outline-none" />
                  <span className="flex flex-1 items-center justify-between gap-1">{t(`eligibility.results.${result}`)}<Icon size={16} aria-hidden="true" /></span>
                </label>
              )
            })}
          </div>

          <div className="mt-5">
            <p className="text-text-strong text-sm font-medium">{citeRequired ? t('competency.evidenceRequired') : t('competency.evidenceOptional')}</p>
            {files.length === 0 ? (
              <p className="border-border text-text-muted mt-2 rounded-md border border-dashed px-3 py-3 text-sm">{t('competency.noFiles')}</p>
            ) : (
              <ul className={cn('divide-border mt-2 divide-y overflow-hidden rounded-md border', missingFile ? 'border-warning' : 'border-border')}>
                {files.map((d) => {
                  const id = d.evidenceId!
                  const checked = a.evidenceIds.includes(id)
                  const Icon = d.sourceUrl ? Link2 : FileText
                  return (
                    <li key={id} className={cn('flex items-center gap-3 px-3 py-2', checked && 'bg-surface-muted')}>
                      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                        <input type="checkbox" checked={checked} onChange={() => onToggleEvidence(a.code, id)} className="size-4 shrink-0 accent-[var(--ui-text-strong)]" />
                        <Icon size={15} aria-hidden="true" className="text-text-muted shrink-0" />
                        <span className="text-text-strong min-w-0 truncate text-sm" title={d.name}>{d.name}</span>
                      </label>
                      <button type="button" onClick={() => onShowDocument(documentKey(d))} className={cn('border-border text-text-strong hover:bg-surface-muted inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-sm font-medium', ring)}>
                        <Eye size={14} aria-hidden="true" />
                        {t('detail.documents.view')}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
            {missingFile && <p className="text-warning mt-1.5 text-xs">{t('competency.evidenceHint')}</p>}
          </div>

          <label htmlFor={`note-${a.code}`} className="text-text-strong mt-5 block text-sm font-medium">{t('competency.noteRequired')}</label>
          <textarea key={a.code} id={`note-${a.code}`} required rows={4} maxLength={2000} value={a.note} onChange={(e) => onNote(a.code, e.target.value)} placeholder={t('competency.notePlaceholder')} className={cn('bg-surface text-text placeholder:text-text-muted mt-1.5 min-h-24 w-full resize-y rounded-md border px-3 py-2 text-sm leading-6', ring, missingNote ? 'border-warning' : 'border-border-control')} />
          <div className="mt-1.5 flex items-start justify-between gap-3 text-xs leading-5">
            <span className={missingNote ? 'text-warning' : 'text-text-muted'}>{missingNote ? t('reviewWorkspace.noteHint') : t('reviewWorkspace.noteVisibility')}</span>
            <span className="text-text-muted shrink-0 tabular-nums">{a.note.length}/2000</span>
          </div>
        </fieldset>
      </div>

      <footer className="border-border flex flex-wrap items-center justify-between gap-3 border-t px-4 py-2.5">
        <button type="button" disabled={current === 0 || disabled} onClick={() => moveTo(assessments[current - 1].code)} className={cn('text-text-muted hover:text-text-strong flex min-h-11 items-center gap-2 rounded-md px-2 text-sm disabled:cursor-not-allowed disabled:opacity-40', ring)}><ArrowLeft size={16} aria-hidden="true" />{t('reviewWorkspace.previousCriterion')}</button>
        {nextIncomplete ? (
          <button type="button" disabled={disabled} onClick={() => moveTo(nextIncomplete.code)} className={cn('text-text-strong flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-medium hover:underline disabled:opacity-40', ring)}>{t('reviewWorkspace.nextIncomplete')}<ArrowRight size={16} aria-hidden="true" /></button>
        ) : (
          <span role="status" className={cn('flex items-center gap-2 text-sm font-medium', completed === assessments.length ? 'text-success' : 'text-warning')}>
            {completed === assessments.length ? <Check size={16} aria-hidden="true" /> : <CircleAlert size={16} aria-hidden="true" />}
            {t(completed === assessments.length ? 'reviewWorkspace.allComplete' : 'reviewWorkspace.completeCurrent')}
          </span>
        )}
      </footer>
    </section>
  )
}
