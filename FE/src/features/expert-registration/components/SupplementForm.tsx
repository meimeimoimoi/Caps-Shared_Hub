import { Loader2, Upload, FileText, X } from 'lucide-react'
import type { FormEvent } from 'react'
import { FormField } from '@/shared/ui/form-field'
import { formControlClassName as inputCls, formButtonClassName as btnBase } from '@/shared/ui/form-control'

export interface SupplementFormProps {
  file: File | null
  explanation: string
  submitting: boolean
  onExplanationChange: (value: string) => void
  onFileChange: (file: File | null) => void
  onError: (msg: string) => void
  onBack: () => void
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
}

const btnPrimary = `${btnBase} !bg-ex-accent !border-ex-accent !text-white hover:!bg-ex-accent-hover`


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
        <label className="flex items-center flex-col gap-2 border border-dashed border-ex-chip-border rounded-md py-6 px-4 bg-ex-drop-bg cursor-pointer text-center transition-[border-color,background,box-shadow] duration-150 ease-in-out hover:border-ex-accent hover:bg-ex-drop-hover focus-within:ring-2 focus-within:ring-ex-accent focus-within:ring-offset-2 motion-reduce:transition-none">
          <Upload size={22} />
          <strong>Choose replacement document</strong>
          <input
            aria-label="Choose replacement document"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="sr-only"
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
              e.target.value = ''
            }}
          />
        </label>
        {file && (
          <div className="flex gap-2.5 items-center py-3 mt-2 border-b border-ex-file-border text-sm">
            <FileText size={18} />
            <span className="flex-1 break-all min-w-0">
              {file.name}
              <small className="block text-ex-muted">{(file.size / 1024).toFixed(0)} KB · Selected locally</small>
            </span>
            <button
              type="button"
              className={`${btnBase} !border-0 !p-2`}
              aria-label={`Remove ${file.name}`}
              onClick={() => onFileChange(null)}
            >
              <X size={18} />
            </button>
          </div>
        )}
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
          {submitting && <Loader2 size={16} className="animate-spin" />}
          {submitting ? 'Sending…' : 'Send additional information'}
        </button>
      </div>
    </form>
  )
}
