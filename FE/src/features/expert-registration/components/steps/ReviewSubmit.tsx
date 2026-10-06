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
      <p className="expert-pro-subtitle flex flex-wrap items-center justify-between gap-4">
        <span>{t('review.guidance')}</span>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[#d5d2c8] bg-white px-4 text-[13px] font-semibold text-[#a34524] transition-all duration-200 hover:border-[#a3452466] hover:bg-[#fdf8f5] hover:shadow-[0_2px_8px_-2px_#a345241a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a34524]"
        >
          <Edit2 size={14} />
          {t('actions.edit')}
        </button>
      </p>

      <RegistrationSummary
        profile={profile}
        avatarPreview={avatarPreview}
        independent={independent}
        fields={fields}
        files={files}
      />

      {/* ── AI Notice ── */}
      <div className="expert-pro-notice expert-pro-notice--warn mt-0 mb-6">
        <Info className="expert-pro-notice-icon" aria-hidden="true" />
        <p>{t('review.ai')}</p>
      </div>

      {/* ── Confirmation Checkbox ── */}
      <div className="expert-personal-form">
        <div className="expert-independent-row !mb-2">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              name="confirmed"
              type="checkbox"
              checked={confirmed}
              onChange={(e) => onConfirmedChange(e.target.checked)}
              aria-invalid={!!formErrors.confirmed}
              aria-describedby={
                formErrors.confirmed ? 'error-confirmed' : undefined
              }
              required
            />
            <span className="text-[14.5px] leading-relaxed font-medium text-[#263c36]">
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
