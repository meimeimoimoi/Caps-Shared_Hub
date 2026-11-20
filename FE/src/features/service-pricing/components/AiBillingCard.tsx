import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { HelpTip } from '@/components/ui/feedback/help-tip'
import { LoadError } from '@/components/ui/feedback/load-error'
import { Toast } from '@/components/ui/feedback/toast'
import { cn, formatDateTime } from '@/lib/utils'
import { useAiBilling } from '../hooks/usePricing'
import { AiPricesDialog } from './AiPricesDialog'

const priceKeys = [
  'chatCreditCost',
  'draftCreditCost',
  'initialFreeQuota',
] as const

/* The paid-AI switch and AI prices: on, AI chat and drafting use the free uses and then credits; off, AI is free for everyone. */
export function AiBillingCard() {
  const { t } = useTranslation('admin')
  const { data, isLoading, set, saving, setPrices } = useAiBilling()
  const [toast, setToast] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)

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
    <section className="paper mt-8 p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
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
              {t(
                data.enabled ? 'pricing.aiBilling.on' : 'pricing.aiBilling.off'
              )}
            </span>
          </button>
        )}
      </div>
      {data && (
        <div className="border-border-subtle mt-4 flex flex-wrap items-end justify-between gap-4 border-t pt-4">
          <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-3">
            {priceKeys.map((key) => (
              <div key={key}>
                <dt className="text-fg-muted">
                  {t(`pricing.aiBilling.prices.${key}`)}
                </dt>
                <dd className="text-fg-strong num font-semibold">
                  {t(
                    key === 'initialFreeQuota'
                      ? 'pricing.aiBilling.prices.uses'
                      : 'pricing.aiBilling.prices.credits',
                    { count: data[key] }
                  )}
                </dd>
              </div>
            ))}
          </dl>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="btn btn-press btn-secondary"
          >
            {t('pricing.aiBilling.prices.edit')}
          </button>
        </div>
      )}
      {editing && data && (
        <AiPricesDialog
          prices={data}
          onClose={() => setEditing(false)}
          onSave={(prices) =>
            setPrices(prices).then(() =>
              setToast(t('pricing.aiBilling.prices.saved'))
            )
          }
        />
      )}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </section>
  )
}
