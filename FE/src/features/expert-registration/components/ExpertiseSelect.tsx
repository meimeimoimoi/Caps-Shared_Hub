import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, ChevronDown } from 'lucide-react'
import { formControlClassName as inputCls } from '@/components/ui/forms/form-control'
import { expertiseKey, expertiseOptions } from '../constants'

export interface ExpertiseSelectProps {
  id: string
  /** Selected options (English labels, as the form keeps them) */
  value: string[]
  onToggle: (field: string) => void
  invalid?: boolean
  describedBy?: string
}

/* Multi-select dropdown for areas of expertise: a compact trigger listing the choices, and a panel of
 * checkboxes that stays open while picking several. Closes on Escape or a click outside. */
export function ExpertiseSelect({
  id,
  value,
  onToggle,
  invalid = false,
  describedBy,
}: ExpertiseSelectProps) {
  const { t } = useTranslation('expertRegistration')
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const listId = useId()

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      trigger.current?.focus()
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const label = (f: string) => t(expertiseKey(f)!)
  const summary =
    value.length === 0
      ? t('experience.expertisePlaceholder')
      : value.map(label).join(', ')

  return (
    <div ref={root} className="relative">
      <button
        ref={trigger}
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={listId}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onClick={() => setOpen((o) => !o)}
        className={`${inputCls} expert-select-trigger flex items-center justify-between gap-2 text-left ${invalid ? '!border-ex-error-text focus:ring-danger/20 focus:ring-2' : ''}`}
      >
        <span className={`min-w-0 truncate ${value.length === 0 ? 'text-ex-muted' : ''}`}>
          {summary}
        </span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div
          id={listId}
          role="dialog"
          aria-label={t('experience.expertise')}
          className="border-ex-border-light bg-ex-panel absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border p-1 shadow-lg"
        >
          {expertiseOptions.map((f) => {
            const selected = value.includes(f)
            return (
                <label key={f} className="hover:bg-ex-chip-bg focus-within:bg-ex-chip-bg flex min-h-11 cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-[14px]">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => onToggle(f)}
                    className="sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className={`grid size-4 shrink-0 place-items-center rounded border ${selected ? 'border-ex-accent bg-ex-accent text-on-accent' : 'border-ex-border'}`}
                  >
                    {selected && <Check size={12} strokeWidth={3.5} />}
                  </span>
                  {label(f)}
                </label>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ExpertiseSelect
