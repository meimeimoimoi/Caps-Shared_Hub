import { useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Circle, CircleAlert, Eye, ExternalLink, FileText, Link2, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { HelpTip } from '@/components/ui/feedback/help-tip'
import { COMPETENCY_RESULTS } from '../constants'
import { useCompetencyLabel } from '../hooks/useLabels'
import { isComplete } from '../hooks/useQualificationReview'
import { documentKey } from '../utils/applications'
import type {
  ApplicationDocument,
  CompetencyAssessment,
  CompetencyCheck,
  CompetencyResult,
  CompetencySubmission,
  InformationRounds,
} from '../types'

interface CompetencyReviewProps {
  assessments: CompetencyAssessment[]
  /** Files the reviewer may cite: eligibility documents and those added for the service */
  documents: ApplicationDocument[]
  /** Results of the previous decision (the expert has supplemented since) */
  previous: CompetencyCheck[]
  /** What the expert sent per competency: description and the files tied to it */
  submitted: CompetencySubmission[]
  rounds?: InformationRounds
  disabled: boolean
  onResult: (code: string, result: CompetencyResult) => void
  onNote: (code: string, note: string) => void
  onToggleEvidence: (code: string, evidenceId: string) => void
  /** Shows a file in the document viewer beside the form */
  onShowDocument: (key: string) => void
  /** Opens the conclusion dialog once every competency is complete */
  onConclude: () => void
  canConclude: boolean
}

const resultStyle = {
  PASS: { Icon: Check, selected: 'border-success bg-success/10 text-success' },
  NEED_MORE_INFORMATION: { Icon: CircleAlert, selected: 'border-warning bg-warning/10 text-warning' },
  FAIL: { Icon: X, selected: 'border-danger bg-danger/10 text-danger' },
}

const ring = 'focus-visible:ring-[var(--ui-border-strong)] focus-visible:ring-2 focus-visible:outline-none'
const MAX_NOTE = 2000

/**
 * Gate 2 form, one competency at a time (U3): the competency list with progress and the conclusion button on
 * the left; on the right three steps — what the expert sent for this competency, the result with guidance on
 * when to choose each level, and the note for the expert. Pass or Fail must cite at least one file.
 */
export function CompetencyReview({
  assessments,
  documents,
  previous,
  submitted,
  rounds,
  disabled,
  onResult,
  onNote,
  onToggleEvidence,
  onShowDocument,
  onConclude,
  canConclude,
}: CompetencyReviewProps) {
  const { t } = useTranslation('admin')
  const label = useCompetencyLabel()
  const [activeCode, setActiveCode] = useState(() => assessments.find((a) => !isComplete(a))?.code)
  const heading = useRef<HTMLHeadingElement>(null)
  const current = Math.max(0, assessments.findIndex((a) => a.code === activeCode))
  const a = assessments[current]
  const completed = assessments.filter(isComplete).length
  const files = documents.filter((d) => d.evidenceId)

  if (!a) return null

  const sent = submitted.find((s) => s.code === a.code)
  const tiedIds = new Set(sent?.evidenceIds ?? [])
  // Files the expert tied to this competency come first; the rest of the record stays one click away (E8)
  const tied = files.filter((d) => tiedIds.has(d.evidenceId!))
  const others = files.filter((d) => !tiedIds.has(d.evidenceId!))
  const last = previous.find((c) => c.code === a.code)
  const lastRound = !!rounds && !rounds.canRequestMore
  // M4: on the last allowed round the reviewer passes or fails; a result already chosen stays visible
  const results = COMPETENCY_RESULTS.filter(
    (result) => result !== 'NEED_MORE_INFORMATION' || !lastRound || a.result === result
  )
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

  const fileRow = (d: ApplicationDocument) => {
    const id = d.evidenceId!
    const checked = a.evidenceIds.includes(id)
    const link = !!d.sourceUrl && /^https?:\/\//i.test(d.sourceUrl)
    return (
      <li key={id} className={cn('flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2', checked && 'bg-surface-muted')}>
        {link ? <Link2 size={15} aria-hidden="true" className="text-text-muted shrink-0" /> : <FileText size={15} aria-hidden="true" className="text-text-muted shrink-0" />}
        <span className="text-text-strong min-w-0 flex-1 truncate text-sm" title={d.name}>
          {d.name}
          {link && <span className="bg-surface-muted text-text-muted ml-2 rounded px-1.5 py-0.5 text-xs">{t('competency.linkLabel')}</span>}
        </span>
        {link ? (
          <a href={d.sourceUrl!} target="_blank" rel="noopener noreferrer" className={cn('border-border text-text-strong hover:bg-surface-muted inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-sm font-medium', ring)}>
            <ExternalLink size={14} aria-hidden="true" />
            {t('competency.open')}
          </a>
        ) : (
          <button type="button" onClick={() => onShowDocument(documentKey(d))} className={cn('border-border text-text-strong hover:bg-surface-muted inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-sm font-medium', ring)}>
            <Eye size={14} aria-hidden="true" />
            {t('competency.open')}
          </button>
        )}
        <label className="text-text-strong inline-flex h-8 shrink-0 cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={checked} disabled={disabled} onChange={() => onToggleEvidence(a.code, id)} className="size-4 shrink-0 accent-[var(--ui-text-strong)]" />
          {t('competency.cite')}
        </label>
      </li>
    )
  }

  return (
    <section aria-labelledby="competency-title" className="border-border bg-surface overflow-hidden rounded-lg border">
      <header className="border-border border-b px-4 py-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <h2 id="competency-title" className="text-text-strong !font-sans !text-base font-semibold">{t('competency.title')}</h2>
            <HelpTip label={t('competency.title')}>{t('competency.subtitle')}</HelpTip>
          </div>
          {!!rounds?.used && (
            <span className="bg-surface-muted text-text-muted rounded px-1.5 py-0.5 text-xs tabular-nums">
              {t('rounds.label', { used: rounds.used, max: rounds.max })}
            </span>
          )}
        </div>
        {lastRound && (
          <p role="note" className="text-warning mt-2 flex items-center gap-1.5 text-sm">
            {t('rounds.last')}
            <HelpTip label={t('rounds.last')}>{t('rounds.lastHelp', { max: rounds?.max })}</HelpTip>
          </p>
        )}
      </header>

      <div className="lg:grid lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
        {/* Competencies with their state, progress and the conclusion */}
        <aside className="border-border border-b lg:border-r lg:border-b-0">
          <nav aria-label={t('reviewWorkspace.criteriaNavigation')}>
            <ul>
              {assessments.map((x) => {
                const done = isComplete(x)
                const active = x.code === a.code
                const Icon = done ? Check : x.result ? CircleAlert : Circle
                return (
                  <li key={x.code}>
                    <button type="button" aria-current={active ? 'step' : undefined} aria-controls="competency-editor" onClick={() => moveTo(x.code)} className={cn('relative flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left transition-colors focus-visible:ring-inset', ring, active ? 'bg-surface-muted text-text-strong before:bg-text-strong before:absolute before:inset-y-0 before:left-0 before:w-0.5' : 'text-text-muted hover:bg-surface-muted/60')}>
                      <Icon size={16} aria-hidden="true" className={cn('shrink-0', done && (x.result === 'PASS' ? 'text-success' : x.result === 'FAIL' ? 'text-danger' : 'text-warning'), !done && x.result && 'text-warning')} />
                      <span className="min-w-0">
                        <span className={cn('block text-sm leading-5', active ? 'font-medium' : 'text-text-strong')}>{label.name(x.code)}</span>
                        <span className="mt-0.5 block text-xs">{status(x)}</span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>
          <div className="border-border space-y-3 border-t p-4">
            <p role="status" className="text-text-strong text-sm font-medium tabular-nums">{t('competency.graded', { done: completed, total: assessments.length })}</p>
            <progress value={completed} max={assessments.length} aria-label={t('reviewWorkspace.progress')} className="block h-1 w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:bg-[var(--ui-surface-muted)] [&::-webkit-progress-value]:bg-[var(--ui-text-strong)] [&::-moz-progress-bar]:bg-[var(--ui-text-strong)]" />
            <button type="button" disabled={!canConclude} onClick={onConclude} className="btn btn-press btn-primary w-full">
              {t('competency.conclude')}
            </button>
          </div>
        </aside>

        <div>
          <div id="competency-editor" className="space-y-6 p-4">
            <div>
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-1.5">
                  <h3 ref={heading} tabIndex={-1} className="text-text-strong scroll-mt-24 text-base font-semibold outline-none">{label.name(a.code)}</h3>
                  <HelpTip label={label.name(a.code)}>
                    <p>{t(`competency.definitions.${a.code}` as 'competency.definitions.C1')}</p>
                    <p className="mt-2">{label.hint(a.code)}</p>
                  </HelpTip>
                </div>
                <span className="text-text-muted shrink-0 text-sm tabular-nums">{current + 1}/{assessments.length}</span>
              </div>
              {last && (
                <p className="text-text-muted mt-1 text-sm">
                  {t('competency.previous', { result: t(`eligibility.results.${last.result}`) })}
                  {last.note && ` · ${last.note}`}
                </p>
              )}
            </div>

            {/* Step 1: what the expert sent for this competency */}
            <section aria-labelledby="competency-step-evidence">
              <h4 id="competency-step-evidence" className="text-text-strong text-sm font-semibold">{t('competency.steps.evidence')}</h4>
              <blockquote className="border-border text-text mt-2 border-l-2 pl-3 text-sm whitespace-pre-line">
                {sent?.description ?? <span className="text-text-muted">{t('competency.noDescription')}</span>}
              </blockquote>
              {tied.length === 0 ? (
                <p className="border-border text-text-muted mt-3 rounded-md border border-dashed px-3 py-3 text-sm">{t('competency.noTiedFiles')}</p>
              ) : (
                <ul className={cn('divide-border mt-3 divide-y overflow-hidden rounded-md border', missingFile ? 'border-warning' : 'border-border')}>
                  {tied.map(fileRow)}
                </ul>
              )}
              {others.length > 0 && (
                <details className="mt-3">
                  <summary className={cn('text-text-strong cursor-pointer rounded text-sm font-medium', ring)}>{t('competency.otherFiles', { count: others.length })}</summary>
                  <ul className="border-border divide-border mt-2 divide-y overflow-hidden rounded-md border">{others.map(fileRow)}</ul>
                </details>
              )}
              {missingFile && <p className="text-warning mt-1.5 text-xs">{t('competency.evidenceHint')}</p>}
            </section>

            {/* Step 2: the result, with guidance on when to choose each level (M2) */}
            <fieldset disabled={disabled}>
              <legend className="text-text-strong flex items-center gap-1.5 text-sm font-semibold">
                {t('competency.steps.result')}
                <HelpTip label={t('competency.guideTitle')}>
                  <p className="font-semibold">{t('competency.guideTitle')}</p>
                  <dl className="mt-2 space-y-2">
                    {COMPETENCY_RESULTS.map((result) => (
                      <div key={result}>
                        <dt className="font-medium">{t(`eligibility.results.${result}`)}</dt>
                        <dd>{t(`competency.guide.${a.code}.${result}` as 'competency.guide.C1.PASS')}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-2">{t('competency.guideNote')}</p>
                </HelpTip>
              </legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {results.map((result) => {
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
              {a.result && (
                <p className="text-text-muted mt-2 text-sm">
                  {t('competency.whenLabel', {
                    result: t(`eligibility.results.${a.result}`),
                    text: t(`competency.guide.${a.code}.${a.result}` as 'competency.guide.C1.PASS'),
                  })}
                </p>
              )}
            </fieldset>

            {/* Step 3: the note the expert reads */}
            <div>
              <label htmlFor={`note-${a.code}`} className="text-text-strong block text-sm font-semibold">{t('competency.steps.note')}</label>
              <textarea key={a.code} id={`note-${a.code}`} required disabled={disabled} rows={4} maxLength={MAX_NOTE} value={a.note} onChange={(e) => onNote(a.code, e.target.value)} placeholder={t('competency.notePlaceholder')} className={cn('bg-surface text-text placeholder:text-text-muted mt-1.5 min-h-24 w-full resize-y rounded-md border px-3 py-2 text-sm leading-6 disabled:opacity-60', ring, missingNote ? 'border-warning' : 'border-border-control')} />
              <div className="mt-1.5 flex items-start justify-between gap-3 text-xs leading-5">
                <span className={missingNote ? 'text-warning' : 'text-text-muted'}>
                  {missingNote ? t('reviewWorkspace.noteHint') : t('competency.citedCount', { count: a.evidenceIds.length })}
                </span>
                <span className="text-text-muted shrink-0 tabular-nums">{a.note.length}/{MAX_NOTE}</span>
              </div>
            </div>
          </div>

          <footer className="border-border flex flex-wrap items-center justify-between gap-3 border-t px-4 py-2.5">
            <button type="button" disabled={current === 0} onClick={() => moveTo(assessments[current - 1].code)} className={cn('text-text-muted hover:text-text-strong flex min-h-11 items-center gap-2 rounded-md px-2 text-sm disabled:cursor-not-allowed disabled:opacity-40', ring)}><ArrowLeft size={16} aria-hidden="true" />{t('reviewWorkspace.previousCriterion')}</button>
            <button type="button" disabled={current === assessments.length - 1} onClick={() => moveTo(assessments[current + 1].code)} className={cn('text-text-strong flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-medium hover:underline disabled:cursor-not-allowed disabled:opacity-40', ring)}>{t('competency.nextCompetency')}<ArrowRight size={16} aria-hidden="true" /></button>
          </footer>
        </div>
      </div>
    </section>
  )
}
