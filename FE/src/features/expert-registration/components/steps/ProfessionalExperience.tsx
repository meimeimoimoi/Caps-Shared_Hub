import {
  Briefcase,
  Award,
  FileText as FileIcon,
  Sparkles,
  CircleAlert,
} from 'lucide-react'
import type { Profile } from '../../types'
import { FormField } from '../FormField'
import { FileUploader } from '../FileUploader'

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

const inputCls =
  'w-full px-3 py-2.5 border border-ex-input-border rounded-[5px] bg-white text-ex-ink min-h-11 font-normal caret-ex-accent transition-[border-color,box-shadow] duration-150 ease-in-out focus:border-ex-accent focus:shadow-[0_0_0_3px_var(--color-ex-ring)] motion-reduce:transition-none'

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
  const EXPERTISE_OPTIONS = [
    'Corporate income tax',
    'Tax finalization',
    'Corporate accounting',
    'Financial reporting',
    'Audit',
    'Tax advisory',
  ]

  const issues = Object.entries(formErrors).filter(([, message]) => !!message)
  const labels: Record<string, string> = {
    years: 'Years of experience',
    highlights: 'Experience highlights',
    expertise: 'Areas of expertise',
    CV: 'Curriculum vitae',
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
      <p className="expert-pro-subtitle">
        Help reviewers understand your tax and accounting experience.
      </p>

      {/* ── Section: Experience overview ── */}
      {issues.length > 0 && (
        <div
          className="expert-validation-summary"
          aria-label="Information to complete"
        >
          <CircleAlert size={21} aria-hidden="true" />
          <div>
            <h3>
              {issues.length === 1
                ? 'One detail to complete'
                : `${issues.length} details to complete`}
            </h3>
            <p>
              Your information is still here. Update the following to continue.
            </p>
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
          <h3 className="expert-pro-section-title">Experience overview</h3>
          <span className="expert-pro-section-line" aria-hidden="true" />
        </div>

        <div className="expert-pro-experience-grid">
          <FormField
            label="Years of tax and accounting experience *"
            error={formErrors.years}
            errorId="error-years"
          >
            <input
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
              className={`${inputCls} ${formErrors.years ? '!border-ex-error-text focus:shadow-[0_0_0_3px_#d9302533]' : ''}`}
            />
          </FormField>
          <FormField
            label="Experience highlights"
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
              placeholder="Describe relevant responsibilities and experience."
              rows={4}
              className={`${inputCls} min-h-[110px] resize-y ${formErrors.highlights ? '!border-ex-error-text focus:shadow-[0_0_0_3px_#d9302533]' : ''}`}
            />
          </FormField>
        </div>

        {profile.years !== '' && Number(profile.years) < 5 && (
          <div className="expert-pro-notice expert-pro-notice--warn">
            <span className="expert-pro-notice-icon">⚠</span>
            <p>
              The current eligibility policy requires at least 5 years. You can
              prepare this demo draft; an authorized reviewer makes the
              eligibility decision.
            </p>
          </div>
        )}
      </div>

      {/* ── Section: Areas of expertise ── */}
      <div className="expert-pro-section">
        <div className="expert-pro-section-header">
          <span className="expert-pro-section-icon expert-pro-section-icon--expertise">
            <Award size={18} aria-hidden="true" />
          </span>
          <h3 className="expert-pro-section-title">Areas of expertise</h3>
          <span className="expert-pro-required-badge">Required</span>
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
          <legend className="sr-only">Areas of expertise *</legend>
          <div className="expert-pro-chip-grid">
            {EXPERTISE_OPTIONS.map((f) => (
              <label
                key={f}
                className={`expert-pro-chip ${fields.includes(f) ? 'expert-pro-chip--selected' : ''}`}
              >
                <span className="expert-pro-chip-check" aria-hidden="true">
                  <svg viewBox="0 0 12 10" fill="none">
                    <path
                      d="M1 5.5L4 8.5L11 1.5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <input
                  type="checkbox"
                  checked={fields.includes(f)}
                  onChange={() => onToggleField(f)}
                  className="sr-only"
                />
                <span className="expert-pro-chip-text">{f}</span>
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
            These describe your background. They do not grant approval to offer
            a service.
          </p>
        </fieldset>
      </div>

      {/* ── Section: Curriculum vitae ── */}
      <div className="expert-pro-section">
        <div className="expert-pro-section-header">
          <span className="expert-pro-section-icon expert-pro-section-icon--cv">
            <FileIcon size={18} aria-hidden="true" />
          </span>
          <h3 className="expert-pro-section-title">Curriculum vitae</h3>
          <span className="expert-pro-required-badge">Required</span>
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
