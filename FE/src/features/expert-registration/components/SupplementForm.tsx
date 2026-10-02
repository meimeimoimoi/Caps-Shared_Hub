import type { FormEvent } from 'react'
import { FormField } from './FormField'

export interface SupplementFormProps {
  explanation: string
  submitting: boolean
  onExplanationChange: (value: string) => void
  onFileChange: (file: File | null) => void
  onError: (msg: string) => void
  onBack: () => void
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
}

const inputCls =
  'w-full px-3 py-2.5 border border-ex-input-border rounded-[5px] bg-white text-ex-ink min-h-11 font-normal caret-ex-accent transition-[border-color,box-shadow] duration-150 ease-in-out focus:border-ex-accent focus:shadow-[0_0_0_3px_var(--color-ex-ring)] motion-reduce:transition-none'
const btnBase =
  'cursor-pointer inline-flex items-center justify-center gap-2 min-h-11 px-[17px] py-[9px] border border-ex-btn-border rounded-md bg-white text-ex-ink font-semibold transition-[background,border-color,opacity] duration-150 ease-in-out hover:bg-ex-btn-hover disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none'
const btnPrimary = `${btnBase} !bg-ex-accent !border-ex-accent !text-white hover:!bg-ex-accent-hover`

export function SupplementForm({
  explanation,
  submitting,
  onExplanationChange,
  onFileChange,
  onError,
  onBack,
  onSubmit,
}: SupplementFormProps) {
  return (
    <form onSubmit={onSubmit}>
      <p>
        Professional qualifications: provide a readable copy or clarify the
        information in your existing evidence. This is an illustrative request.
      </p>
      <FormField
        label="Replacement document"
        hint="PDF, JPG or PNG · maximum 10 MB (demo)"
      >
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className={inputCls}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f && (!/\.(pdf|png|jpe?g)$/i.test(f.name) || f.size > 10485760)) {
              onError('Choose a PDF, JPG or PNG under 10 MB.')
              onFileChange(null)
              e.target.value = ''
              return
            }
            onFileChange(f ?? null)
            onError('')
          }}
        />
      </FormField>
      <FormField label="Explanation">
        <textarea
          value={explanation}
          onChange={(e) => onExplanationChange(e.target.value)}
          className={`${inputCls} min-h-[110px] resize-y`}
        />
      </FormField>
      <div className="flex items-center justify-between gap-[18px] border-t border-ex-border-light pt-[22px] max-md:flex-wrap">
        <button type="button" className={btnBase} onClick={onBack}>
          Back
        </button>
        <button
          className={`${btnPrimary} ${submitting ? 'ex-loading' : ''}`}
          disabled={submitting}
        >
          {submitting ? 'Sending…' : 'Send additional information'}
        </button>
      </div>
    </form>
  )
}
