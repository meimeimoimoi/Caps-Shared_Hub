import { useEffect, useId, useRef, useState } from 'react'
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { formControlClassName } from '@/components/ui/forms/form-control'

const months = Array.from({ length: 12 }, (_, month) =>
  new Date(2000, month, 1).toLocaleString('en-US', { month: 'long' }),
)
const iso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

/** Birthday calendar with direct month/year navigation; values remain YYYY-MM-DD. */
export function DatePicker({ value, onChange, id, error }: {
  value: string
  onChange: (value: string) => void
  id: string
  error?: string
}) {
  const popupId = useId()
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const today = new Date()
  const minYear = today.getFullYear() - 120
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<'days' | 'months' | 'years'>('days')
  const [cursor, setCursor] = useState(today)
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const yearStart = Math.floor(year / 12) * 12
  const close = () => { setOpen(false); trigger.current?.focus() }
  const choose = (date: Date) => { onChange(iso(date)); close() }
  const cellClass = 'h-9 w-full bg-transparent text-ex-ink [&[aria-current=date]:not([aria-pressed=true])]:bg-[#fbf1eb] aria-[current=date]:font-semibold [&[aria-current=date]:not([aria-pressed=true])]:text-ex-accent aria-pressed:bg-ex-accent aria-pressed:font-semibold aria-pressed:text-white aria-pressed:enabled:hover:bg-ex-accent'

  useEffect(() => {
    if (!open) return
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', dismiss)
    const target = root.current?.querySelector<HTMLButtonElement>('[data-calendar-focus]:not(:disabled)')
      ?? root.current?.querySelector<HTMLButtonElement>('[data-calendar-cell]:not(:disabled)')
    target?.focus()
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [open, view])

  const move = (direction: number) => {
    setCursor(view === 'years'
      ? new Date(Math.max(minYear, Math.min(today.getFullYear(), year + direction * 12)), month, 1)
      : new Date(year, month + direction, 1))
  }
  return (
    <div ref={root} className="relative min-w-0" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
    }} onKeyDown={(event) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close() }
      if (!open || !event.key.startsWith('Arrow')) return
      const cells = Array.from(root.current?.querySelectorAll<HTMLButtonElement>('[data-calendar-cell]:not(:disabled)') ?? [])
      const index = cells.indexOf(document.activeElement as HTMLButtonElement)
      if (index < 0) return
      event.preventDefault()
      const columns = view === 'days' ? 7 : 3
      const offset = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowDown' ? columns : -columns
      cells[Math.max(0, Math.min(cells.length - 1, index + offset))]?.focus()
    }}>
      <input type="hidden" name="birth" value={value} />
      <button ref={trigger} id={id} type="button" aria-haspopup="dialog" aria-expanded={open}
        aria-controls={open ? popupId : undefined} aria-invalid={!!error} aria-describedby={error ? 'error-birth' : undefined}
        className={`${formControlClassName} flex items-center justify-between gap-3 text-left ${error ? '!border-ex-error-text' : ''}`}
        onClick={() => {
          if (open) { setOpen(false); return }
          setCursor(value ? new Date(`${value}T00:00:00`) : new Date(today.getFullYear() - 25, today.getMonth(), 1))
          setView('days'); setOpen(true)
        }}>
        <span className={value ? '' : 'text-ex-muted'}>{value ? value.split('-').reverse().join(' / ') : 'DD / MM / YYYY'}</span>
        <CalendarDays size={18} className="shrink-0 text-ex-muted" aria-hidden="true" />
      </button>
      {open && <div id={popupId} data-date-picker-panel role="dialog" aria-label="Choose date of birth"
        className="absolute top-[calc(100%+8px)] left-0 z-50 w-[308px] max-w-[min(100%,calc(100vw-40px))] rounded-[14px] bg-white p-3.5 text-[13px] text-ex-ink tabular-nums shadow-[0_12px_36px_-10px_#263c3638,0_3px_10px_-4px_#263c361a] [&_button]:inline-flex [&_button]:cursor-pointer [&_button]:items-center [&_button]:justify-center [&_button]:rounded-[7px] [&_button]:border-0 [&_button]:font-[inherit] [&_button]:leading-none [&_button]:transition-colors [&_button]:duration-[140ms] [&_button]:ease-[ease] [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-2 [&_button:focus-visible]:outline-ex-accent [&_button:disabled]:cursor-default [&_button:disabled]:opacity-35 [&_button:enabled:hover]:bg-[#f2f4f1] motion-reduce:[&_button]:transition-none">
        <div className="mb-3 flex items-center justify-between gap-1">
          <button type="button" className="size-8 shrink-0 bg-[#f5f6f4] text-ex-muted" aria-label={view === 'years' ? 'Previous years' : 'Previous month'}
            disabled={view === 'months' || (view === 'years' ? yearStart <= minYear : year === minYear && month === 0)} onClick={() => move(-1)}><ChevronLeft size={18} /></button>
          <div className="flex items-center justify-center gap-0.5" aria-live="polite">
            <button type="button" className="h-8 gap-[5px] bg-transparent px-[7px] font-semibold! aria-pressed:bg-[#fbf1eb] aria-pressed:text-ex-accent [&_svg]:text-ex-muted" aria-label="Choose month" aria-pressed={view === 'months'} onClick={() => setView(view === 'months' ? 'days' : 'months')}>{months[month]}<ChevronDown size={12} aria-hidden="true" /></button>
            <button type="button" className="h-8 gap-[5px] bg-transparent px-[7px] font-semibold! aria-pressed:bg-[#fbf1eb] aria-pressed:text-ex-accent [&_svg]:text-ex-muted" aria-label="Choose year" aria-pressed={view === 'years'} onClick={() => setView(view === 'years' ? 'days' : 'years')}>{view === 'years' ? `${yearStart}–${yearStart + 11}` : year}<ChevronDown size={12} aria-hidden="true" /></button>
          </div>
          <button type="button" className="size-8 shrink-0 bg-[#f5f6f4] text-ex-muted" aria-label={view === 'years' ? 'Next years' : 'Next month'}
            disabled={view === 'months' || (view === 'years' ? yearStart + 11 >= today.getFullYear() : year === today.getFullYear() && month === today.getMonth())} onClick={() => move(1)}><ChevronRight size={18} /></button>
        </div>
        {view === 'days' ? <>
          <div className="mb-[5px] grid grid-cols-7 gap-0.5 text-center text-[11px] font-medium text-ex-muted [&_span]:py-1.5">{['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => <span key={day}>{day}</span>)}</div>
          <div className="grid grid-cols-7 gap-0.5 text-center">
            {Array.from({ length: new Date(year, month, 1).getDay() }, (_, i) => <span key={`blank-${i}`} />)}
            {Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, i) => {
              const date = new Date(year, month, i + 1)
              const selected = iso(date) === value
              return <button key={i} type="button" data-calendar-cell data-calendar-focus={selected || (!value && i === 0) ? '' : undefined}
                aria-label={date.toLocaleDateString('en-US', { dateStyle: 'full' })} aria-pressed={selected}
                aria-current={iso(date) === iso(today) ? 'date' : undefined}
                disabled={iso(date) > iso(today)} className={cellClass}
                onClick={() => choose(date)}>{i + 1}</button>
            })}
          </div>
        </> : <div className="grid grid-cols-3 gap-[7px] py-[5px] [&_button]:h-[42px]">
          {Array.from({ length: 12 }, (_, i) => {
            const number = view === 'years' ? yearStart + i : i
            const disabled = view === 'years' ? number < minYear || number > today.getFullYear() : year === today.getFullYear() && i > today.getMonth()
            return <button key={i} type="button" data-calendar-cell data-calendar-focus={i === 0 ? '' : undefined}
              disabled={disabled} aria-pressed={view === 'years' ? number === year : number === month} className={cellClass} onClick={() => {
                setCursor(new Date(view === 'years' ? number : year, view === 'years' ? Math.min(month, number === today.getFullYear() ? today.getMonth() : 11) : number, 1))
                setView(view === 'years' ? 'months' : 'days')
              }}>{view === 'years' ? number : months[i].slice(0, 3)}</button>
          })}
        </div>}
        <div className="mt-3 flex items-center justify-between border-t border-[#edf0eb] pt-2.5">
          <button type="button" className="h-[30px] bg-transparent px-2.5 text-xs! text-ex-muted" disabled={!value} onClick={() => { onChange(''); close() }}>Clear</button>
          <button type="button" className="h-[30px] bg-[#f2f4f1] px-2.5 text-xs! font-semibold! text-ex-ink" onClick={close}>Close</button>
        </div>
      </div>}
    </div>
  )
}
