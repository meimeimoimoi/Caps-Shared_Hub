import type { ReactNode } from 'react'
import { Info } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/** Demo disclosure uses neutral information styling, distinct from business warnings. */
export function DemoBanner({
  children,
  controls,
}: {
  children: ReactNode
  controls?: ReactNode
}) {
  const { t } = useTranslation('common')
  return (
    <section
      aria-label={t('demo.label')}
      className="font-num border-border-subtle bg-surface-muted text-text-muted flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b px-5 py-3 text-sm md:px-8"
    >
      <div className="flex min-w-0 flex-1 items-start gap-2.5">
        <Info size={18} aria-hidden="true" className="mt-0.5 shrink-0" />
        <div className="[&_strong]:text-text-strong [&_p]:!text-text-muted min-w-0">
          {children}
        </div>
      </div>
      {controls && (
        <div className="flex flex-wrap items-center gap-3">{controls}</div>
      )}
    </section>
  )
}
