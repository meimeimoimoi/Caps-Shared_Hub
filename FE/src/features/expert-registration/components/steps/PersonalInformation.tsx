import { useTranslation } from 'react-i18next'
import { formControlClassName as inputCls } from '@/components/ui/forms/form-control'
import { formatVietnamPhone } from '@/lib/validation/vietnamPhone'
import { useRef, type ReactNode } from 'react'
import {
  Camera,
  User,
  UserCircle,
  Mail,
  Briefcase,
  ImagePlus,
} from 'lucide-react'
import type { Profile } from '../../types'
import { FormField } from '@/components/ui/forms/form-field'
import { DatePicker } from '@/components/ui/forms/date-picker'
import { Combobox } from '@/components/ui/forms/combobox'
import { provinces } from '../../constants'
import type { RegistrationMessage } from '../../types/messages'
import { useFormatters } from '@/hooks/useFormatters'

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
  onError: (msg: RegistrationMessage | null) => void
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
  const { t } = useTranslation('expertRegistration')
  const format = useFormatters()

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
            ? t('fields.namePlaceholder')
            : key === 'email'
              ? 'you@example.com'
              : key === 'phone'
                ? '+84 912 345 678'
                : key === 'title'
                  ? t('fields.titlePlaceholder')
                  : key === 'location'
                    ? t('fields.regionPlaceholder')
                    : key === 'company'
                      ? t('fields.companyPlaceholder')
                      : undefined
        }
        onBlur={() => {
          if (key === 'phone') {
            onUpdate('phone', formatVietnamPhone(profile.phone))
          }
        }}
        required={required}
        value={
          key === 'phone' ? formatVietnamPhone(profile.phone) : profile[key]
        }
        onChange={(e) => handleUpdate(key, e.target.value)}
        aria-invalid={!!formErrors[key]}
        aria-describedby={errorId}
        className={`${inputCls} ${formErrors[key] ? '!border-ex-error-text focus:ring-2 focus:ring-danger/20' : ''}`}
      />
    )
  }

  return (
    <div className="expert-personal-form">
      {/* â”€â”€ Hero heading + Profile photo â”€â”€ */}
      <div className="expert-personal-heading">
        <div className="expert-personal-heading-copy">
          {heading}
          <p>{t('personal.guidance')}</p>
        </div>

        <div className="expert-profile-photo">
          <div className="expert-photo-preview">
            {avatarPreview ? (
              <img src={avatarPreview} alt={t('personal.preview')} />
            ) : (
              <div className="expert-photo-placeholder">
                <User size={32} aria-hidden="true" />
              </div>
            )}
            <input
              ref={photoInputRef}
              aria-label={t('personal.uploadLabel')}
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
                  onError({ key: 'personal.photoError' })
                  e.target.value = ''
                  return
                }
                onAvatarChange(f, URL.createObjectURL(f))
                onError(null)
                e.target.value = ''
              }}
            />
          </div>
          <div className="expert-photo-details">
            <p className="expert-photo-title">{t('personal.photo')}</p>
            <p className="expert-photo-description" title={avatar?.name}>
              {avatar ? avatar.name : t('personal.photoFormats')}
            </p>
            <div className="expert-photo-actions">
              <button
                type="button"
                className="expert-photo-upload"
                onClick={() => photoInputRef.current?.click()}
              >
                {avatarPreview ? (
                  <>
                    <Camera size={14} aria-hidden="true" />
                    {t('personal.change')}
                  </>
                ) : (
                  <>
                    <ImagePlus size={14} aria-hidden="true" />
                    {t('personal.upload')}
                  </>
                )}
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
          <h3 className="expert-pro-section-title">{t('personal.details')}</h3>
          <span className="expert-pro-section-line" aria-hidden="true" />
        </div>
        <div className="expert-personal-grid">
          <FormField
            htmlFor="profile-name"
            label={t('fields.fullNameRequired')}
            error={formErrors.name}
            errorId="error-name"
          >
            {renderInput('name', true)}
          </FormField>
          <FormField
            htmlFor="profile-birth"
            label={t('fields.birth')}
            error={formErrors.birth}
            errorId="error-birth"
          >
            <DatePicker
              id="profile-birth"
              value={profile.birth}
              onChange={(value) => onUpdate('birth', value)}
              error={formErrors.birth}
            />
          </FormField>
        </div>
      </div>

      {/* â”€â”€ Section: Contact information â”€â”€ */}
      <div className="expert-pro-section">
        <div className="expert-pro-section-header">
          <span className="expert-pro-section-icon expert-pro-section-icon--contact">
            <Mail size={18} aria-hidden="true" />
          </span>
          <h3 className="expert-pro-section-title">{t('personal.contact')}</h3>
          <span className="expert-pro-required-badge">
            {t('experience.required')}
          </span>
          <span className="expert-pro-section-line" aria-hidden="true" />
        </div>
        <div className="expert-personal-grid">
          <FormField
            htmlFor="profile-email"
            label={t('fields.emailRequired')}
            error={formErrors.email}
            errorId="error-email"
          >
            {renderInput('email', true, 'email')}
          </FormField>
          <FormField
            htmlFor="profile-phone"
            label={t('fields.phoneVietnam')}
            error={formErrors.phone}
            errorId="error-phone"
          >
            <div className="expert-profile-phone">
              <svg viewBox="0 0 30 20" width="21" height="14" role="img" aria-label={t('fields.vietnam')}>
                <rect width="30" height="20" fill="#da251d" />
                <path d="M15 3 16.6 7.8H21.7L17.6 10.8 19.2 15.7 15 12.7 10.8 15.7 12.4 10.8 8.3 7.8H13.4Z" fill="#ffff00" />
              </svg>
              {renderInput('phone', true, 'tel')}
            </div>
          </FormField>
        </div>
      </div>

      {/* â”€â”€ Section: Professional profile â”€â”€ */}
      <div className="expert-pro-section">
        <div className="expert-pro-section-header">
          <span className="expert-pro-section-icon expert-pro-section-icon--expertise">
            <Briefcase size={18} aria-hidden="true" />
          </span>
          <h3 className="expert-pro-section-title">
            {t('personal.professional')}
          </h3>
          <span className="expert-pro-section-line" aria-hidden="true" />
        </div>
        <div className="expert-personal-grid">
          <FormField
            htmlFor="profile-title"
            label={t('fields.professionalTitle')}
            error={formErrors.title}
            errorId="error-title"
          >
            {renderInput('title')}
          </FormField>
          <FormField
            htmlFor="profile-location"
            label={t('fields.region')}
            error={formErrors.location}
            errorId="error-location"
          >
            <Combobox
              id="profile-location"
              name="location"
              value={profile.location}
              onChange={(value) => handleUpdate('location', value)}
              options={provinces}
              placeholder={t('fields.regionPlaceholder')}
              aria-invalid={!!formErrors.location}
              aria-describedby={
                formErrors.location ? 'error-location' : undefined
              }
              className={`${inputCls} ${formErrors.location ? '!border-ex-error-text focus:ring-2 focus:ring-danger/20' : ''}`}
            />
          </FormField>
        </div>

        <div className="expert-bio-field">
          <FormField
            htmlFor="profile-bio"
            label={t('fields.bio')}
            help={t('fields.bioPublic')}
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
              placeholder={t('fields.bioPlaceholder')}
              rows={4}
              className={`${inputCls} min-h-[110px] resize-y ${formErrors.bio ? '!border-ex-error-text focus:ring-2 focus:ring-danger/20' : ''}`}
            />
          </FormField>
          <div className="expert-bio-footer">
            <p id="profile-bio-hint" className="expert-bio-hint">
              {t('fields.bioPublic')}
            </p>
            <p
              id="profile-bio-count"
              className="expert-bio-count"
              aria-live="off"
            >
              {t('counts.characters', { length: format.number(profile.bio.length), maximum: format.number(1000) })}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
