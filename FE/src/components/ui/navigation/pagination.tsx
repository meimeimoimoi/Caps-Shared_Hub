import { ChevronLeft, ChevronRight } from 'lucide-react'
import { paginationPages } from '@/lib/pagination'
import { CustomSelect } from '@/components/ui/forms/custom-select'
import { useTranslation } from 'react-i18next'
import { useFormatters } from '@/hooks/useFormatters'

const pagerButton =
  'inline-flex min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-transparent bg-transparent px-2.5 py-2 text-[13px] font-medium text-[var(--pager-muted)] transition-[background-color,color,border-color,box-shadow] duration-150 hover:enabled:border-[var(--pager-line)] hover:enabled:bg-[var(--pager-hover)] hover:enabled:text-[var(--pager-ink)] disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none'

interface PaginationProps {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (size: number) => void
  pageSizeOptions?: readonly number[]
  showPages?: boolean
  label?: string
}

/** Controlled pager. Total must describe the same filtered dataset as the rows. */
export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 20, 50],
  showPages = true,
  label,
}: PaginationProps) {
  const { t } = useTranslation('common')
  const format = useFormatters()
  const size = Math.max(1, pageSize)
  const count = Math.max(1, Math.ceil(total / size))
  const current = Math.min(count, Math.max(1, page))
  const from = total ? (current - 1) * size + 1 : 0
  const to = Math.min(current * size, total)
  const previous = t('pagination.previous')
  const next = t('pagination.next')
  const options = [...new Set([...pageSizeOptions, size])]
    .filter((value) => value > 0)
    .sort((a, b) => a - b)

  return (
    <nav
      className="shared-pagination rounded-b-overlay @container flex flex-wrap items-center justify-between gap-x-6 gap-y-4 border-t border-[var(--pager-line)] bg-[var(--pager-surface)] px-4 py-4 text-[13px] text-[var(--pager-ink)] tabular-nums [--pager-hover:var(--ui-surface-muted)] [--pager-ink:var(--ui-text-strong)] [--pager-line:var(--ui-border)] [--pager-muted:var(--ui-text-muted)] [--pager-surface:var(--ui-surface)] sm:px-5 [.ep-cases-table-wrapper+&]:border [.ep-cases-table-wrapper+&]:border-t-0"
      aria-label={label ?? t('pagination.label')}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-3 @max-[40rem]:w-full @max-[40rem]:justify-between">
        <p
          className="m-0 text-[var(--pager-muted)] [&_strong]:font-medium [&_strong]:text-[var(--pager-ink)]"
          aria-live="polite"
          aria-atomic="true"
        >
          {t('pagination.range', {
            from: format.number(from),
            to: format.number(to),
            total: format.number(total),
          })}
        </p>
        {onPageSizeChange && (
          <CustomSelect
            value={String(size)}
            onChange={(value) => onPageSizeChange(Number(value))}
            options={options.map((value) => ({
              value: String(value),
              label: format.number(value),
            }))}
            label={t('pagination.rows')}
            className="flex items-center gap-2 !text-[var(--pager-ink)] @min-[40rem]:border-l @min-[40rem]:border-[var(--pager-line)] @min-[40rem]:pl-5 [&>span]:whitespace-nowrap [&>span]:text-[var(--pager-muted)]"
            triggerClassName="!w-20 !bg-[var(--pager-surface)] !text-[var(--pager-ink)] !border-[var(--pager-line)] !shadow-none hover:!border-[var(--ui-accent)]"
            menuClassName="!left-auto !bottom-full !top-auto !mt-0 !mb-2 !w-20 !bg-[var(--pager-surface)] !text-[var(--pager-ink)] !border-[var(--pager-line)] [&_[role=option]]:min-h-10 [&_[role=option][data-active=true]]:!bg-[var(--pager-hover)] [&_[role=option][aria-selected=true]]:font-semibold"
          />
        )}
      </div>
      {count > 1 && (
        <div className="flex items-center gap-1 @max-[40rem]:w-full @max-[40rem]:justify-between">
          <button
            className={pagerButton}
            type="button"
            disabled={current <= 1}
            onClick={() => onPageChange(current - 1)}
            aria-label={previous}
          >
            <ChevronLeft size={16} aria-hidden="true" />
            <span className="@max-[40rem]:hidden">{previous}</span>
          </button>
          {showPages &&
            paginationPages(current, count).map((value, index) =>
              value === 'gap' ? (
                <span
                  key={`gap-${index}`}
                  className="hidden min-w-6 justify-center text-[var(--pager-muted)] @min-[40rem]:inline-flex"
                  aria-hidden="true"
                >
                  …
                </span>
              ) : (
                <button
                  className={`${pagerButton} hidden @min-[40rem]:inline-flex ${current === value ? 'shadow-control !border-[var(--ui-accent)] !bg-[var(--ui-accent)] font-semibold !text-[var(--ui-on-accent)]' : ''}`}
                  type="button"
                  key={value}
                  aria-current={current === value ? 'page' : undefined}
                  aria-label={t('pagination.page', {
                    page: format.number(value),
                  })}
                  onClick={() => {
                    if (value !== current) onPageChange(value)
                  }}
                >
                  {format.number(value)}
                </button>
              )
            )}
          <span
            className={
              showPages
                ? 'px-3 text-[var(--pager-muted)] @min-[40rem]:hidden'
                : 'px-3 text-[var(--pager-muted)]'
            }
          >
            {t('pagination.pageOf', {
              page: format.number(current),
              totalPages: format.number(count),
            })}
          </span>
          <button
            className={pagerButton}
            type="button"
            disabled={current >= count}
            onClick={() => onPageChange(current + 1)}
            aria-label={next}
          >
            <span className="@max-[40rem]:hidden">{next}</span>
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
      )}
    </nav>
  )
}
