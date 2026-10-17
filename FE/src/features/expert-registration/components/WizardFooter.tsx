import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  ArrowRight,
  Save,
  Loader2,
  CheckCircle2,
} from 'lucide-react'

export interface WizardFooterProps {
  step: number
  submitting: boolean
  draftSaved: boolean
  onSaveDraft: () => void
  onBack: () => void
}

export function WizardFooter({
  step,
  submitting,
  draftSaved,
  onSaveDraft,
  onBack,
}: WizardFooterProps) {
  const { t } = useTranslation('expertRegistration')

  return (
    <footer className="expert-wizard-actions expert-wizard-footer">
      <div className="expert-footer-left">
        <button
          type="button"
          className="expert-footer-btn expert-footer-draft"
          onClick={onSaveDraft}
          disabled={submitting}
        >
          {draftSaved ? <CheckCircle2 size={15} /> : <Save size={15} />}
          {draftSaved ? t('actions.saved') : t('actions.save')}
        </button>
      </div>
      <div className="expert-footer-right">
        {step > 0 && (
          <button
            type="button"
            className="expert-footer-btn expert-footer-back"
            onClick={onBack}
            disabled={submitting}
          >
            <ArrowLeft size={16} />
            {t('actions.back')}
          </button>
        )}
        <button
          className={`expert-footer-btn expert-footer-continue ${step === 3 && submitting ? 'expert-footer-continue--loading' : ''}`}
          disabled={submitting}
          aria-busy={step === 3 && submitting}
        >
          {step === 3 && submitting && (
            <Loader2
              size={16}
              className="animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
          )}
          {step === 3 && submitting
            ? t('actions.submitting')
            : step === 3
              ? t('actions.submit')
              : t('actions.continue')}
          {!(step === 3 && submitting) && <ArrowRight size={16} />}
        </button>
      </div>
    </footer>
  )
}
