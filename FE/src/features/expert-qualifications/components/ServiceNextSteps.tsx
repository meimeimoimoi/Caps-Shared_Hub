import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Check, Circle } from 'lucide-react'
import { HelpTip } from '@/components/ui/feedback/help-tip'
import { useExpertContext } from '@/features/expert-context'

/** After approval: the three steps to the Marketplace (BR-M01), each marked done from the portal context */
export function ServiceNextSteps({ serviceCode }: { serviceCode: string }) {
  const { t } = useTranslation('expert')
  const context = useExpertContext()
  const service = context.data?.services.find((s) => s.serviceId === serviceCode)
  if (!service) return null
  const steps = [
    {
      key: 'pricing',
      done: service.pricing != null,
      to: `/expert/services/${encodeURIComponent(serviceCode)}/pricing`,
    },
    { key: 'availability', done: service.availability, to: '/expert/availability' },
    { key: 'marketplace', done: service.bookingAllowed, to: '/marketplace' },
  ] as const

  return (
    <section className="mt-6 rounded-lg border border-[var(--ep-border)] bg-[var(--ep-surface)] p-5">
      <div className="flex items-center gap-1.5">
        <h2 className="font-semibold text-[var(--ep-ink)]">{t('qualifications.nextSteps.title')}</h2>
        <HelpTip label={t('qualifications.nextSteps.title')}>{t('qualifications.nextSteps.help')}</HelpTip>
      </div>
      <ol className="mt-3 divide-y divide-[var(--ep-line)] text-sm">
        {steps.map((step, i) => (
          <li key={step.key} className="flex flex-wrap items-center justify-between gap-3 py-2">
            <span className="flex items-center gap-2 text-[var(--ep-ink)]">
              {step.done ? (
                <Check size={16} aria-hidden="true" className="text-[var(--ep-success)]" />
              ) : (
                <Circle size={16} aria-hidden="true" className="text-[var(--ep-muted)]" />
              )}
              {i + 1}. {t(`qualifications.nextSteps.${step.key}`)}
            </span>
            <span className="flex items-center gap-3">
              <span
                className={`font-semibold ${step.done ? 'text-[var(--ep-success)]' : 'text-[var(--ep-muted)]'}`}
              >
                {step.done ? t('qualifications.nextSteps.done') : t('qualifications.nextSteps.todo')}
              </span>
              <Link
                to={step.to}
                className="inline-flex min-h-11 items-center font-semibold text-[var(--ep-accent-text)]"
              >
                {t('qualifications.nextSteps.open')}
              </Link>
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}
