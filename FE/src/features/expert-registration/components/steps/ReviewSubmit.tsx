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

const btnBase =
  'cursor-pointer inline-flex items-center justify-center gap-2 min-h-11 px-[17px] py-[9px] border border-ex-btn-border rounded-md bg-white text-ex-ink font-semibold transition-[background,border-color,opacity] duration-150 ease-in-out hover:bg-ex-btn-hover disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none'
const noteCls =
  'px-[18px] py-4 bg-ex-note-bg rounded-[5px] my-5 text-sm [&>p:last-child]:mb-0'

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
    <>
      <p>
        Review your information before submitting this demo application.
      </p>
      <RegistrationSummary
        profile={profile}
        avatarPreview={avatarPreview}
        independent={independent}
        fields={fields}
        files={files}
      />
      <button type="button" className={btnBase} onClick={onEdit}>
        Edit application
      </button>
      <div className={noteCls}>
        AI supports screening. Authorized reviewers assess eligibility and
        service competency. A System Admin performs final approval.
      </div>
      <div className="flex flex-col gap-1.5 mt-5">
        <label className="flex items-start gap-3">
          <input
            name="confirmed"
            type="checkbox"
            checked={confirmed}
            onChange={(e) => onConfirmedChange(e.target.checked)}
            aria-invalid={!!formErrors.confirmed}
            aria-describedby={formErrors.confirmed ? 'error-confirmed' : undefined}
            required
          />
          I have reviewed the information in this demo application.
        </label>
        {formErrors.confirmed && (
          <p
            id="error-confirmed"
            role="alert"
            className="text-[13px] text-ex-error-text font-normal m-0 pl-[29px]"
          >
            {formErrors.confirmed}
          </p>
        )}
      </div>
    </>
  )
}
