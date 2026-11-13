import { PlugZap } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/**
 * Disputes and escrow have no backend outside the demo yet. Say so plainly instead of
 * showing a load error with a Retry that can never succeed, or zero amounts that look real.
 */
export function OperationsUnavailable() {
  const { t } = useTranslation('admin')
  return (
    <section
      role="status"
      className="paper mt-8 flex flex-col items-center gap-2 px-6 py-12 text-center"
    >
      <PlugZap size={24} aria-hidden="true" className="text-fg-muted" />
      <h2 className="text-h2">{t('operationsUnavailable.title')}</h2>
      <p className="max-w-[60ch] text-sm">{t('operationsUnavailable.body')}</p>
    </section>
  )
}
