import type { ReactNode } from 'react'

export interface FormFieldProps {
  label: string
  children: ReactNode
  hint?: string
  error?: string
  errorId?: string
}

export function FormField({
  label,
  children,
  hint,
  error,
  errorId,
}: FormFieldProps) {
  return (
    <div className="flex flex-col gap-[7px] mb-[22px]">
      <label className="font-semibold text-sm flex flex-col gap-[7px]">
        <span>{label}</span>
        {children}
      </label>
      {hint && !error && <small className="text-[13px] text-ex-muted font-normal">{hint}</small>}
      {error && (
        <p id={errorId} role="alert" className="text-[13px] text-ex-error-text font-normal m-0">
          {error}
        </p>
      )}
    </div>
  )
}
