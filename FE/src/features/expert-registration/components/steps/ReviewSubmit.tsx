import { Info, Edit2 } from 'lucide-react'
import type { Profile } from '../../model/types'
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
  return (
    <div className="expert-pro-review">
      <p className="expert-pro-subtitle flex items-center justify-between gap-4 flex-wrap">
        <span>Review your information carefully before submitting your formal application.</span>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-2 min-h-10 px-4 rounded-md bg-white border border-[#d5d2c8] text-[#a34524] text-[13px] font-semibold transition-all duration-200 hover:bg-[#fdf8f5] hover:border-[#a3452466] hover:shadow-[0_2px_8px_-2px_#a345241a] focus-visible:outline-2 focus-visible:outline-[#a34524] focus-visible:outline-offset-2"
        >
          <Edit2 size={14} />
          Edit application
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
        <p>
          AI supports screening. Authorized reviewers assess eligibility and
          service competency. A System Admin performs final approval.
        </p>
      </div>

      {/* ── Confirmation Checkbox ── */}
      <div className="expert-personal-form">
        <div className="expert-independent-row !mb-2">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              name="confirmed"
              type="checkbox"
              checked={confirmed}
              onChange={(e) => onConfirmedChange(e.target.checked)}
              aria-invalid={!!formErrors.confirmed}
              aria-describedby={formErrors.confirmed ? 'error-confirmed' : undefined}
              required
            />
            <span className="text-[14.5px] font-medium text-[#263c36] leading-relaxed">
              I certify that the information provided in this application is accurate and complete.
            </span>
          </label>
        </div>
        {formErrors.confirmed && (
          <p
            id="error-confirmed"
            role="alert"
            className="text-[13px] text-ex-error-text font-medium m-0 pl-[30px]"
          >
            {formErrors.confirmed}
          </p>
        )}
      </div>
    </div>
  )
}
