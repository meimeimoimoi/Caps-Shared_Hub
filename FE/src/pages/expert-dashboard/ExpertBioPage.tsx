import { useState, type InputHTMLAttributes } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowUpRight, Save } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useExpertContext } from '@/features/expert-context'
import { ExpertBioView } from '@/features/expert-bio/ExpertBioView'
import {
  useExpertBio,
  useSaveExpertBio,
  type ExpertBio,
  type ExpertBioInput,
} from '@/features/expert-bio/useExpertBio'
import {
  DashboardSectionState,
  DashboardSkeleton,
} from '@/features/expert-dashboard/components/DashboardSectionState'
import '@/features/expert-pricing/pricing.css'

const LIMITS = { headline: 120, bio: 2000 }

export default function ExpertBioPage() {
  const { t } = useTranslation('expert')
  const expertId = useExpertContext().data?.expertId
  const query = useExpertBio(expertId)
  if (query.isPending) return <DashboardSkeleton />
  if (!query.data)
    return (
      <DashboardSectionState
        title={t('bio.unavailable')}
        message={t('bio.unavailableMessage')}
        retry={() => void query.refetch()}
      />
    )
  return <BioEditor saved={query.data} />
}

function BioEditor({ saved }: { saved: ExpertBio }) {
  const { t } = useTranslation('expert')
  const mutation = useSaveExpertBio(saved.expertId)
  const [form, setForm] = useState({
    headline: saved.headline,
    location: saved.location,
    years: String(saved.yearsOfExperience),
    bio: saved.bio,
    expertise: saved.expertise.join(', '),
    highlights: saved.highlights.join('\n'),
  })
  const [submitted, setSubmitted] = useState(false)
  const update = (key: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [key]: value }))
    mutation.reset()
  }

  const input: ExpertBioInput = {
    headline: form.headline.trim(),
    location: form.location.trim(),
    yearsOfExperience: Number(form.years) || 0,
    bio: form.bio.trim(),
    expertise: form.expertise
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    highlights: form.highlights
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean),
  }
  const errors = {
    headline: !input.headline
      ? t('bio.errors.headlineRequired')
      : input.headline.length > LIMITS.headline
        ? t('bio.errors.headlineLong')
        : null,
    years: !/^\d{1,2}$/.test(form.years.trim()) ? t('bio.errors.years') : null,
    bio: !input.bio
      ? t('bio.errors.bioRequired')
      : input.bio.length > LIMITS.bio
        ? t('bio.errors.bioLong')
        : null,
  }
  const shown = (key: keyof typeof errors) => (submitted ? errors[key] : null)

  const field = (
    key: 'headline' | 'location' | 'years' | 'expertise',
    extra: InputHTMLAttributes<HTMLInputElement> = {}
  ) => {
    const error = key in errors ? shown(key as keyof typeof errors) : null
    return (
      <div className="epr-field">
        <label htmlFor={`bio-${key}`}>{t(`bio.fields.${key}`)}</label>
        <input
          id={`bio-${key}`}
          value={form[key]}
          onChange={(e) => update(key, e.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={`bio-${key}-help${error ? ` bio-${key}-error` : ''}`}
          {...extra}
        />
        <p id={`bio-${key}-help`}>{t(`bio.help.${key}`)}</p>
        {error && (
          <p id={`bio-${key}-error`} className="epr-field-error">
            {error}
          </p>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="ep-page-heading">
        <div>
          <h1>{t('bio.title')}</h1>
          <p>{t('bio.subtitle')}</p>
        </div>
        <Link
          className="ep-button"
          to={`/experts/${encodeURIComponent(saved.expertId)}`}
          target="_blank"
        >
          {t('bio.viewPublic')}
          <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      </div>
      <div className="mt-6 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <form
          noValidate
          aria-busy={mutation.isPending}
          onSubmit={(e) => {
            e.preventDefault()
            setSubmitted(true)
            if (!Object.values(errors).some(Boolean)) mutation.mutate(input)
          }}
        >
          <fieldset
            className="m-0 grid min-w-0 gap-6 border-0 p-0"
            disabled={mutation.isPending}
          >
            {field('headline', { maxLength: LIMITS.headline })}
            {field('location', { autoComplete: 'address-level2' })}
            {field('years', { inputMode: 'numeric', maxLength: 2 })}
            <div className="epr-field">
              <label htmlFor="bio-bio">{t('bio.fields.bio')}</label>
              <textarea
                id="bio-bio"
                rows={7}
                maxLength={LIMITS.bio}
                value={form.bio}
                onChange={(e) => update('bio', e.target.value)}
                aria-invalid={Boolean(shown('bio'))}
                aria-describedby={`bio-bio-help${shown('bio') ? ' bio-bio-error' : ''}`}
              />
              <div className="epr-field-meta">
                <p id="bio-bio-help">{t('bio.help.bio')}</p>
                <span>
                  {form.bio.length}/{LIMITS.bio}
                </span>
              </div>
              {shown('bio') && (
                <p id="bio-bio-error" className="epr-field-error">
                  {shown('bio')}
                </p>
              )}
            </div>
            {field('expertise')}
            <div className="epr-field">
              <label htmlFor="bio-highlights">
                {t('bio.fields.highlights')}
              </label>
              <textarea
                id="bio-highlights"
                rows={4}
                value={form.highlights}
                onChange={(e) => update('highlights', e.target.value)}
                aria-describedby="bio-highlights-help"
              />
              <p id="bio-highlights-help">{t('bio.help.highlights')}</p>
            </div>
          </fieldset>
          <div className="epr-form-actions">
            <button
              className="ep-button ep-button-primary"
              type="submit"
              disabled={mutation.isPending}
            >
              <Save size={16} aria-hidden="true" />
              {mutation.isPending ? t('bio.saving') : t('bio.save')}
            </button>
          </div>
          <div className="epr-feedback" aria-live="polite">
            {mutation.isSuccess && (
              <p className="epr-success">{t('bio.saved')}</p>
            )}
          </div>
          {mutation.isError && (
            <p role="alert" className="epr-field-error">
              {t('bio.saveFailed')}
            </p>
          )}
        </form>
        <section aria-label={t('bio.preview')} className="lg:sticky lg:top-6">
          <p className="mb-3 text-[12px] font-semibold tracking-wide text-[var(--ep-muted)] uppercase">
            {t('bio.preview')}
          </p>
          <ExpertBioView bio={{ ...saved, ...input }} />
        </section>
      </div>
    </>
  )
}
