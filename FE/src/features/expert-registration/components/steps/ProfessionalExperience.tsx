import { useTranslation } from 'react-i18next'
import { formControlClassName as inputCls } from '@/components/ui/forms/form-control'
import { Check, CircleAlert, TriangleAlert } from 'lucide-react'
import type { EvidenceFile, Profile, UploadQuota } from '../../types'
import { FormField } from '@/components/ui/forms/form-field'
import { HelpTip } from '@/components/ui/feedback/help-tip'
import { FileUploader } from '../FileUploader'
import { expertiseOptions, expertiseKey } from '../../constants'

export interface ProfessionalExperienceProps {
  profile: Profile
  fields: string[]
  cvFiles: EvidenceFile[]
  uploadQuota?: UploadQuota
  formErrors: Record<string, string>
  onUpdate: (key: keyof Profile, value: string) => void
  onToggleField: (field: string) => void
  onCvFilesSelected: (files: FileList | null) => void
  onRemoveCvFile: (index: number) => void
}

export function ProfessionalExperience({
  profile,
  fields,
  cvFiles,
  uploadQuota,
  formErrors,
  onUpdate,
  onToggleField,
  onCvFilesSelected,
  onRemoveCvFile,
}: ProfessionalExperienceProps) {
  const { t } = useTranslation('expertRegistration')

  const EXPERTISE_OPTIONS = expertiseOptions

  return (
    <div className="expert-pro-experience">
      <p className="expert-pro-subtitle">{t('experience.guidance')}</p>

      {/* ── Section: Experience overview ── */}
      <div className="expert-pro-section">
        <div className="expert-pro-section-header">
          <h3 className="expert-pro-section-title">
            {t('experience.overview')}
          </h3>
        </div>

        <div className="expert-pro-experience-grid">
          <FormField
            label={t('experience.taxYears')}
            help={t('experience.yearsHelp')}
            htmlFor="experience-years"
            className="expert-years-field"
            error={formErrors.years}
            errorId="error-years"
          >
            <div className="expert-years-input">
              <input
                id="experience-years"
                name="years"
                required
                type="number"
                min="0"
                max="80"
                step="1"
                value={profile.years}
                onChange={(e) => onUpdate('years', e.target.value)}
                aria-invalid={!!formErrors.years}
                aria-describedby={formErrors.years ? 'error-years' : undefined}
                className={`${inputCls} ${formErrors.years ? '!border-ex-error-text focus:ring-danger/20 focus:ring-2' : ''}`}
              />
              <span aria-hidden="true">{t('experience.yearsUnit')}</span>
            </div>
          </FormField>
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
              aria-invalid={!!formErrors.highlights}
              aria-describedby={
                formErrors.highlights ? 'error-highlights' : undefined
              }
              placeholder={t('experience.placeholder')}
              rows={4}
              className={`${inputCls} min-h-[110px] resize-y ${formErrors.highlights ? '!border-ex-error-text focus:ring-danger/20 focus:ring-2' : ''}`}
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
      </div>

      {/* ── Section: Areas of expertise ── */}
      <div className="expert-pro-section">
        <div className="expert-pro-section-header">
          <h3 className="expert-pro-section-title">
            {t('experience.expertiseRequired')}
          </h3>
          <HelpTip label={t('helpFor', { label: t('experience.expertise') })}>
            {t('experience.expertiseNote')}
          </HelpTip>
        </div>

        <fieldset
          id="validation-expertise"
          className={`expert-pro-expertise-fieldset ${formErrors.expertise ? 'expert-pro-expertise-fieldset--invalid' : ''}`}
          aria-invalid={!!formErrors.expertise}
          aria-describedby={
            formErrors.expertise ? 'error-expertise' : undefined
          }
        >
          <legend className="sr-only">
            {t('experience.expertiseRequired')}
          </legend>
          <div className="expert-pro-chip-grid">
            {EXPERTISE_OPTIONS.map((f) => (
              <label
                key={f}
                className={`expert-pro-chip ${fields.includes(f) ? 'expert-pro-chip--selected' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={fields.includes(f)}
                  onChange={() => onToggleField(f)}
                  className="sr-only"
                />
                <span className="expert-pro-chip-check" aria-hidden="true">
                  <Check strokeWidth={3.5} />
                </span>
                <span className="expert-pro-chip-text">
                  {t(expertiseKey(f)!)}
                </span>
              </label>
            ))}
          </div>
          {formErrors.expertise && (
            <p
              className="expert-validation-message"
              id="error-expertise"
              role="alert"
            >
              <CircleAlert size={16} aria-hidden="true" />
              {formErrors.expertise}
            </p>
          )}
        </fieldset>
      </div>

      {/* ── Section: Curriculum vitae ── */}
      <div className="expert-pro-section">
        <div className="expert-pro-section-header">
          <h3 className="expert-pro-section-title">
            {t('experience.cvRequired')}
          </h3>
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
        />
      </div>
    </div>
  )
}
