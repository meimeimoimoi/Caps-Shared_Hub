import { Camera, User } from 'lucide-react'
import type { Profile } from '../../types'
import { FormField } from '../FormField'

export interface PersonalInformationProps {
  profile: Profile
  formErrors: Record<string, string>
  avatar: File | null
  avatarPreview: string
  independent: boolean
  onUpdate: (key: keyof Profile, value: string) => void
  onAvatarChange: (file: File | null, preview: string) => void
  onIndependentChange: (val: boolean) => void
  onError: (msg: string) => void
}

const inputCls =
  'w-full px-3 py-2.5 border border-ex-input-border rounded-[5px] bg-white text-ex-ink min-h-11 font-normal caret-ex-accent transition-[border-color,box-shadow] duration-150 ease-in-out focus:border-ex-accent focus:shadow-[0_0_0_3px_var(--color-ex-ring)] motion-reduce:transition-none'
const mutedCls = 'text-[13px] text-ex-muted font-normal'

export function PersonalInformation({
  profile,
  formErrors,
  avatar,
  avatarPreview,
  independent,
  onUpdate,
  onAvatarChange,
  onIndependentChange,
  onError,
}: PersonalInformationProps) {
  const handleUpdate = (key: keyof Profile, value: string) => {
    onUpdate(key, value)
  }

  const renderInput = (key: keyof Profile, required = false, type = 'text') => {
    const errorId = formErrors[key] ? `error-${key}` : undefined
    return (
      <input
        type={type}
        name={key}
        required={required}
        value={profile[key]}
        onChange={(e) => handleUpdate(key, e.target.value)}
        aria-invalid={!!formErrors[key]}
        aria-describedby={errorId}
        className={`${inputCls} ${formErrors[key] ? '!border-ex-error-text focus:shadow-[0_0_0_3px_#d9302533]' : ''}`}
      />
    )
  }

  return (
    <>
      <p>
        Tell us about your professional background. Required fields are marked
        with an asterisk.
      </p>

      {/* ── Profile photo ── */}
      <div className="flex items-center gap-5 mb-7">
        <div className="relative shrink-0">
          {avatarPreview ? (
            <img
              src={avatarPreview}
              alt="Profile preview"
              className="w-20 h-20 rounded-full object-cover border-2 border-ex-border"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-ex-note-bg border-2 border-dashed border-ex-chip-border flex items-center justify-center text-ex-muted">
              <User size={28} />
            </div>
          )}
          <label className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-ex-accent text-white flex items-center justify-center cursor-pointer shadow-md hover:bg-ex-accent-hover transition-colors duration-150 motion-reduce:transition-none">
            <Camera size={14} />
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (!f) return
                if (
                  !/\.(jpe?g|png|webp)$/i.test(f.name) ||
                  f.size > 5 * 1024 * 1024
                ) {
                  onError('Choose a JPG, PNG or WebP image up to 5 MB.')
                  e.target.value = ''
                  return
                }
                onAvatarChange(f, URL.createObjectURL(f))
                onError('')
                e.target.value = ''
              }}
            />
          </label>
        </div>
        <div>
          <p className="!mb-1 font-semibold text-sm">Profile photo</p>
          <p className={`${mutedCls} !mb-0`}>
            {avatar
              ? avatar.name
              : 'JPG, PNG or WebP \u00b7 up to 5 MB (demo)'}
          </p>
          {avatar && (
            <button
              type="button"
              className="text-ex-accent text-[13px] underline underline-offset-2 mt-1 p-0 border-0 bg-transparent cursor-pointer"
              onClick={() => onAvatarChange(null, '')}
            >
              Remove photo
            </button>
          )}
        </div>
      </div>

      {/* ── Personal fields ── */}
      <div className="grid grid-cols-2 gap-x-6 max-md:grid-cols-1">
        <FormField
          label="Full name *"
          error={formErrors.name}
          errorId="error-name"
        >
          {renderInput('name', true)}
        </FormField>
        <FormField
          label="Date of birth"
          error={formErrors.birth}
          errorId="error-birth"
        >
          {renderInput('birth', false, 'date')}
        </FormField>
        <FormField
          label="Current professional title"
          error={formErrors.title}
          errorId="error-title"
        >
          {renderInput('title')}
        </FormField>
        <FormField
          label="City / region"
          error={formErrors.location}
          errorId="error-location"
        >
          {renderInput('location')}
        </FormField>
        <FormField
          label="Email address *"
          error={formErrors.email}
          errorId="error-email"
        >
          {renderInput('email', true, 'email')}
        </FormField>
        <FormField
          label="Phone number"
          error={formErrors.phone}
          errorId="error-phone"
        >
          {renderInput('phone', false, 'tel')}
        </FormField>
      </div>

      {/* ── Independent professional toggle ── */}
      <div
        className={`flex items-start gap-3 p-4 rounded-md mb-6 border transition-colors duration-150 motion-reduce:transition-none ${independent ? 'bg-ex-chip-bg border-ex-accent' : 'bg-ex-note-bg border-transparent'}`}
      >
        <input
          type="checkbox"
          id="independent-toggle"
          checked={independent}
          onChange={(e) => onIndependentChange(e.target.checked)}
        />
        <label htmlFor="independent-toggle" className="cursor-pointer">
          <span className="font-semibold text-sm block">
            I work as an independent professional
          </span>
          <span className={mutedCls}>
            {independent
              ? 'Your profile will show \u201cIndependent professional\u201d instead of an organization.'
              : 'Check this if you are not affiliated with a firm or organization.'}
          </span>
        </label>
      </div>

      {!independent && (
        <FormField
          label="Organization"
          hint="The firm or company you currently represent."
          error={formErrors.company}
          errorId="error-company"
        >
          {renderInput('company')}
        </FormField>
      )}

      <FormField
        label="Short introduction"
        hint="Your public profile can appear once marketplace eligibility requirements are met."
        error={formErrors.bio}
        errorId="error-bio"
      >
        <textarea
          name="bio"
          value={profile.bio}
          maxLength={1000}
          onChange={(e) => handleUpdate('bio', e.target.value)}
          aria-invalid={!!formErrors.bio}
          aria-describedby={formErrors.bio ? 'error-bio' : undefined}
          placeholder="Describe your experience and the clients you support."
          className={`${inputCls} min-h-[110px] resize-y ${formErrors.bio ? '!border-ex-error-text focus:shadow-[0_0_0_3px_#d9302533]' : ''}`}
        />
      </FormField>
    </>
  )
}
