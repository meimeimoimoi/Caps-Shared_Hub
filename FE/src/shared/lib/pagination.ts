export interface Paged<T> {
  rows: T[]
  total: number
  from: number
  to: number
  canPrev: boolean
  canNext: boolean
  pageIndex: number
  pageSize: number
  pageCount: number
}

/** Local pagination; page indices start at zero. Clamp after data changes. */
export function paginate<T>(all: T[], page: number, size = 10): Paged<T> {
  const pageSize = Number.isFinite(size) ? Math.max(1, Math.trunc(size)) : 10
  const pageCount = Math.max(1, Math.ceil(all.length / pageSize))
  const pageIndex = Math.min(pageCount - 1, Math.max(0, Number.isFinite(page) ? Math.trunc(page) : 0))
  const rows = all.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize)
  return {
    rows,
    total: all.length,
    from: all.length ? pageIndex * pageSize + 1 : 0,
    to: all.length ? pageIndex * pageSize + rows.length : 0,
    canPrev: pageIndex > 0,
    canNext: pageIndex < pageCount - 1,
    pageIndex,
    pageSize,
    pageCount,
  }
}

export function paginationPages(page: number, count: number): (number | 'gap')[] {
  const pages = [...new Set([1, count, page - 1, page, page + 1])]
    .filter((value) => value >= 1 && value <= count)
    .sort((a, b) => a - b)
  const result: (number | 'gap')[] = []
  for (const value of pages) {
    const previous = result.at(-1)
    if (typeof previous === 'number' && value - previous > 1) {
      if (value - previous === 2) result.push(previous + 1)
      else result.push('gap')
    }
    result.push(value)
  }
  return result
}
