import type { ReactNode } from 'react'
import { CircleAlert } from 'lucide-react'
import { HelpTip } from '@/components/ui/feedback/help-tip'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

export interface FormFieldProps {
  label: string
  children: ReactNode
  className?: string
  help?: ReactNode
  hintId?: string
  hint?: string
  error?: string
  errorId?: string
  htmlFor?: string
}

export function FormField({
  label,
  className,
  help,
  hintId,
  children,
  hint,
  error,
  errorId,
  htmlFor,
}: FormFieldProps) {
  const { t } = useTranslation('common')
  return (
    <div
      className={cn(
        'expert-form-field mb-[22px] flex flex-col gap-[7px]',
        className
      )}
    >
      <div className="flex items-start gap-2">
        <label
          htmlFor={htmlFor}
          className="flex min-w-0 flex-1 flex-col gap-[7px] text-sm font-semibold"
        >
          <span>{label}</span>
          {!htmlFor && children}
        </label>
        {help && (
          <HelpTip
            label={t('form.help', { label: label.replace(/\s*\*$/, '') })}
          >
            {help}
          </HelpTip>
        )}
      </div>
      {htmlFor && children}
      {hint && !error && (
        <small id={hintId} className="text-ex-muted text-[13px] font-normal">
          {hint}
        </small>
      )}
      {error && (
        <p
          id={errorId}
          role="alert"
          className="expert-field-error text-ex-error-text m-0 text-[13px] font-normal"
        >
          <CircleAlert size={15} aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  )
}
