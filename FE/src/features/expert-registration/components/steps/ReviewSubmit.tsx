import { useTranslation } from 'react-i18next'
import { CircleAlert } from 'lucide-react'
import { HelpTip } from '@/components/ui/feedback/help-tip'
import { formControlClassName as inputCls } from '@/components/ui/forms/form-control'
import type { EvidenceFile, Profile } from '../../types'
import type { Declaration } from '../../api/applicationApi'
import { RegistrationSummary } from './RegistrationSummary'

export interface ReviewSubmitProps {
  profile: Profile
  avatarPreview: string
  independent: boolean
  fields: string[]
  files: Record<string, EvidenceFile[]>
  /** Server codes of the evidence groups that need a file */
  requiredEvidence: string[]
  /** Statements to agree to, worded by the server in the interface language */
  declarations: Declaration[]
  /** Codes of the statements ticked */
  agreed: string[]
  formErrors: Record<string, string>
  onAgreedChange: (code: string, val: boolean) => void
  /** Set while more information is requested: the step resubmits with an optional explanation */
  supplement?: {
    note: string
    onNoteChange: (value: string) => void
    reviewerNote: string | null
  }
  /** Opens the step that holds a section; saving there comes back to this review */
  onEditStep: (step: number) => void
}

export function ReviewSubmit({
  profile,
  avatarPreview,
  independent,
  fields,
  files,
  requiredEvidence,
  declarations,
  agreed,
  formErrors,
  onAgreedChange,
  onEditStep,
  supplement,
}: ReviewSubmitProps) {
  const { t } = useTranslation('expertRegistration')

  return (
    <div className="expert-pro-review">
      <div className="expert-review-toolbar">
        <p>{t('review.guidance')}</p>
        <HelpTip label={t('review.aiHelpLabel')}>{t('review.ai')}</HelpTip>
      </div>

      <RegistrationSummary
        profile={profile}
        avatarPreview={avatarPreview}
        independent={independent}
        fields={fields}
        files={files}
        requiredEvidence={requiredEvidence}
        conductAgreed={agreed.includes('PROFESSIONAL_CONDUCT')}
        onEditStep={onEditStep}
      />

      {/* What the reviewer asked for, and the applicant's explanation (supplement only) */}
      {supplement && (
        <div className="expert-review-confirmation">
          {supplement.reviewerNote && (
            <p className="text-ex-muted mb-3 text-[13.5px]">
              <strong>{t('supplementStep.reviewerNote')}</strong>{' '}
              {supplement.reviewerNote}
            </p>
          )}
          <label htmlFor="supplement-note" className="font-medium">
            {t('supplementStep.noteLabel')}
          </label>
          <textarea
            id="supplement-note"
            className={`${inputCls} mt-2 min-h-[110px] w-full resize-y`}
            rows={4}
            maxLength={2000}
            value={supplement.note}
            onChange={(e) => supplement.onNoteChange(e.target.value)}
            placeholder={t('supplementStep.notePlaceholder')}
          />
          <p className="text-ex-muted mt-1 text-[12.5px]">
            {t('supplementStep.noteHint')}
          </p>
        </div>
      )}

      {/* Conduct is accepted in the evidence step and listed with the documents; only accuracy is confirmed here */}
      <div className="expert-review-confirmation">
        {declarations
          .filter((d) => d.code !== 'PROFESSIONAL_CONDUCT')
          .map((d) => (
            <div key={d.code} className="expert-review-confirmation-row">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  name="confirmed"
                  className="expert-custom-checkbox"
                  type="checkbox"
                  checked={agreed.includes(d.code)}
                  onChange={(e) => onAgreedChange(d.code, e.target.checked)}
                  aria-invalid={!!formErrors.confirmed}
                  aria-describedby={
                    formErrors.confirmed ? 'error-confirmed' : undefined
                  }
                  required
                />
                <span className="text-text-strong text-[14.5px] leading-relaxed font-medium">
                  {d.text}
                </span>
              </label>
            </div>
          ))}
        {formErrors.confirmed && (
          <p
            id="error-confirmed"
            role="alert"
            className="expert-review-confirmation-error"
          >
            <CircleAlert size={15} aria-hidden="true" />
            <span>{formErrors.confirmed}</span>
          </p>
        )}
      </div>
    </div>
  )
}
