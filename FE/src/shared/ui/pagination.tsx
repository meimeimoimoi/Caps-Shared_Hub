import { ChevronLeft, ChevronRight } from 'lucide-react'
import { paginationPages } from '../lib/pagination'
import { CustomSelect } from './custom-select'
import './pagination.css'

interface PaginationProps {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (size: number) => void
  pageSizeOptions?: readonly number[]
  showPages?: boolean
  locale?: 'en' | 'vi'
  label?: string
}

/** Controlled pager. Total must describe the same filtered dataset as the rows. */
export function Pagination({
  page, pageSize, total, onPageChange, onPageSizeChange,
  pageSizeOptions = [5, 10, 20, 50], showPages = true, locale = 'en', label,
}: PaginationProps) {
  const size = Math.max(1, pageSize)
  const count = Math.max(1, Math.ceil(total / size))
  const current = Math.min(count, Math.max(1, page))
  const from = total ? (current - 1) * size + 1 : 0
  const to = Math.min(current * size, total)
  const vi = locale === 'vi'
  const previous = vi ? 'Trang trước' : 'Previous'
  const next = vi ? 'Trang sau' : 'Next'
  const options = [...new Set([...pageSizeOptions, size])].filter((value) => value > 0).sort((a, b) => a - b)

  return (
    <nav className="shared-pagination" aria-label={label ?? (vi ? 'Phân trang' : 'Pagination')}>
      <p className="shared-pagination-range" aria-live="polite" aria-atomic="true">
        {vi ? 'Hiển thị' : 'Showing'} <strong>{from}–{to}</strong> {vi ? 'trên' : 'of'} <strong>{total}</strong>
      </p>
      <div className="shared-pagination-controls">
        {onPageSizeChange && <CustomSelect
          value={String(size)}
          onChange={(value) => onPageSizeChange(Number(value))}
          options={options.map((value) => ({ value: String(value), label: String(value) }))}
          label={vi ? 'Số dòng' : 'Rows per page'}
          className="shared-pagination-size !text-[var(--pager-ink)]"
          triggerClassName="!w-20 !bg-[var(--pager-surface)] !text-[var(--pager-ink)] !border-[var(--pager-line)]"
          menuClassName="!left-auto !bottom-full !top-auto !mt-0 !mb-2 !w-20 !bg-[var(--pager-surface)] !text-[var(--pager-ink)] !border-[var(--pager-line)] [&_[role=option][data-active=true]]:!bg-[var(--pager-hover)] [&_[role=option][aria-selected=true]]:font-semibold"
        />}
        {count > 1 && <div className="shared-pagination-buttons">
          <button type="button" disabled={current <= 1} onClick={() => onPageChange(current - 1)} aria-label={previous}>
            <ChevronLeft size={16} aria-hidden="true" /><span className="shared-pagination-direction">{previous}</span>
          </button>
          {showPages && paginationPages(current, count).map((value, index) => value === 'gap'
            ? <span key={`gap-${index}`} className="shared-pagination-gap" aria-hidden="true">…</span>
            : <button type="button" key={value} aria-current={current === value ? 'page' : undefined} aria-label={`${vi ? 'Trang' : 'Page'} ${value}`} onClick={() => onPageChange(value)}>{value}</button>)}
          <button type="button" disabled={current >= count} onClick={() => onPageChange(current + 1)} aria-label={next}>
            <span className="shared-pagination-direction">{next}</span><ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>}
      </div>
    </nav>
  )
}
