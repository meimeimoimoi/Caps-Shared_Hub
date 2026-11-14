import { PlugZap } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export type UnavailableArea = 'disputes' | 'escrow' | 'pricing' | 'users'

/**
 * An admin area whose backend is not connected yet. Says so plainly, and what the page will
 * hold once it opens, instead of a load error with a Retry that cannot succeed or zero amounts
 * that look real.
 */
export function OperationsUnavailable({ area }: { area?: UnavailableArea }) {
  const { t } = useTranslation('admin')
  return (
    <section
      role="status"
      className="paper mt-8 flex flex-col items-center gap-2 px-6 py-12 text-center"
    >
      <PlugZap size={24} aria-hidden="true" className="text-fg-muted" />
      <h2 className="text-h2">{t('operationsUnavailable.title')}</h2>
      <p className="max-w-[60ch] text-sm">
        {area
          ? t(`operationsUnavailable.areas.${area}`)
          : t('operationsUnavailable.body')}
      </p>
    </section>
  )
}
