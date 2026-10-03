import type { ReactNode } from 'react'
import { CircleAlert } from 'lucide-react'

export interface FormFieldProps {
  label: string
  children: ReactNode
  hint?: string
  error?: string
  errorId?: string
  htmlFor?: string
}

export function FormField({
  label,
  children,
  hint,
  error,
  errorId,
  htmlFor,
}: FormFieldProps) {
  return (
    <div className="expert-form-field flex flex-col gap-[7px] mb-[22px]">
      <label htmlFor={htmlFor} className="font-semibold text-sm flex flex-col gap-[7px]">
        <span>{label}</span>
        {!htmlFor && children}
      </label>
      {htmlFor && children}
      {hint && !error && <small className="text-[13px] text-ex-muted font-normal">{hint}</small>}
      {error && (
        <p id={errorId} role="alert" className="expert-field-error text-[13px] text-ex-error-text font-normal m-0">
          <CircleAlert size={15} aria-hidden="true" /><span>{error}</span>
        </p>
      )}
    </div>
  )
}
