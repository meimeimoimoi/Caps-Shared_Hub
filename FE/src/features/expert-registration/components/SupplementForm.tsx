import { useTranslation } from 'react-i18next'
import { Loader2, Upload, FileText, X } from 'lucide-react'
import type { FormEvent } from 'react'
import type { RegistrationMessage } from '../types/messages'
import { useFormatters } from '@/hooks/useFormatters'
import { FormField } from '@/components/ui/forms/form-field'
import {
  formControlClassName as inputCls,
  formButtonClassName as btnBase,
} from '@/components/ui/forms/form-control'

export interface SupplementFormProps {
  file: File | null
  explanation: string
  submitting: boolean
  onExplanationChange: (value: string) => void
  onFileChange: (file: File | null) => void
  onError: (msg: RegistrationMessage | null) => void
  onBack: () => void
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
}

const btnPrimary = `${btnBase} !bg-ex-accent !border-ex-accent !text-on-accent hover:!bg-ex-accent-hover`

export function SupplementForm({
  file,
  explanation,
  submitting,
  onExplanationChange,
  onFileChange,
  onError,
  onBack,
  onSubmit,
}: SupplementFormProps) {
  const { t } = useTranslation('expertRegistration')
  const format = useFormatters()

  return (
    <form onSubmit={onSubmit}>
      <p>{t('supplement.guidance')}</p>
      <FormField
        label={t('supplement.document')}
        hint={t('supplement.formats')}
      >
        <label className="border-ex-chip-border bg-ex-drop-bg hover:border-ex-accent hover:bg-ex-drop-hover focus-within:ring-ex-accent flex cursor-pointer flex-col items-center gap-2 rounded-md border border-dashed px-4 py-6 text-center transition-[border-color,background,box-shadow] duration-[var(--motion-feedback)] ease-in-out focus-within:ring-2 focus-within:ring-offset-2 motion-reduce:transition-none">
          <Upload size={22} />
          <strong>{t('supplement.choose')}</strong>
          <input
            aria-label={t('supplement.choose')}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (
                f &&
                (!/\.(pdf|png|jpe?g)$/i.test(f.name) || f.size > 10485760)
              ) {
                onError({ key: 'supplement.fileError' })
                onFileChange(null)
                e.target.value = ''
                return
              }
              onFileChange(f ?? null)
              onError(null)
              e.target.value = ''
            }}
          />
        </label>
        {file && (
          <div className="border-ex-file-border mt-2 flex items-center gap-2.5 border-b py-3 text-sm">
            <FileText size={18} />
            <span className="min-w-0 flex-1 break-all">
              {file.name}
              <small className="text-ex-muted block">
                {t('files.localSize', { size: format.number(file.size / 1024, { maximumFractionDigits: 0 }) })}
              </small>
            </span>
            <button
              type="button"
              className={`${btnBase} !border-0 !p-2`}
              aria-label={t('files.remove', { name: file.name })}
              onClick={() => onFileChange(null)}
            >
              <X size={18} />
            </button>
          </div>
        )}
      </FormField>
      <FormField label={t('supplement.explanation')}>
        <textarea
          value={explanation}
          onChange={(e) => onExplanationChange(e.target.value)}
          className={`${inputCls} min-h-[110px] resize-y`}
        />
      </FormField>
      <div className="border-ex-border-light flex items-center justify-between gap-[18px] border-t pt-[22px] max-md:flex-wrap">
        <button type="button" className={btnBase} onClick={onBack}>
          {t('actions.back')}
        </button>
        <button
          className={`${btnPrimary} ${submitting ? 'ex-loading' : ''}`}
          disabled={submitting}
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}
          {submitting ? t('actions.sending') : t('actions.send')}
        </button>
      </div>
    </form>
  )
}
