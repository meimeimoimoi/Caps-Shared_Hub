import { useTranslation } from 'react-i18next'
import { Info, Edit2 } from 'lucide-react'
import type { Profile } from '../../types'
import { RegistrationSummary } from './RegistrationSummary'

export interface ReviewSubmitProps {
  profile: Profile
  avatarPreview: string
  independent: boolean
  fields: string[]
  files: Record<string, File[]>
  confirmed: boolean
  formErrors: Record<string, string>
  onConfirmedChange: (val: boolean) => void
  onEdit: () => void
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
  onEdit,
}: ReviewSubmitProps) {
  const { t } = useTranslation('expertRegistration')

  return (
    <div className="expert-pro-review">
      <div className="expert-review-toolbar">
        <p>{t('review.guidance')}</p>
        <button
          type="button"
          onClick={onEdit}
          className="expert-review-edit"
        >
          <Edit2 size={14} />
          {t('actions.edit')}
        </button>
      </div>

      <RegistrationSummary
        profile={profile}
        avatarPreview={avatarPreview}
        independent={independent}
        fields={fields}
        files={files}
      />

      {/* ── AI Notice ── */}
      <div className="expert-review-notice">
        <Info className="expert-pro-notice-icon" aria-hidden="true" />
        <p>{t('review.ai')}</p>
      </div>

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
            <span className="text-[14.5px] leading-relaxed font-medium text-text-strong">
              {t('review.confirm')}
            </span>
          </label>
        </div>
        {formErrors.confirmed && (
          <p
            id="error-confirmed"
            role="alert"
            className="text-ex-error-text m-0 pl-[30px] text-[13px] font-medium"
          >
            {formErrors.confirmed}
          </p>
        )}
      </div>
    </div>
  )
}
