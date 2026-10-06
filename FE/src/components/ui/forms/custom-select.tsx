import {
  useEffect,
  useLayoutEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'
import { useMotion } from '@/components/ui/motion'

export interface SelectOption<T extends string = string> {
  value: T
  label: string
}

function scrollActiveOption(list: HTMLUListElement, index: number) {
  const option = list.children[index] as HTMLElement | undefined
  if (!option) return
  const top = option.offsetTop
  const bottom = top + option.offsetHeight
  if (top < list.scrollTop) list.scrollTop = top
  else if (bottom > list.scrollTop + list.clientHeight)
    list.scrollTop = bottom - list.clientHeight
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
  const [placement, setPlacement] = useState({ above: false, maxHeight: 288 })
  const [open, setOpen] = useState(false)
  const menu = useMotion<HTMLUListElement>({
    preset: 'popover',
    disabled: !open,
    replayKey: open ? 1 : 0,
  })
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
  useLayoutEffect(() => {
    if (!open) return
    const position = () => {
      const rect = trigger.current?.getBoundingClientRect()
      if (!rect) return
      const below = window.innerHeight - rect.bottom - 16
      const above = rect.top - 16
      const openAbove =
        below < Math.min(288, options.length * 44 + 10) && above > below
      const maxHeight = Math.max(44, Math.min(288, openAbove ? above : below))
      setPlacement((current) =>
        current.above === openAbove && current.maxHeight === maxHeight
          ? current
          : { above: openAbove, maxHeight }
      )
    }
    position()
    window.addEventListener('resize', position)
    window.addEventListener('scroll', position, true)
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target))
        setOpen(false)
    }
    document.addEventListener('pointerdown', dismiss)
    return () => {
      document.removeEventListener('pointerdown', dismiss)
      window.removeEventListener('resize', position)
      window.removeEventListener('scroll', position, true)
    }
  }, [open, options.length])
  useEffect(() => {
    if (!open || !menu.current) return
    // Scroll only the list; scrollIntoView also moves the page and its ancestors.
    scrollActiveOption(menu.current, active)
  }, [active, open, placement.maxHeight, menu])
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
          'motion-interactive border-border-control text-text-strong focus-visible:outline-accent-text bg-surface flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-55',
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
        <ChevronDown
          size={18}
          aria-hidden="true"
          className={cn(
            'text-text-muted shrink-0 transition-transform duration-[var(--motion-feedback)] motion-reduce:transition-none',
            open && 'rotate-180'
          )}
        />
      </button>
      {open && (
        <ul
          ref={menu}
          id={`${id}-list`}
          role="listbox"
          aria-labelledby={`${id}-label`}
          className={cn(
            'custom-select-menu border-border-control bg-surface shadow-overlay absolute right-0 left-0 z-20 overflow-y-auto overscroll-contain rounded-lg border p-1',
            menuClassName
          )}
          data-placement={placement.above ? 'above' : 'below'}
          style={{
            top: placement.above ? undefined : 'calc(100% + 8px)',
            bottom: placement.above ? 'calc(100% + 8px)' : undefined,
            maxHeight: placement.maxHeight,
          }}
        >
          {options.map(({ value: key, label }, index) => (
            <li
              key={key}
              id={`${id}-option-${index}`}
              role="option"
              className="data-[active=true]:bg-accent-soft aria-selected:bg-accent-soft aria-selected:text-accent-text flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded px-3 py-2 text-sm aria-selected:font-semibold"
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
