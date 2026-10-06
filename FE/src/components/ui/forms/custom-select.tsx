import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

export interface SelectOption<T extends string = string> {
  value: T
  label: string
}

export interface CustomSelectProps<T extends string = string> {
  value: T | ''
  onChange: (value: T) => void
  options: readonly SelectOption<T>[]
  label: string
  placeholder?: string
  name?: string
  disabled?: boolean
  error?: string
  className?: string
  triggerClassName?: string
  menuClassName?: string
}

/** Controlled single select with keyboard navigation and typeahead. */
export function CustomSelect<T extends string>({
  value,
  onChange,
  options,
  label,
  placeholder,
  name,
  disabled = false,
  error,
  className,
  triggerClassName,
  menuClassName,
}: CustomSelectProps<T>) {
  const { t } = useTranslation('common')
  const id = useId()
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const search = useRef({ text: '', time: 0 })
  const selected = options.findIndex((option) => option.value === value)
  const show = (index = selected) => {
    if (disabled || !options.length) return
    setActive(Math.max(0, Math.min(index, options.length - 1)))
    setOpen(true)
  }
  const choose = (index: number) => {
    const option = options[index]
    if (!option) return
    onChange(option.value)
    setOpen(false)
    trigger.current?.focus()
  }
  useEffect(() => {
    if (!open) return
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target))
        setOpen(false)
    }
    document.addEventListener('pointerdown', dismiss)
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [open])
  useEffect(() => {
    if (open)
      root.current
        ?.querySelector(`#${CSS.escape(`${id}-option-${active}`)}`)
        ?.scrollIntoView({ block: 'nearest' })
  }, [active, open, id])
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const key = event.key
    if (key === 'Tab') {
      setOpen(false)
      return
    }
    if (key === 'Escape') {
      event.preventDefault()
      setOpen(false)
      return
    }
    if (key === 'ArrowDown' || key === 'ArrowUp') {
      event.preventDefault()
      if (!open) show()
      else
        setActive((current) =>
          Math.max(
            0,
            Math.min(
              options.length - 1,
              current + (key === 'ArrowDown' ? 1 : -1)
            )
          )
        )
    } else if (key === 'Home' || key === 'End') {
      event.preventDefault()
      show(key === 'Home' ? 0 : options.length - 1)
    } else if (key === 'Enter' || key === ' ') {
      event.preventDefault()
      if (open) choose(active)
      else show()
    } else if (
      key.length === 1 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      event.preventDefault()
      const now = Date.now()
      const text =
        (now - search.current.time < 700 ? search.current.text : '') +
        key.toLowerCase()
      search.current = { text, time: now }
      const match = options.findIndex((option) =>
        option.label.toLowerCase().startsWith(text)
      )
      if (match >= 0) show(match)
    }
  }
  return (
    <div
      ref={root}
      className={cn('text-text-strong relative', className)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
    >
      <span id={`${id}-label`}>{label}</span>
      <button
        disabled={disabled || !options.length}
        ref={trigger}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={`${id}-list`}
        aria-labelledby={`${id}-label ${id}-value`}
        aria-activedescendant={open ? `${id}-option-${active}` : undefined}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(
          'expert-scenario-trigger border-border-control text-text-strong focus-visible:outline-accent-text bg-surface flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-55',
          triggerClassName
        )}
        onKeyDown={onKeyDown}
        onClick={() => (open ? setOpen(false) : show())}
      >
        <span id={`${id}-value`}>
          {options.find((option) => option.value === value)?.label ??
            placeholder ??
            t('select.placeholder')}
        </span>
        <ChevronDown size={18} aria-hidden="true" />
      </button>
      {open && (
        <ul
          id={`${id}-list`}
          role="listbox"
          aria-labelledby={`${id}-label`}
          className={cn(
            'expert-scenario-menu border-border-control bg-surface hide-scrollbar absolute top-full right-0 left-0 z-20 mt-1 max-h-72 overflow-y-auto rounded-lg border p-1 shadow-[0_8px_24px_-8px_#263c3633]',
            menuClassName
          )}
        >
          <style>{`
            .hide-scrollbar::-webkit-scrollbar { display: none; }
            .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          `}</style>
          {options.map(({ value: key, label }, index) => (
            <li
              key={key}
              id={`${id}-option-${index}`}
              role="option"
              className="data-[active=true]:bg-accent-soft flex cursor-pointer items-center justify-between gap-2 rounded px-3 py-2 text-sm"
              aria-selected={value === key}
              data-active={active === index}
              onPointerMove={() => setActive(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(index)}
            >
              <span>{label}</span>
              {value === key && <Check size={16} aria-hidden="true" />}
            </li>
          ))}
        </ul>
      )}
      {name && (
        <input type="hidden" name={name} value={value} disabled={disabled} />
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-danger text-sm">
          {error}
        </p>
      )}
    </div>
  )
}
