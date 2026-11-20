import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from '@/components/ui/feedback/modal'
import { FormField } from '@/components/ui/forms/form-field'
import type { AiPricesInput } from '../types'

interface AiPricesDialogProps {
  prices: AiPricesInput
  onClose: () => void
  /** Reject keeps the dialog open with an error */
  onSave: (input: AiPricesInput) => Promise<unknown>
}

const inputCls =
  'border-border-control rounded-control shadow-control bg-paper h-control w-full border px-3 text-base font-normal num text-right'

/* Edits what AI chat and drafting cost, and the free uses a new account gets */
export function AiPricesDialog({
  prices,
  onClose,
  onSave,
}: AiPricesDialogProps) {
  const { t } = useTranslation(['admin', 'common'])
  const [chat, setChat] = useState(String(prices.chatCreditCost))
  const [draft, setDraft] = useState(String(prices.draftCreditCost))
  const [quota, setQuota] = useState(String(prices.initialFreeQuota))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const field = (
    id: keyof AiPricesInput,
    value: string,
    onChange: (v: string) => void
  ) => (
    <FormField
      label={t(`pricing.aiBilling.prices.${id}`)}
      help={t(`pricing.aiBilling.prices.${id}Help`)}
      htmlFor={`ai-price-${id}`}
      className="!mb-0"
    >
      <input
        id={`ai-price-${id}`}
        required
        type="number"
        inputMode="numeric"
        min={0}
        step={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
      />
    </FormField>
  )

  return (
    <Modal
      title={t('pricing.aiBilling.prices.title')}
      onClose={onClose}
      // `required`/`min` on the inputs already block an empty or negative submit
      onSubmit={() => {
        setBusy(true)
        setError(null)
        onSave({
          chatCreditCost: Number(chat),
          draftCreditCost: Number(draft),
          initialFreeQuota: Number(quota),
        })
          .then(onClose)
          .catch(() => {
            setBusy(false)
            setError(t('common:states.actionFailed'))
          })
      }}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-press btn-secondary"
          >
            {t('common:actions.cancel')}
          </button>
          <button
            type="submit"
            disabled={busy}
            className="btn btn-press btn-primary"
          >
            {busy
              ? t('pricing.aiBilling.prices.saving')
              : t('pricing.aiBilling.prices.save')}
          </button>
        </>
      }
    >
      <div className="mt-5 space-y-4">
        {field('chatCreditCost', chat, setChat)}
        {field('draftCreditCost', draft, setDraft)}
        {field('initialFreeQuota', quota, setQuota)}
        {error && (
          <p role="alert" className="text-danger text-sm">
            {error}
          </p>
        )}
      </div>
    </Modal>
  )
}
