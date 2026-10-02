import { ArrowLeft, ArrowRight, Save } from 'lucide-react'

export interface WizardFooterProps {
  step: number
  submitting: boolean
  draftSaved: boolean
  onSaveDraft: () => void
  onBack: () => void
}

const btnBase =
  'cursor-pointer inline-flex items-center justify-center gap-2 min-h-11 px-[17px] py-[9px] border border-ex-btn-border rounded-md bg-white text-ex-ink font-semibold transition-[background,border-color,opacity] duration-150 ease-in-out hover:bg-ex-btn-hover disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none'
const btnPrimary = `${btnBase} !bg-ex-accent !border-ex-accent !text-white hover:!bg-ex-accent-hover`
const mutedCls = 'text-[13px] text-ex-muted font-normal'

export function WizardFooter({
  step,
  submitting,
  draftSaved,
  onSaveDraft,
  onBack,
}: WizardFooterProps) {
  return (
    <footer className="flex items-center justify-between gap-[18px] border-t border-ex-border-light pt-[22px] max-md:flex-wrap [&>div]:flex [&>div]:gap-3 max-md:[&>div]:w-full max-md:[&>div]:justify-between">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className={`${btnBase} gap-1.5`}
          onClick={onSaveDraft}
        >
          <Save size={15} />
          {draftSaved ? 'Saved' : 'Save draft'}
        </button>
        <span className={`${mutedCls} max-md:hidden`}>
          In-memory only · clears on refresh
        </span>
      </div>
      <div>
        {step > 0 && (
          <button type="button" className={btnBase} onClick={onBack}>
            <ArrowLeft size={16} /> Back
          </button>
        )}
        <button
          className={`${btnPrimary} ${step === 3 && submitting ? 'ex-loading' : ''}`}
          disabled={step === 3 && submitting}
        >
          {step === 3 && submitting
            ? 'Submitting…'
            : step === 3
              ? 'Submit demo application'
              : 'Continue'}
          {!(step === 3 && submitting) && <ArrowRight size={16} />}
        </button>
      </div>
    </footer>
  )
}
