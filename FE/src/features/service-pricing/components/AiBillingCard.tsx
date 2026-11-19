import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { HelpTip } from '@/components/ui/feedback/help-tip'
import { LoadError } from '@/components/ui/feedback/load-error'
import { Toast } from '@/components/ui/feedback/toast'
import { cn, formatDateTime } from '@/lib/utils'
import { useAiBilling } from '../hooks/usePricing'

/* The paid-AI switch: on, AI chat and drafting use the free uses and then credits; off, AI is free for everyone. */
export function AiBillingCard() {
  const { t } = useTranslation('admin')
  const { data, isLoading, set, saving } = useAiBilling()
  const [toast, setToast] = useState<string | null>(null)

  const toggle = () => {
    if (!data || saving) return
    const next = !data.enabled
    set(next)
      .then(() =>
        setToast(
          t(next ? 'pricing.aiBilling.saved' : 'pricing.aiBilling.savedOff')
        )
      )
      .catch(() => setToast(t('pricing.aiBilling.failed')))
  }

  return (
    <section className="paper mt-8 flex flex-wrap items-center justify-between gap-4 p-5">
      <div className="flex items-center gap-2">
        <h2 id="ai-billing-title" className="text-h2">
          {t('pricing.aiBilling.title')}
        </h2>
        <HelpTip label={t('pricing.aiBilling.title')}>
          {t('pricing.aiBilling.help')}{' '}
          {data &&
            (data.updatedAt
              ? t('pricing.aiBilling.updated', {
                  at: formatDateTime(data.updatedAt),
                })
              : t('pricing.aiBilling.default'))}
        </HelpTip>
      </div>
      {isLoading ? (
        <span
          role="status"
          className="bg-sunken block h-7 w-32 rounded motion-safe:animate-pulse"
        />
      ) : !data ? (
        <LoadError />
      ) : (
        <button
          type="button"
          role="switch"
          aria-checked={data.enabled}
          aria-labelledby="ai-billing-title"
          onClick={toggle}
          disabled={saving}
          className="flex items-center gap-3 disabled:opacity-60"
        >
          <span
            aria-hidden="true"
            className={cn(
              'relative h-7 w-12 rounded-full transition-colors',
              data.enabled ? 'bg-accent' : 'bg-sunken border-border border'
            )}
          >
            <span
              className={cn(
                'absolute top-1 left-1 size-5 rounded-full bg-white shadow transition-transform',
                data.enabled && 'translate-x-5'
              )}
            />
          </span>
          <span className="text-fg-strong font-semibold">
            {t(data.enabled ? 'pricing.aiBilling.on' : 'pricing.aiBilling.off')}
          </span>
        </button>
      )}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </section>
  )
}
