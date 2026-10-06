import { Input } from '@/components/ui/forms/input'
import type { InputValues, SchemaField } from '../types'

const control =
  'mt-2 min-h-11 h-auto w-full rounded-control border border-border-control bg-paper px-3 py-2.5 text-base text-fg shadow-none placeholder:text-fg-muted focus-visible:ring-ink'
export function SchemaForm({
  fields,
  input,
  errors,
  setValue,
  disabled,
}: {
  fields: SchemaField[]
  input: InputValues
  errors: Record<string, string>
  setValue: (id: string, value: string) => void
  disabled: boolean
}) {
  return (
    <fieldset
      disabled={disabled}
      className="min-w-0 space-y-8 disabled:opacity-70"
    >
      {[...new Set(fields.map((field) => field.group))].map((group) => (
        <section key={group}>
          <h2 className="border-border text-h2 mb-5 border-b pb-3">{group}</h2>
          <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
            {fields
              .filter((field) => field.group === group)
              .map((field) => {
                const value = input[field.id] ?? ''
                const helpId = `${field.id}-help`
                const errorId = `${field.id}-error`
                return (
                  <div
                    key={field.id}
                    className={
                      field.type === 'textarea' || field.id === 'agency'
                        ? 'md:col-span-2'
                        : ''
                    }
                  >
                    <label
                      htmlFor={`draft-field-${field.id}`}
                      className="text-fg-strong text-sm font-medium"
                    >
                      {field.label}
                      {field.required && (
                        <span
                          aria-hidden="true"
                          className="text-accent-text ml-1"
                        >
                          *
                        </span>
                      )}
                    </label>
                    {field.type === 'textarea' ? (
                      <textarea
                        id={`draft-field-${field.id}`}
                        className={`${control} min-h-32 resize-y`}
                        value={value}
                        required={field.required}
                        maxLength={field.maxLength}
                        aria-invalid={Boolean(errors[field.id])}
                        aria-describedby={`${helpId}${errors[field.id] ? ` ${errorId}` : ''}`}
                        onChange={(event) =>
                          setValue(field.id, event.target.value)
                        }
                      />
                    ) : (
                      <Input
                        id={`draft-field-${field.id}`}
                        className={`${control} ${field.type === 'money' ? 'font-num tabular-nums' : ''}`}
                        type={field.type === 'date' ? 'date' : 'text'}
                        inputMode={
                          ['money', 'year'].includes(field.type) ||
                          field.id === 'taxCode'
                            ? 'numeric'
                            : undefined
                        }
                        value={
                          field.type === 'money' && /^\d+$/.test(value)
                            ? new Intl.NumberFormat('en-US').format(
                                BigInt(value)
                              )
                            : value
                        }
                        required={field.required}
                        maxLength={field.maxLength}
                        aria-invalid={Boolean(errors[field.id])}
                        aria-describedby={`${helpId}${errors[field.id] ? ` ${errorId}` : ''}`}
                        onChange={(event) =>
                          setValue(
                            field.id,
                            field.type === 'money'
                              ? event.target.value.replace(/[,\s]/g, '')
                              : event.target.value
                          )
                        }
                      />
                    )}
                    <p id={helpId} className="text-caption text-fg-muted mt-2">
                      {field.hint ??
                        (field.required
                          ? 'Required for this template.'
                          : 'Optional for this template.')}
                    </p>
                    {errors[field.id] && (
                      <p
                        id={errorId}
                        role="alert"
                        className="text-danger mt-1 text-sm"
                      >
                        {errors[field.id]}
                      </p>
                    )}
                  </div>
                )
              })}
          </div>
        </section>
      ))}
    </fieldset>
  )
}
