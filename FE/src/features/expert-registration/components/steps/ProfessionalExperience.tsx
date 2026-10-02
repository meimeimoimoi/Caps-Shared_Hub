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
const mutedCls = 'text-[13px] text-ex-muted font-normal'

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
    'Transfer pricing',
  ]

  return (
    <>
      <p>
        Help reviewers understand your tax and accounting experience.
      </p>
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
      {profile.years !== '' && Number(profile.years) < 5 && (
        <p className="bg-ex-error-bg text-ex-error-text p-[15px] rounded-[5px] animate-expert-fade-in motion-reduce:animate-none">
          The current eligibility policy requires at least 5 years. You can
          prepare this demo draft; an authorized reviewer makes the
          eligibility decision.
        </p>
      )}
      <fieldset>
        <legend>Areas of expertise *</legend>
        <div className="flex flex-wrap gap-2.5">
          {EXPERTISE_OPTIONS.map((f) => (
            <label
              key={f}
              className="border border-ex-chip-border py-[9px] px-3 rounded-md cursor-pointer text-sm flex items-center gap-2 transition-[background,border-color] duration-150 ease-in-out has-[input:checked]:bg-ex-chip-bg has-[input:checked]:border-ex-accent motion-reduce:transition-none"
            >
              <input
                type="checkbox"
                checked={fields.includes(f)}
                onChange={() => onToggleField(f)}
              />
              {f}
            </label>
          ))}
        </div>
        <p className={`${mutedCls} mt-2.5`}>
          These describe your background. They do not grant approval to offer
          a service.
        </p>
      </fieldset>
      <h3>Curriculum vitae *</h3>
      <FileUploader
        id="CV"
        files={cvFiles}
        onFilesSelected={onCvFilesSelected}
        onRemoveFile={onRemoveCvFile}
      />
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
          aria-describedby={formErrors.highlights ? 'error-highlights' : undefined}
          placeholder="Describe relevant responsibilities and experience."
          className={`${inputCls} min-h-[110px] resize-y ${formErrors.highlights ? '!border-ex-error-text focus:shadow-[0_0_0_3px_#d9302533]' : ''}`}
        />
      </FormField>
    </>
  )
}
