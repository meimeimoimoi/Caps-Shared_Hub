import { useTranslation } from 'react-i18next'
import { Eye, FileCheck2, FileText } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { ApplicationDetail } from '../types'
import { documentKey, formatDate } from '../utils/applications'
import { useFieldLabel } from '../hooks/useLabels'

interface ProfileTabProps {
  detail: ApplicationDetail
  /** Takes the document key (evidence id or code) */
  onOpenDocument: (key: string) => void
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="min-w-0">
      <h2 className="text-text-muted mb-2 !font-sans !text-xs font-medium tracking-wide uppercase">{title}</h2>
      {children}
    </section>
  )
}

/** Label/value rows; an empty value shows a dash so every declared field is visible */
function InfoRows({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <dl className="divide-border divide-y">
      {rows.map(({ label, value }) => (
        <div key={label} className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] gap-3 py-2.5">
          <dt className="text-text-muted text-sm">{label}</dt>
          <dd className={cn('min-w-0 text-sm break-words whitespace-pre-line', value ? 'text-text-strong' : 'text-text-muted')}>{value || '—'}</dd>
        </div>
      ))}
    </dl>
  )
}

export function ProfileTab({ detail, onOpenDocument }: ProfileTabProps) {
  const { t } = useTranslation('admin')
  const fieldLabel = useFieldLabel()
  const cv = detail.documents.find((d) => d.code === 'CV')
  const submissions = detail.submissions ?? []
  const latest = submissions.at(-1)
  const birthDate = detail.birthDate && !Number.isNaN(Date.parse(detail.birthDate)) ? formatDate(detail.birthDate) : ''
  const role = [detail.jobTitle, detail.company].filter(Boolean).join(' · ')
  const meetsMinimum = detail.years >= detail.minYearsExperience

  return (
    <div className="space-y-6">

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="border-border rounded-lg border p-3">
          <p className="text-text-muted text-xs">{t('detail.profile.years')}</p>
          <p className="text-text-strong mt-1 text-lg font-semibold tabular-nums">{t('detail.meta.years', { count: detail.years })}</p>
          <p className={cn('mt-0.5 text-xs', meetsMinimum ? 'text-success' : 'text-danger')}>
            {t(meetsMinimum ? 'detail.profile.aboveMinimum' : 'detail.profile.belowMinimum', { min: detail.minYearsExperience })}
          </p>
        </div>
        <div className="border-border min-w-0 rounded-lg border p-3">
          <p className="text-text-muted text-xs">{t('detail.profile.fields')}</p>
          {detail.fields.length ? (
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {detail.fields.map((f) => (
                <li key={f} className="bg-surface-muted text-text-strong max-w-full rounded-md px-2 py-1 text-xs leading-4 font-medium break-words">{fieldLabel(f)}</li>
              ))}
            </ul>
          ) : (
            <p className="text-text-muted mt-1 text-sm">—</p>
          )}
        </div>
      </div>

      <Block title={t('detail.profile.cv')}>
        {cv ? (
          <div className="border-border flex items-center gap-3 rounded-md border px-3 py-2.5">
            <span aria-hidden="true" className="bg-surface-muted text-text-muted flex size-8 shrink-0 items-center justify-center rounded-md"><FileText size={15} /></span>
            <p className="text-text-strong min-w-0 flex-1 truncate text-sm font-medium" title={cv.name}>{cv.name}</p>
            <button type="button" onClick={() => onOpenDocument(documentKey(cv))} className="border-border text-text-strong hover:bg-surface-muted focus-visible:ring-[var(--ui-border-strong)] inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none">
              <Eye size={14} aria-hidden="true" />
              {t('detail.documents.view')}
            </button>
          </div>
        ) : (
          <p className="border-border text-text-muted rounded-md border border-dashed px-3 py-3 text-sm">{t('detail.profile.noCv')}</p>
        )}
      </Block>

      <Block title={t('detail.profile.personal')}>
        <InfoRows
          rows={[
            { label: t('detail.profile.dob'), value: birthDate },
            { label: t('detail.profile.location'), value: detail.location },
            { label: t('detail.profile.title'), value: role },
            { label: t('detail.profile.bio'), value: detail.bio },
            { label: t('detail.profile.highlights'), value: detail.highlights },
          ]}
        />
      </Block>

      {/* Details above are the latest submission's snapshot; each submission keeps its own statements */}
      {latest && (
        <Block title={t('detail.submission.title', { number: latest.number, date: formatDate(latest.submittedAt) })}>
          <ul className="space-y-2">
            {latest.declarations.map((d) => (
              <li key={d.code} className="border-border bg-surface-muted/50 text-text flex gap-2.5 rounded-lg border p-3 text-sm leading-6">
                <FileCheck2 size={16} aria-hidden="true" className="text-success mt-1 shrink-0" />
                <span className="whitespace-pre-line">{d.text}</span>
              </li>
            ))}
          </ul>
          {submissions.length > 1 && (
            <p className="text-text-muted mt-2 text-xs">
              {t('detail.submission.earlier', {
                dates: submissions.slice(0, -1).map((x) => formatDate(x.submittedAt)).join(', '),
              })}
            </p>
          )}
        </Block>
      )}
    </div>
  )
}
