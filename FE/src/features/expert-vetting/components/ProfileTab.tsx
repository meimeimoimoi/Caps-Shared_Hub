import { useTranslation } from 'react-i18next'
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
      <h2 className="text-text-strong font-sans text-lg font-semibold tracking-tight">{title}</h2>
      <dl className="divide-border-subtle mt-3 divide-y">
        {rows.map(({ label, value }) => (
          <div
            key={label}
            className="grid gap-1.5 py-3.5"
          >
            <dt className="text-fg-muted text-sm">{label}</dt>
            <dd className="text-fg-strong min-w-0 text-sm leading-6 break-words">{value || '—'}</dd>
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

  return (
    <div className="divide-border space-y-7 divide-y [&>section+section]:pt-7">
      <InfoSection
        title={t('detail.profile.personal')}
        rows={[
          { label: t('detail.profile.name'), value: detail.name },
          {
            label: t('detail.profile.dob'),
            value: <span className="tabular-nums">{detail.birthDate && !Number.isNaN(Date.parse(detail.birthDate)) ? formatDate(detail.birthDate) : '—'}</span>,
          },
          {
            label: t('detail.profile.title'),
            value: [detail.jobTitle, detail.company].filter(Boolean).join(' · '),
          },
          { label: t('detail.profile.location'), value: detail.location },
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
                className="text-accent-text min-h-10 py-2 text-left font-medium break-all underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                {cv.name}
              </button>
            ) : (
              <span className="text-fg-muted">{t('detail.profile.noCv')}</span>
            ),
          },
          { label: t('detail.profile.highlights'), value: detail.highlights },
        ]}
      />
    </div>
  )
}
