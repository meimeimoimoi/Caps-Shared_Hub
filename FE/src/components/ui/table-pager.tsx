import type { Paged } from '@/lib/utils'

interface TablePagerProps {
  paged: Paged<unknown>
  onPrev: () => void
  onNext: () => void
}

/* Chân bảng: "Hiển thị 1–3 trên 3" + Trang trước / Trang sau */
export function TablePager({ paged, onPrev, onNext }: TablePagerProps) {
  return (
    <div className="border-border-subtle text-fg-muted flex items-center justify-between border-t px-4 py-3 text-sm">
      <span>
        Hiển thị{' '}
        <span className="num">
          {paged.from}–{paged.to}
        </span>{' '}
        trên <span className="num">{paged.total}</span>
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={!paged.canPrev}
          onClick={onPrev}
          className="btn btn-press btn-secondary text-sm"
        >
          Trang trước
        </button>
        <button
          type="button"
          disabled={!paged.canNext}
          onClick={onNext}
          className="btn btn-press btn-secondary text-sm"
        >
          Trang sau
        </button>
      </div>
    </div>
  )
}
