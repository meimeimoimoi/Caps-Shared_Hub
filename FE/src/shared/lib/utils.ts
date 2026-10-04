import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Combines Tailwind CSS classes using clsx and tailwind-merge.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export interface Paged<T> {
  rows: T[]
  total: number
  from: number
  to: number
  canPrev: boolean
  canNext: boolean
}

/** Cắt `all` theo trang (page bắt đầu từ 0) */
export function paginate<T>(all: T[], page: number, size = 10): Paged<T> {
  const rows = all.slice(page * size, (page + 1) * size)
  return {
    rows,
    total: all.length,
    from: all.length ? page * size + 1 : 0,
    to: page * size + rows.length,
    canPrev: page > 0,
    canNext: (page + 1) * size < all.length,
  }
}
