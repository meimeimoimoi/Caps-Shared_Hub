import { useTranslation } from 'react-i18next'
import { formControlClassName as inputCls } from '@/components/ui/forms/form-control'
import {
  Briefcase,
  Award,
  FileText as FileIcon,
  Sparkles,
  CircleAlert,
} from 'lucide-react'
import type { Profile } from '../../types'
import { FormField } from '@/components/ui/forms/form-field'
import { FileUploader } from '../FileUploader'
import { expertiseOptions, expertiseKey } from '../../constants'

export interface ProfessionalExperienceProps {
  profile: Profile
  fields: string[]
  cvFiles: File[]
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
  formErrors,
  onUpdate,
  onToggleField,
  onCvFilesSelected,
  onRemoveCvFile,
}: ProfessionalExperienceProps) {
  const { t } = useTranslation('expertRegistration')

  const EXPERTISE_OPTIONS = expertiseOptions

  const issues = Object.entries(formErrors).filter(([, message]) => !!message)
  const labels: Record<string, string> = {
    years: t('experience.years'),
    highlights: t('experience.highlights'),
    expertise: t('experience.expertise'),
    CV: t('experience.cv'),
  }
  function focusField(key: string) {
    const container = document.getElementById(`validation-${key}`)
    const target =
      container instanceof HTMLInputElement
        ? container
        : (container?.querySelector<HTMLInputElement>('input') ??
          document.querySelector<HTMLInputElement>(`[name="${key}"]`))
    target?.focus({ preventScroll: true })
    ;(container ?? target)?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
      block: 'center',
    })
  }

  return (
    <div className="expert-pro-experience">
      <p className="expert-pro-subtitle">{t('experience.guidance')}</p>

      {/* ── Section: Experience overview ── */}
      {issues.length > 0 && (
        <div
          className="expert-validation-summary"
          aria-label={t('experience.issues')}
        >
          <CircleAlert size={21} aria-hidden="true" />
          <div>
            <h3>
              {issues.length === 1
                ? t('experience.issue')
                : `${issues.length} details to complete`}
            </h3>
            <p>{t('experience.fix')}</p>
            <ul>
              {issues.map(([key, message]) => (
                <li key={key}>
                  <button type="button" onClick={() => focusField(key)}>
                    <strong>{labels[key] ?? key}</strong>
                    <span>{message}</span>
                    <span aria-hidden="true">&rarr;</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      <div className="expert-pro-section">
        <div className="expert-pro-section-header">
          <span className="expert-pro-section-icon">
            <Briefcase size={18} aria-hidden="true" />
          </span>
          <h3 className="expert-pro-section-title">
            {t('experience.overview')}
          </h3>
          <span className="expert-pro-section-line" aria-hidden="true" />
        </div>

        <div className="expert-pro-experience-grid">
          <FormField
            label={t('experience.taxYears')}
            htmlFor="experience-years"
            className="expert-years-field"
            error={formErrors.years}
            errorId="error-years"
          >
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
              className={`${inputCls} ${formErrors.years ? '!border-ex-error-text focus:ring-2 focus:ring-danger/20' : ''}`}
            />
          </FormField>
          <FormField
            label={t('experience.highlights')}
            error={formErrors.highlights}
            errorId="error-highlights"
          >
            <textarea
              name="highlights"
              value={profile.highlights}
              onChange={(e) => onUpdate('highlights', e.target.value)}
              aria-invalid={!!formErrors.highlights}
              aria-describedby={
                formErrors.highlights ? 'error-highlights' : undefined
              }
              placeholder={t('experience.placeholder')}
              rows={4}
              className={`${inputCls} min-h-[110px] resize-y ${formErrors.highlights ? '!border-ex-error-text focus:ring-2 focus:ring-danger/20' : ''}`}
            />
          </FormField>
        </div>

        {profile.years !== '' && Number(profile.years) < 5 && (
          <div className="expert-pro-notice expert-pro-notice--warn">
            <span className="expert-pro-notice-icon">⚠</span>
            <p>{t('experience.minimum')}</p>
          </div>
        )}
      </div>

      {/* ── Section: Areas of expertise ── */}
      <div className="expert-pro-section">
        <div className="expert-pro-section-header">
          <span className="expert-pro-section-icon expert-pro-section-icon--expertise">
            <Award size={18} aria-hidden="true" />
          </span>
          <h3 className="expert-pro-section-title">
            {t('experience.expertise')}
          </h3>
          <span className="expert-pro-required-badge">
            {t('experience.required')}
          </span>
          <span className="expert-pro-section-line" aria-hidden="true" />
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
                  className="expert-custom-checkbox"
                />
                <span className="expert-pro-chip-text">{t(expertiseKey(f)!)}</span>
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
          <p className="expert-pro-chip-hint">
            <Sparkles size={13} aria-hidden="true" />
            {t('experience.expertiseNote')}
          </p>
        </fieldset>
      </div>

      {/* ── Section: Curriculum vitae ── */}
      <div className="expert-pro-section">
        <div className="expert-pro-section-header">
          <span className="expert-pro-section-icon expert-pro-section-icon--cv">
            <FileIcon size={18} aria-hidden="true" />
          </span>
          <h3 className="expert-pro-section-title">{t('experience.cv')}</h3>
          <span className="expert-pro-required-badge">
            {t('experience.required')}
          </span>
          <span className="expert-pro-section-line" aria-hidden="true" />
        </div>
        <FileUploader
          id="CV"
          error={formErrors.CV}
          files={cvFiles}
          onFilesSelected={onCvFilesSelected}
          onRemoveFile={onRemoveCvFile}
        />
      </div>
    </div>
  )
}
