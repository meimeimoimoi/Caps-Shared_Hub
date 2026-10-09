import { formControlClassName as inputCls } from '@/components/ui/form-control'
import { formatVietnamPhone } from '@/lib/validation/vietnamPhone'
import { useRef, type ReactNode } from 'react'
import { Camera, User, UserCircle, Mail, Briefcase, ImagePlus } from 'lucide-react'
import type { Profile } from '../../types'
import { FormField } from '@/components/ui/form-field'
import { DatePicker } from '@/components/ui/date-picker'

export interface PersonalInformationProps {
  heading: ReactNode
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



export function PersonalInformation({
  heading,
  profile,
  formErrors,
  avatar,
  avatarPreview,
  onUpdate,
  onAvatarChange,
  onError,
}: PersonalInformationProps) {
  const photoInputRef = useRef<HTMLInputElement>(null)
  const handleUpdate = (key: keyof Profile, value: string) => {
    onUpdate(key, value)
  }

  const renderInput = (key: keyof Profile, required = false, type = 'text') => {
    const errorId = formErrors[key] ? `error-${key}` : undefined
    return (
      <input
        id={`profile-${key}`}
        type={type}
        name={key}
        autoComplete={
          key === 'name'
            ? 'name'
            : key === 'email'
              ? 'email'
              : key === 'phone'
                ? 'tel'
                : key === 'birth'
                  ? 'bday'
                  : key === 'company'
                    ? 'organization'
                    : key === 'title'
                      ? 'organization-title'
                      : undefined
        }
        placeholder={
          key === 'name'
            ? 'Your full name'
            : key === 'email'
              ? 'you@example.com'
              : key === 'phone'
                ? '+84 912 345 678'
                : key === 'title'
                  ? 'e.g. Tax consultant'
                  : key === 'location'
                    ? 'e.g. Ho Chi Minh City'
                    : key === 'company'
                      ? 'Your firm or organization'
                      : undefined
        }
        onBlur={() => { if (key === 'phone') { onUpdate('phone', formatVietnamPhone(profile.phone)) } }}
        required={required}
        value={key === 'phone' ? formatVietnamPhone(profile.phone) : profile[key]}
        onChange={(e) => handleUpdate(key, e.target.value)}
        aria-invalid={!!formErrors[key]}
        aria-describedby={errorId}
        className={`${inputCls} ${formErrors[key] ? '!border-ex-error-text focus:shadow-[0_0_0_3px_#d9302533]' : ''}`}
      />
    )
  }

  return (
    <div className="expert-personal-form">
      {/* â”€â”€ Hero heading + Profile photo â”€â”€ */}
      <div className="expert-personal-heading">
        <div className="expert-personal-heading-copy">
          {heading}
          <p>
            Tell us about your professional background. Required fields are
            marked with an asterisk.
          </p>
        </div>

        <div className="expert-profile-photo">
          <div className="expert-photo-preview">
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Profile preview"
              />
            ) : (
              <div className="expert-photo-placeholder">
                <User size={32} aria-hidden="true" />
              </div>
            )}
            <input
              ref={photoInputRef}
              aria-label="Upload profile photo"
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
          </div>
          <div className="expert-photo-details">
            <p className="expert-photo-title">Profile photo</p>
            <p
              className="expert-photo-description"
              title={avatar?.name}
            >
              {avatar
                ? avatar.name
                : 'JPG, PNG, WebP \u00b7 max 5 MB'}
            </p>
            <div className="expert-photo-actions">
              <button
                type="button"
                className="expert-photo-upload"
                onClick={() => photoInputRef.current?.click()}
              >
                {avatarPreview
                  ? <><Camera size={14} aria-hidden="true" /> Change photo</>
                  : <><ImagePlus size={14} aria-hidden="true" /> Upload photo</>
                }
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* â”€â”€ Section: Personal details â”€â”€ */}
      <div className="expert-pro-section">
        <div className="expert-pro-section-header">
          <span className="expert-pro-section-icon">
            <UserCircle size={18} aria-hidden="true" />
          </span>
          <h3 className="expert-pro-section-title">Personal details</h3>
          <span className="expert-pro-section-line" aria-hidden="true" />
        </div>
        <div className="expert-personal-grid">
          <FormField
            htmlFor="profile-name"
            label="Full name *"
            error={formErrors.name}
            errorId="error-name"
          >
            {renderInput('name', true)}
          </FormField>
          <FormField htmlFor="profile-birth" label="Date of birth" error={formErrors.birth} errorId="error-birth">
            <DatePicker id="profile-birth" value={profile.birth} onChange={(value) => onUpdate('birth', value)} error={formErrors.birth} />
          </FormField>
        </div>
      </div>

      {/* â”€â”€ Section: Contact information â”€â”€ */}
      <div className="expert-pro-section">
        <div className="expert-pro-section-header">
          <span className="expert-pro-section-icon expert-pro-section-icon--contact">
            <Mail size={18} aria-hidden="true" />
          </span>
          <h3 className="expert-pro-section-title">Contact information</h3>
          <span className="expert-pro-required-badge">Required</span>
          <span className="expert-pro-section-line" aria-hidden="true" />
        </div>
        <div className="expert-personal-grid">
          <FormField
            htmlFor="profile-email"
            label="Email address *"
            error={formErrors.email}
            errorId="error-email"
          >
            {renderInput('email', true, 'email')}
          </FormField>
          <FormField
            htmlFor="profile-phone"
            label="Phone number (Vietnam +84) *"
            error={formErrors.phone}
            errorId="error-phone"
          >
            {renderInput('phone', true, 'tel')}
          </FormField>
        </div>
      </div>

      {/* â”€â”€ Section: Professional profile â”€â”€ */}
      <div className="expert-pro-section">
        <div className="expert-pro-section-header">
          <span className="expert-pro-section-icon expert-pro-section-icon--expertise">
            <Briefcase size={18} aria-hidden="true" />
          </span>
          <h3 className="expert-pro-section-title">Professional profile</h3>
          <span className="expert-pro-section-line" aria-hidden="true" />
        </div>
        <div className="expert-personal-grid">
          <FormField
            htmlFor="profile-title"
            label="Current professional title"
            error={formErrors.title}
            errorId="error-title"
          >
            {renderInput('title')}
          </FormField>
          <FormField
            htmlFor="profile-location"
            label="City / region"
            error={formErrors.location}
            errorId="error-location"
          >
            {renderInput('location')}
          </FormField>
        </div>

        <div className="expert-bio-field">
          <FormField
            htmlFor="profile-bio"
            label="Short introduction"
            help="May appear publicly once marketplace eligibility requirements are met."
            error={formErrors.bio}
            errorId="error-bio"
          >
            <textarea
              id="profile-bio"
              name="bio"
              value={profile.bio}
              maxLength={1000}
              onChange={(e) => handleUpdate('bio', e.target.value)}
              aria-invalid={!!formErrors.bio}
              aria-describedby={`profile-bio-hint profile-bio-count${formErrors.bio ? ' error-bio' : ''}`}
              placeholder="Share your experience and who you help."
              rows={4}
              className={`${inputCls} min-h-[110px] resize-y ${formErrors.bio ? '!border-ex-error-text focus:shadow-[0_0_0_3px_#d9302533]' : ''}`}
            />
          </FormField>
          <div className="expert-bio-footer">
            <p id="profile-bio-hint" className="expert-bio-hint">
              May appear publicly once marketplace eligibility requirements are met.
            </p>
            <p id="profile-bio-count" className="expert-bio-count" aria-live="off">
              {profile.bio.length.toLocaleString('en-US')} / 1,000 characters
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
