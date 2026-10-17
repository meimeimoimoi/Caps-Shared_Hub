import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'
import type { ApplicationDetail } from '../types'
import { formatDate } from '../utils/applications'

interface ProfileTabProps {
  detail: ApplicationDetail
  onOpenDocument: (code: string) => void
}

function InfoSection({
  title,
  rows,
}: {
  title: string
  rows: { label: string; value: ReactNode }[]
}) {
  return (
    <section className="paper p-5 md:p-6">
      <h2 className="text-h2">{title}</h2>
      <dl className="divide-border-subtle mt-3 divide-y">
        {rows.map(({ label, value }) => (
          <div
            key={label}
            className="grid gap-x-6 gap-y-1 py-2.5 sm:grid-cols-[160px_1fr]"
          >
            <dt className="text-fg-muted text-sm">{label}</dt>
            <dd className="text-fg-strong">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

export function ProfileTab({ detail, onOpenDocument }: ProfileTabProps) {
  const { t } = useTranslation('admin')
  const cv = detail.documents.find((d) => d.code === 'CV')

  return (
    <div className="space-y-4 md:space-y-6">
      <InfoSection
        title={t('detail.profile.personal')}
        rows={[
          { label: t('detail.profile.name'), value: detail.name },
          {
            label: t('detail.profile.dob'),
            value: <span className="num">{formatDate(detail.birthDate)}</span>,
          },
          {
            label: t('detail.profile.title'),
            value: `${detail.jobTitle}, ${detail.company}`,
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
            value: detail.fields.join(', '),
          },
          {
            label: t('detail.profile.cv'),
            value: cv ? (
              <button
                type="button"
                onClick={() => onOpenDocument(cv.code)}
                className="text-accent-text font-semibold underline underline-offset-4"
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
