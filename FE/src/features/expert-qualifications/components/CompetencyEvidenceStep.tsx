import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, CircleAlert, FileText, Link2, ShieldAlert, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/actions/button'
import { HelpTip } from '@/components/ui/feedback/help-tip'
import { FileUploader } from '@/features/expert-registration/components/FileUploader'
import type { Qualification, QualificationFile } from '../types'

export const COMPETENCY_CODES = ['C1', 'C2', 'C3', 'C4', 'C5'] as const
type CompetencyCode = (typeof COMPETENCY_CODES)[number]

interface Mutation<T> {
  mutateAsync: (input: T) => Promise<unknown>
  isPending: boolean
}

/**
 * Competency evidence by competency (U2), used while preparing and while more information is requested: the
 * five competencies on the left with how many files each has; on the right the selected competency with
 * guidance (what it is, what to send, what not to send), upload or link, the files tied to it and a short
 * description. Every file is tied to the competency it was added under and can support others too.
 */
export function CompetencyEvidenceStep({
  data,
  upload,
  addLink,
  tie,
  describe,
  remove,
  submit,
  onOpen,
  onError,
}: {
  data: Qualification
  upload: Mutation<{ file: File; competencies: string[] }>
  addLink: Mutation<{ url: string; competencies: string[] }>
  tie: Mutation<{ evidenceId: string; competencies: string[] }>
  describe: Mutation<{ code: string; text: string }>
  remove: Mutation<string>
  /** Sends the prepared evidence for review; only while preparing */
  submit?: Mutation<void>
  onOpen: (file: QualificationFile) => void
  onError: (error: unknown) => void
}) {
  const { t } = useTranslation('expert')
  const [code, setCode] = useState<CompetencyCode>(
    () => (data.newEvidenceRequiredFor[0] as CompetencyCode | undefined) ?? 'C1'
  )
  const [drafts, setDrafts] = useState<Partial<Record<CompetencyCode, string>>>({})
  const name = (c: string) => t(`qualifications.competencies.${c as CompetencyCode}`)
  const own = data.evidence.filter((e) => e.code === 'COMPETENCY')
  const tiedTo = (c: string) => data.submitted.find((s) => s.code === c)?.evidenceIds ?? []
  const competenciesOf = (evidenceId: string) =>
    data.submitted.filter((s) => s.evidenceIds.includes(evidenceId)).map((s) => s.code)
  const covered = COMPETENCY_CODES.filter((c) => tiedTo(c).length > 0).length
  const busy =
    upload.isPending || addLink.isPending || tie.isPending || describe.isPending || remove.isPending || !!submit?.isPending
  const files = own.filter((e) => tiedTo(code).includes(e.id))
  const others = own.filter((e) => !tiedTo(code).includes(e.id))
  const savedText = data.submitted.find((s) => s.code === code)?.description ?? ''
  const text = drafts[code] ?? savedText
  // Resolves true on success; a failure is reported through onError
  const run = <T,>(m: Mutation<T>, input: T) =>
    m.mutateAsync(input).then(
      () => true,
      (e: unknown) => {
        onError(e)
        return false
      }
    )

  const toggle = (file: QualificationFile, c: string, on: boolean) => {
    const current = competenciesOf(file.id)
    const next = on ? [...current, c] : current.filter((x) => x !== c)
    if (next.length === 0) return
    void run(tie, { evidenceId: file.id, competencies: next })
  }

  const fileRow = (file: QualificationFile, inOthers = false) => {
    const tags = competenciesOf(file.id)
    const isLink = !!file.sourceUrl
    return (
      <li key={file.id} className="py-3">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => onOpen(file)} className="inline-flex min-h-11 min-w-0 flex-1 items-center gap-2 text-left text-[var(--ep-accent-text)]">
            {isLink ? <Link2 size={15} aria-hidden="true" /> : <FileText size={15} aria-hidden="true" />}
            <span className="truncate">{file.sourceUrl || file.fileName}</span>
            {isLink && <span className="shrink-0 rounded bg-[var(--ep-bg)] px-1.5 py-0.5 text-xs text-[var(--ep-muted)]">{t('qualifications.evidence.linkLabel')}</span>}
          </button>
          {inOthers && (
            <Button variant="outline" className="min-h-11" disabled={busy} onClick={() => toggle(file, code, true)}>
              {t('qualifications.evidence.tieHere')}
            </Button>
          )}
          {file.canRemove && (
            <Button
              variant="outline"
              className="min-h-11"
              disabled={busy}
              aria-label={t('qualifications.removeFile', { name: file.sourceUrl || file.fileName })}
              onClick={() => void run(remove, file.id)}
            >
              <Trash2 size={16} aria-hidden="true" />
            </Button>
          )}
        </div>
        <ul className="mt-1 flex flex-wrap gap-1.5" aria-label={t('qualifications.evidence.tiedTo')}>
          {tags.map((c) => (
            <li key={c} className="rounded-full bg-[var(--ep-bg)] px-2 py-0.5 text-xs text-[var(--ep-ink)]">{name(c)}</li>
          ))}
        </ul>
        {!inOthers && (
          <details className="mt-2 text-sm">
            <summary className="cursor-pointer text-[var(--ep-accent-text)]">{t('qualifications.evidence.tieMore')}</summary>
            <fieldset className="mt-2 grid gap-1.5" disabled={busy}>
              <legend className="sr-only">{t('qualifications.evidence.tieMore')}</legend>
              {COMPETENCY_CODES.map((c) => {
                const on = tags.includes(c)
                // A submitted file keeps the competencies it was reviewed under
                const locked = on && (!file.canRemove || tags.length === 1)
                return (
                  <label key={c} className="flex min-h-9 items-center gap-2">
                    <input type="checkbox" checked={on} disabled={locked} onChange={(e) => toggle(file, c, e.target.checked)} className="size-4" />
                    {name(c)}
                  </label>
                )
              })}
            </fieldset>
          </details>
        )}
      </li>
    )
  }

  return (
    <section className="mt-6 rounded-lg border border-[var(--ep-border)] bg-[var(--ep-surface)]">
      <div className="flex items-center gap-1.5 border-b border-[var(--ep-border)] px-5 py-4">
        <h2 className="font-semibold text-[var(--ep-ink)]">{t('qualifications.evidence.title')}</h2>
        <HelpTip label={t('qualifications.evidence.title')}>{t('qualifications.evidence.help')}</HelpTip>
      </div>
      <p role="note" className="mx-5 mt-4 flex items-start gap-2 rounded-lg bg-[var(--ep-warning-bg,var(--ep-bg))] p-3 text-sm text-[var(--ep-ink)]">
        <ShieldAlert size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--ep-warning)]" />
        {t('qualifications.evidence.mask')}
      </p>
      {data.newEvidenceRequiredFor.length > 0 && (
        <p role="alert" className="mx-5 mt-3 flex items-start gap-2 rounded-lg bg-[var(--ep-danger-bg)] p-3 text-sm text-[var(--ep-danger)]">
          <CircleAlert size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
          {t('qualifications.evidence.newRequired', {
            names: data.newEvidenceRequiredFor.map(name).join('; '),
          })}
        </p>
      )}

      <div className="mt-4 lg:grid lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
        <div className="border-b border-[var(--ep-border)] lg:border-r lg:border-b-0">
          <nav aria-label={t('qualifications.evidence.competencies')}>
            <ul>
              {COMPETENCY_CODES.map((c) => {
                const count = tiedTo(c).length
                const active = c === code
                const required = data.newEvidenceRequiredFor.includes(c)
                return (
                  <li key={c}>
                    <button
                      type="button"
                      aria-current={active ? 'step' : undefined}
                      onClick={() => setCode(c)}
                      className={`flex min-h-14 w-full items-center gap-3 px-5 py-2.5 text-left text-sm ${active ? 'bg-[var(--ep-bg)] font-medium text-[var(--ep-ink)]' : 'text-[var(--ep-muted)]'}`}
                    >
                      {count > 0 ? (
                        <Check size={16} aria-hidden="true" className="shrink-0 text-[var(--ep-success)]" />
                      ) : required ? (
                        <CircleAlert size={16} aria-hidden="true" className="shrink-0 text-[var(--ep-danger)]" />
                      ) : (
                        <span aria-hidden="true" className="size-4 shrink-0 rounded-full border border-[var(--ep-border)]" />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block text-[var(--ep-ink)]">{name(c)}</span>
                        <span className="block text-xs">{t('qualifications.evidence.fileCount', { count })}</span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>
          {submit && (
            <div className="space-y-3 border-t border-[var(--ep-border)] p-5">
              <p role="status" className="text-sm font-medium text-[var(--ep-ink)]">
                {t('qualifications.evidence.covered', { count: covered, total: COMPETENCY_CODES.length })}
              </p>
              <Button className="min-h-11 w-full" disabled={busy || !data.canSubmit} onClick={() => void run(submit, undefined)}>
                {t('qualifications.evidence.submit')}
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-5 p-5">
          <div className="flex items-center gap-1.5">
            <h3 className="font-semibold text-[var(--ep-ink)]">{name(code)}</h3>
            <HelpTip label={name(code)}>
              <p className="font-semibold">{t('qualifications.evidence.whatIs')}</p>
              <p>{t(`qualifications.guide.${code}.what`)}</p>
              <p className="mt-2 font-semibold">{t('qualifications.evidence.send')}</p>
              <p>{t(`qualifications.guide.${code}.send`)}</p>
              <p className="mt-2 font-semibold">{t('qualifications.evidence.avoid')}</p>
              <p>{t(`qualifications.guide.${code}.avoid`)}</p>
            </HelpTip>
          </div>

          {data.canUpload && (
            <FileUploader
              id={`competency-${code}`}
              categoryLabel={name(code)}
              files={[]}
              quota={{ used: own.length, max: data.maxFiles }}
              disabled={busy}
              onFilesSelected={(list) => {
                for (const file of Array.from(list ?? [])) void run(upload, { file, competencies: [code] })
              }}
              onRemoveFile={() => undefined}
              onAddLink={(url) =>
run(addLink, { url, competencies: [code] })
              }
            />
          )}

          <div>
            <h4 className="text-sm font-semibold text-[var(--ep-ink)]">{t('qualifications.evidence.tiedTitle')}</h4>
            {files.length === 0 ? (
              <p className="mt-2 rounded-lg border border-dashed border-[var(--ep-border)] p-3 text-sm text-[var(--ep-muted)]">
                {t('qualifications.evidence.none')}
              </p>
            ) : (
              <ul className="mt-1 divide-y divide-[var(--ep-line)] text-sm">{files.map((f) => fileRow(f))}</ul>
            )}
            {others.length > 0 && (
              <details className="mt-3 text-sm">
                <summary className="cursor-pointer text-[var(--ep-accent-text)]">
                  {t('qualifications.evidence.others', { count: others.length })}
                </summary>
                <ul className="mt-1 divide-y divide-[var(--ep-line)]">{others.map((f) => fileRow(f, true))}</ul>
              </details>
            )}
          </div>

          <div>
            <label htmlFor={`description-${code}`} className="flex items-center gap-1.5 text-sm font-semibold text-[var(--ep-ink)]">
              {t('qualifications.evidence.description')}
            </label>
            <textarea
              id={`description-${code}`}
              rows={4}
              maxLength={1000}
              value={text}
              disabled={busy}
              onChange={(e) => setDrafts((d) => ({ ...d, [code]: e.target.value }))}
              placeholder={t('qualifications.evidence.descriptionPlaceholder')}
              className="mt-1.5 w-full resize-y rounded-lg border border-[var(--ep-border)] bg-[var(--ep-bg)] px-3 py-2 text-sm"
            />
            <div className="mt-1.5 flex items-center justify-between gap-3">
              <span className="text-xs text-[var(--ep-muted)] tabular-nums">{text.length}/1000</span>
              <Button
                variant="outline"
                className="min-h-11"
                disabled={busy || text === savedText}
                onClick={() =>
                  void run(describe, { code, text }).then(
                    (saved) => saved && setDrafts(({ [code]: _, ...rest }) => rest)
                  )
                }
              >
                {t('qualifications.evidence.saveDescription')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
