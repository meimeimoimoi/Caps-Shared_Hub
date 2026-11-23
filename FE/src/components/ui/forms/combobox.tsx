import {
  useId,
  useState,
  type InputHTMLAttributes,
  type KeyboardEvent,
} from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { scrollActiveOption } from './form-control'

/** Bỏ dấu để gõ "ho chi minh" vẫn khớp "Hồ Chí Minh". */
const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()

type ComboboxProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'role'
> & {
  value: string
  onChange: (value: string) => void
  options: readonly string[]
}

/* Ô nhập có danh sách gợi ý: bấm để xổ danh sách, gõ để lọc (không phân biệt dấu),
 * vẫn cho nhập giá trị ngoài danh sách. Giao diện danh sách giống CustomSelect.
 * ponytail: menu luôn mở xuống dưới; thêm lật lên trên như CustomSelect khi dùng ở cuối màn hình. */
export function Combobox({
  value,
  onChange,
  options,
  className,
  id,
  onBlur,
  ...inputProps
}: ComboboxProps) {
  const listId = `${useId()}-list`
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  // Giá trị đã khớp một mục thì bấm vào vẫn thấy cả danh sách, chưa khớp thì lọc theo chữ đang gõ
  const query = options.includes(value) ? '' : fold(value)
  // Khớp đầu tên trước, rồi đầu một từ, rồi bất kỳ vị trí nào; cùng hạng giữ thứ tự gốc
  const rank = (option: string) => {
    const text = fold(option)
    return text.startsWith(query) ? 0 : text.includes(` ${query}`) ? 1 : 2
  }
  const matches = query
    ? options
        .filter((option) => fold(option).includes(query))
        .sort((a, b) => rank(a) - rank(b))
    : options
  const expanded = open && matches.length > 0

  const choose = (option: string) => {
    onChange(option)
    setOpen(false)
    setActive(-1)
  }
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!expanded) {
        setOpen(true)
        setActive(Math.max(0, matches.indexOf(value)))
        return
      }
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActive((i) => (i + step + matches.length) % matches.length)
    } else if (event.key === 'Enter' && expanded && matches[active]) {
      event.preventDefault()
      choose(matches[active])
    } else if (event.key === 'Escape' && expanded) {
      event.preventDefault()
      setOpen(false)
    }
  }

  return (
    <div className="relative">
      <input
        {...inputProps}
        id={id}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-activedescendant={
          expanded && active >= 0 ? `${listId}-${active}` : undefined
        }
        autoComplete="off"
        value={value}
        onChange={(event) => {
          onChange(event.target.value)
          setOpen(true)
          setActive(-1)
        }}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        onBlur={(event) => {
          setOpen(false)
          onBlur?.(event)
        }}
        className={cn(className, 'pr-10')}
      />
      <ChevronDown
        size={18}
        aria-hidden="true"
        className={cn(
          'text-text-muted pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 transition-transform motion-reduce:transition-none',
          expanded && 'rotate-180'
        )}
      />
      {expanded && (
        <ul
          id={listId}
          role="listbox"
          className="custom-select-menu hide-scrollbar border-border-control bg-surface shadow-overlay absolute top-[calc(100%+8px)] right-0 left-0 z-20 max-h-72 overflow-y-auto overscroll-contain rounded-lg border p-1"
        >
          {matches.map((option, index) => (
            <li
              key={option}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={option === value}
              data-active={index === active}
              ref={(el) => {
                if (
                  index === active &&
                  el?.parentElement instanceof HTMLUListElement
                )
                  scrollActiveOption(el.parentElement, index)
              }}
              onPointerMove={() => setActive(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(option)}
              className="hover:bg-accent-soft hover:text-accent-text data-[active=true]:bg-accent-soft data-[active=true]:text-accent-text aria-selected:text-accent-text flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded px-3 py-2 text-sm aria-selected:font-semibold"
            >
              <span>{option}</span>
              {option === value && <Check size={16} aria-hidden="true" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
