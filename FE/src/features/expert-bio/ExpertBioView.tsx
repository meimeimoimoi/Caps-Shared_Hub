import { BadgeCheck, BriefcaseBusiness, MapPin } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useFormatters } from '@/hooks/useFormatters'
import type { ExpertBio } from './useExpertBio'

/** Client-facing profile. Also rendered as the live preview in the expert's editor. */
export function ExpertBioView({ bio }: { bio: ExpertBio }) {
  const { t } = useTranslation('expert')
  const format = useFormatters()
  const initials = bio.displayName
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <article className="border-border bg-paper text-fg rounded-xl border">
      <header className="border-border flex flex-wrap items-center gap-5 border-b p-6 md:p-8">
        {bio.avatarUrl ? (
          <img
            src={bio.avatarUrl}
            alt=""
            className="size-20 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="bg-surface-muted text-accent-text grid size-20 shrink-0 place-items-center rounded-full text-2xl font-semibold"
          >
            {initials}
          </span>
        )}
        <div className="min-w-0 flex-1 basis-60">
          <h1 className="text-fg-strong text-2xl font-semibold tracking-tight">
            {bio.displayName}
          </h1>
          {bio.headline && (
            <p className="text-fg mt-1 text-[15px]">{bio.headline}</p>
          )}
          <p className="text-fg-muted mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {bio.location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={15} aria-hidden="true" />
                {bio.location}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <BriefcaseBusiness size={15} aria-hidden="true" />
              {t('bio.years', { count: bio.yearsOfExperience })}
            </span>
          </p>
        </div>
      </header>

      <div className="grid gap-8 p-6 md:p-8">
        {bio.bio && (
          <section>
            <h2 className="text-fg-muted font-sans text-xs font-semibold tracking-wide uppercase">
              {t('bio.about')}
            </h2>
            <p className="mt-3 max-w-[65ch] text-[15px] leading-relaxed whitespace-pre-line">
              {bio.bio}
            </p>
          </section>
        )}
        {bio.expertise.length > 0 && (
          <section>
            <h2 className="text-fg-muted font-sans text-xs font-semibold tracking-wide uppercase">
              {t('bio.expertise')}
            </h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {bio.expertise.map((item) => (
                <li
                  key={item}
                  className="border-border rounded-md border px-3 py-1 text-sm"
                >
                  {item}
                </li>
              ))}
            </ul>
          </section>
        )}
        {bio.highlights.length > 0 && (
          <section>
            <h2 className="text-fg-muted font-sans text-xs font-semibold tracking-wide uppercase">
              {t('bio.highlights')}
            </h2>
            <ul className="mt-3 grid gap-2.5">
              {bio.highlights.map((item) => (
                <li key={item} className="flex gap-2.5 text-[15px]">
                  <BadgeCheck
                    size={18}
                    aria-hidden="true"
                    className="text-accent-text mt-0.5 shrink-0"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </section>
        )}
        <section>
          <h2 className="text-fg-muted font-sans text-xs font-semibold tracking-wide uppercase">
            {t('bio.services')}
          </h2>
          {bio.services.length === 0 ? (
            <p className="text-fg-muted mt-3 text-sm">{t('bio.noServices')}</p>
          ) : (
            <ul className="divide-border border-border mt-3 divide-y border-y">
              {bio.services.map((service) => (
                <li
                  key={service.serviceId}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3.5"
                >
                  <span className="font-medium">{service.serviceName}</span>
                  <span className="text-fg-strong font-semibold tabular-nums">
                    {service.price == null
                      ? t('bio.priceOnRequest')
                      : format.money(service.price)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </article>
  )
}
