import { useTranslation } from 'react-i18next'
import { CircleAlert } from 'lucide-react'
import { HelpTip } from '@/components/ui/feedback/help-tip'
import type { EvidenceFile, Profile } from '../../types'
import { RegistrationSummary } from './RegistrationSummary'

export interface ReviewSubmitProps {
  profile: Profile
  avatarPreview: string
  independent: boolean
  fields: string[]
  files: Record<string, EvidenceFile[]>
  confirmed: boolean
  formErrors: Record<string, string>
  onConfirmedChange: (val: boolean) => void
  /** Opens the step that holds a section; saving there comes back to this review */
  onEditStep: (step: number) => void
}

export function ReviewSubmit({
  profile,
  avatarPreview,
  independent,
  fields,
  files,
  confirmed,
  formErrors,
  onConfirmedChange,
  onEditStep,
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
        onEditStep={onEditStep}
      />

      {/* ── Confirmation Checkbox ── */}
      <div className="expert-review-confirmation">
        <div className="expert-review-confirmation-row">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              name="confirmed"
              className="expert-custom-checkbox"
              type="checkbox"
              checked={confirmed}
              onChange={(e) => onConfirmedChange(e.target.checked)}
              aria-invalid={!!formErrors.confirmed}
              aria-describedby={
                formErrors.confirmed ? 'error-confirmed' : undefined
              }
              required
            />
            <span className="text-text-strong text-[14.5px] leading-relaxed font-medium">
              {t('review.confirm')}
            </span>
          </label>
        </div>
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
