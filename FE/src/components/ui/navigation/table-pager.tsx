import type { Paged } from '@/lib/pagination'
import { Pagination } from '@/components/ui/navigation/pagination'

interface TablePagerProps {
  paged: Paged<unknown>
  onPrev: () => void
  onNext: () => void
}

/** Compatibility adapter for existing Admin tables. */
export function TablePager({ paged, onPrev, onNext }: TablePagerProps) {
  const page = paged.pageIndex + 1
  return <Pagination
    page={page}
    pageSize={paged.pageSize}
    total={paged.total}
    locale="vi"
    showPages={false}
    onPageChange={(next) => next < page ? onPrev() : onNext()}
  />
}
