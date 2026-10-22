import { useTranslation } from 'react-i18next'
import { FileText } from 'lucide-react'
import type { ReactNode } from 'react'
import type { ApplicationDetail } from '../types'
import { documentKey, formatDate } from '../utils/applications'
import { useFieldLabel } from '../hooks/useLabels'

interface ProfileTabProps {
  detail: ApplicationDetail
  /** Takes the document key (evidence id or code) */
  onOpenDocument: (key: string) => void
}

function InfoSection({
  title,
  rows,
}: {
  title: string
  rows: { label: string; value: ReactNode }[]
}) {
  return (
    <section className="min-w-0">
      <h2 className="text-text-strong !font-sans !text-sm font-semibold">{title}</h2>
      <dl className="mt-2">
        {rows.map(({ label, value }) => (
          <div key={label} className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] gap-3 py-2">
            <dt className="text-fg-muted text-sm">{label}</dt>
            <dd className="text-fg-strong min-w-0 text-sm break-words">{value || '—'}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

export function ProfileTab({ detail, onOpenDocument }: ProfileTabProps) {
  const { t } = useTranslation('admin')
  const fieldLabel = useFieldLabel()
  const cv = detail.documents.find((d) => d.code === 'CV')
  const submissions = detail.submissions ?? []
  const latest = submissions.at(-1)

  return (
    <div className="divide-border space-y-4 divide-y [&>section+section]:pt-4">
      <InfoSection
        title={t('detail.profile.personal')}
        rows={[
          { label: t('detail.profile.name'), value: detail.name },
          {
            label: t('detail.profile.dob'),
            value: <span className="tabular-nums">{detail.birthDate && !Number.isNaN(Date.parse(detail.birthDate)) ? formatDate(detail.birthDate) : '—'}</span>,
          },
          { label: t('detail.profile.location'), value: detail.location },
          {
            label: t('detail.profile.title'),
            value: [detail.jobTitle, detail.company].filter(Boolean).join(' · '),
          },
          { label: t('detail.profile.bio'), value: detail.bio },
        ]}
      />
      <InfoSection
        title={t('detail.profile.experience')}
        rows={[
          {
            label: t('detail.profile.years'),
            value: (
              <span className="num">
                {t('detail.meta.years', { count: detail.years })}
              </span>
            ),
          },
          {
            label: t('detail.profile.fields'),
            value: detail.fields.map(fieldLabel).join(', '),
          },
          {
            label: t('detail.profile.cv'),
            value: cv ? (
              <button
                type="button"
                onClick={() => onOpenDocument(documentKey(cv))}
                className="text-text-strong focus-visible:ring-[var(--ui-border-strong)] inline-flex max-w-full items-center gap-1.5 rounded-sm text-left font-medium hover:underline focus-visible:ring-2 focus-visible:outline-none"
              >
                <FileText size={14} aria-hidden="true" className="text-text-muted shrink-0" />
                <span className="min-w-0 truncate">{cv.name}</span>
              </button>
            ) : (
              <span className="text-fg-muted">{t('detail.profile.noCv')}</span>
            ),
          },
          { label: t('detail.profile.highlights'), value: detail.highlights },
        ]}
      />
      {/* Details above are the latest submission's snapshot; each submission keeps its own statements */}
      {latest && (
        <section className="min-w-0">
          <h2 className="text-text-strong !font-sans !text-sm font-semibold">
            {t('detail.submission.title', {
              number: latest.number,
              date: formatDate(latest.submittedAt),
            })}
          </h2>
          <ul className="mt-2 space-y-2">
            {latest.declarations.map((d) => (
              <li key={d.code} className="text-fg-strong text-sm">
                <span className="text-fg-muted">
                  {t('detail.submission.agreed')}
                </span>{' '}
                “{d.text}”
              </li>
            ))}
          </ul>
          {submissions.length > 1 && (
            <p className="text-fg-muted mt-2 text-xs">
              {t('detail.submission.earlier', {
                dates: submissions
                  .slice(0, -1)
                  .map((x) => formatDate(x.submittedAt))
                  .join(', '),
              })}
            </p>
          )}
        </section>
      )}
    </div>
  )
}
