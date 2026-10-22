import { useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Camera,
  ChevronDown,
  ImagePlus,
  TriangleAlert,
  User,
} from 'lucide-react'
import { formControlClassName as inputCls } from '@/components/ui/forms/form-control'
import { FormField } from '@/components/ui/forms/form-field'
import { HelpTip } from '@/components/ui/feedback/help-tip'
import { DatePicker } from '@/components/ui/forms/date-picker'
import { Combobox } from '@/components/ui/forms/combobox'
import { useFormatters } from '@/hooks/useFormatters'
import { formatVietnamPhone } from '@/lib/validation/vietnamPhone'
import { PhoneAccountNotice } from '@/features/auth/components/PhoneAccountNotice'
import { provinces } from '../../constants'
import type { EvidenceFile, Profile, UploadQuota } from '../../types'
import type { RegistrationMessage } from '../../types/messages'
import { FileUploader } from '../FileUploader'
import { ExpertiseSelect } from '../ExpertiseSelect'

export interface ExpertProfileStepProps {
  heading: ReactNode
  profile: Profile
  fields: string[]
  cvFiles: EvidenceFile[]
  uploadQuota?: UploadQuota
  formErrors: Record<string, string>
  avatar: File | null
  avatarPreview: string
  onUpdate: (key: keyof Profile, value: string) => void
  onToggleField: (field: string) => void
  onCvFilesSelected: (files: FileList | null) => void
  onRemoveCvFile: (index: number) => void
  onAddCvLink?: (url: string) => Promise<boolean>
  onAvatarChange: (file: File | null, preview: string) => void
  onError: (msg: RegistrationMessage | null) => void
}

const ERROR_CLS = '!border-ex-error-text focus:ring-danger/20 focus:ring-2'

/* The whole expert profile in one step: the five items checked on submit first (name, phone, years,
 * fields, CV), then the optional details folded away so the page stays short. */
export function ExpertProfileStep({
  heading,
  profile,
  fields,
  cvFiles,
  uploadQuota,
  formErrors,
  avatar,
  avatarPreview,
  onUpdate,
  onToggleField,
  onCvFilesSelected,
  onRemoveCvFile,
  onAddCvLink,
  onAvatarChange,
  onError,
}: ExpertProfileStepProps) {
  const { t } = useTranslation('expertRegistration')
  const format = useFormatters()
  const photoInputRef = useRef<HTMLInputElement>(null)
  // Optional details start open once any of them holds data, so nothing filled in is hidden
  const [moreOpen] = useState(
    () =>
      !!avatarPreview ||
      [
        profile.birth,
        profile.title,
        profile.location,
        profile.bio,
        profile.highlights,
      ].some((v) => v.trim() !== '')
  )
  const fieldError = (key: string) => (formErrors[key] ? ERROR_CLS : '')

  return (
    <div className="expert-personal-form expert-profile-step">
      <div className="expert-personal-heading">
        {heading}
        <p>{t('personal.guidance')}</p>
      </div>

      {/* ── Required: what the server checks before submitting ── */}
      <div className="expert-pro-section">
        <div className="expert-personal-grid">
          <FormField
            htmlFor="profile-name"
            label={t('fields.fullNameRequired')}
            error={formErrors.name}
            errorId="error-name"
          >
            <input
              id="profile-name"
              name="name"
              required
              autoComplete="name"
              placeholder={t('fields.namePlaceholder')}
              value={profile.name}
              onChange={(e) => onUpdate('name', e.target.value)}
              aria-invalid={!!formErrors.name}
              aria-describedby={formErrors.name ? 'error-name' : undefined}
              className={`${inputCls} ${fieldError('name')}`}
            />
          </FormField>
          <FormField
            htmlFor="profile-phone"
            label={t('fields.phoneVietnam')}
            error={formErrors.phone}
            errorId="error-phone"
          >
            <div className="expert-profile-phone">
              <svg
                viewBox="0 0 30 20"
                width="21"
                height="14"
                role="img"
                aria-label={t('fields.vietnam')}
              >
                <rect width="30" height="20" fill="#da251d" />
                <path
                  d="M15 3 16.6 7.8H21.7L17.6 10.8 19.2 15.7 15 12.7 10.8 15.7 12.4 10.8 8.3 7.8H13.4Z"
                  fill="#ffff00"
                />
              </svg>
              <input
                id="profile-phone"
                name="phone"
                type="tel"
                required
                autoComplete="tel"
                placeholder={t('fields.phonePlaceholder')}
                value={formatVietnamPhone(profile.phone)}
                onChange={(e) => onUpdate('phone', e.target.value)}
                onBlur={() =>
                  onUpdate('phone', formatVietnamPhone(profile.phone))
                }
                aria-invalid={!!formErrors.phone}
                aria-describedby={formErrors.phone ? 'error-phone' : undefined}
                className={`${inputCls} ${fieldError('phone')}`}
              />
            </div>
            <PhoneAccountNotice
              phone={profile.phone}
              className="expert-phone-note text-ex-muted flex items-start gap-2 text-[12.5px] leading-[1.5]"
            />
          </FormField>
        </div>

        <div className="expert-personal-grid">
          <FormField
            label={t('experience.taxYears')}
            help={t('experience.yearsHelp')}
            htmlFor="experience-years"
            error={formErrors.years}
            errorId="error-years"
          >
            <div className="expert-years-control relative w-full">
              <input
                id="experience-years"
                name="years"
                required
                type="number"
                min="0"
                max="80"
                step="1"
                placeholder="5"
                inputMode="numeric"
                value={profile.years}
                onChange={(e) => onUpdate('years', e.target.value)}
                aria-invalid={!!formErrors.years}
                aria-describedby={formErrors.years ? 'error-years' : undefined}
                className={`${inputCls} [appearance:textfield] !pr-14 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${fieldError('years')}`}
              />
              <span
                aria-hidden="true"
                className="text-ex-muted pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[14px]"
              >
                {t('experience.yearsUnit')}
              </span>
            </div>
          </FormField>
          <FormField
            htmlFor="validation-expertise"
            label={t('experience.expertiseRequired')}
            help={t('experience.expertiseNote')}
            error={formErrors.expertise}
            errorId="error-expertise"
          >
            <ExpertiseSelect
              id="validation-expertise"
              value={fields}
              onToggle={onToggleField}
              invalid={!!formErrors.expertise}
              describedBy={formErrors.expertise ? 'error-expertise' : undefined}
            />
          </FormField>
        </div>

        {profile.years !== '' && Number(profile.years) < 5 && (
          <div className="expert-pro-notice expert-pro-notice--warn">
            <TriangleAlert
              size={16}
              aria-hidden="true"
              className="expert-pro-notice-icon"
            />
            <p>{t('experience.minimum')}</p>
          </div>
        )}

        <div className="mt-2">
          <div className="mb-2 flex items-center gap-1.5">
            <span className="text-ex-ink text-[14px] font-semibold">
              {t('experience.cvRequired')}
            </span>
            <HelpTip label={t('helpFor', { label: t('experience.cv') })}>
              {t('experience.cvHelp')}
            </HelpTip>
          </div>
          <FileUploader
            id="CV"
            error={formErrors.CV}
            files={cvFiles}
            quota={uploadQuota}
            onFilesSelected={onCvFilesSelected}
            onRemoveFile={onRemoveCvFile}
            onAddLink={onAddCvLink}
          />
        </div>
      </div>

      {/* ── Optional details, folded away until needed ── */}
      <details
        className="group motion-details expert-pro-section"
        open={moreOpen}
      >
        <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-md py-1 [text-decoration:none] [&::-webkit-details-marker]:hidden">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className="!text-ex-ink text-[15px] font-semibold no-underline">
              {t('profileStep.moreTitle')}
            </span>
            <span className="!text-ex-muted text-[13px] font-normal no-underline">
              {t('profileStep.moreHint')}
            </span>
          </span>
          <ChevronDown
            size={18}
            aria-hidden="true"
            className="text-ex-muted shrink-0 transition-transform group-open:rotate-180"
          />
        </summary>

        <div className="pt-4">
          <div className="expert-profile-photo mb-6 flex items-center gap-5">
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

          <div className="grid gap-x-5 md:grid-cols-3">
            <FormField
              htmlFor="profile-birth"
              label={t('fields.birth')}
              help={t('fields.birthHelp')}
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
                onChange={(value) => onUpdate('location', value)}
                options={provinces}
                placeholder={t('fields.regionPlaceholder')}
                aria-invalid={!!formErrors.location}
                aria-describedby={
                  formErrors.location ? 'error-location' : undefined
                }
                className={`${inputCls} ${fieldError('location')}`}
              />
            </FormField>
            <FormField
              htmlFor="profile-title"
              label={t('fields.professionalTitle')}
              error={formErrors.title}
              errorId="error-title"
            >
              <input
                id="profile-title"
                name="title"
                autoComplete="organization-title"
                placeholder={t('fields.titlePlaceholder')}
                value={profile.title}
                onChange={(e) => onUpdate('title', e.target.value)}
                className={`${inputCls} ${fieldError('title')}`}
              />
            </FormField>
          </div>

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
              onChange={(e) => onUpdate('bio', e.target.value)}
              aria-describedby="profile-bio-count"
              placeholder={t('fields.bioPlaceholder')}
              rows={3}
              className={`${inputCls} min-h-[90px] resize-y ${fieldError('bio')}`}
            />
          </FormField>
          <p
            id="profile-bio-count"
            className="expert-bio-count !-mt-2 !mb-3"
            aria-live="off"
          >
            {t('counts.characters', {
              length: format.number(profile.bio.length),
              maximum: format.number(1000),
            })}
          </p>

          <FormField
            label={t('experience.highlights')}
            htmlFor="experience-highlights"
            error={formErrors.highlights}
            errorId="error-highlights"
          >
            <textarea
              id="experience-highlights"
              name="highlights"
              value={profile.highlights}
              onChange={(e) => onUpdate('highlights', e.target.value)}
              placeholder={t('experience.placeholder')}
              rows={3}
              className={`${inputCls} min-h-[90px] resize-y ${fieldError('highlights')}`}
            />
          </FormField>
        </div>
      </details>
    </div>
  )
}

export default ExpertProfileStep
