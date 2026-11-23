export type SortValue = string | number | null | undefined
export interface TableSort {
  key: string
  direction: 'asc' | 'desc'
}

/** Stable sorting of a copy; missing values remain last in both directions. */
export function sortRows<T>(
  rows: readonly T[],
  value: (row: T) => SortValue,
  direction: TableSort['direction'],
  locale = 'vi'
): T[] {
  const collator = new Intl.Collator(locale, {
    numeric: true,
    sensitivity: 'base',
  })
  return [...rows].sort((a, b) => {
    const left = value(a)
    const right = value(b)
    const missingLeft =
      left == null || (typeof left === 'number' && !Number.isFinite(left))
    const missingRight =
      right == null || (typeof right === 'number' && !Number.isFinite(right))
    if (missingLeft || missingRight)
      return missingLeft === missingRight ? 0 : missingLeft ? 1 : -1
    const compared =
      typeof left === 'number' && typeof right === 'number'
        ? left - right
        : collator.compare(String(left), String(right))
    return direction === 'asc' ? compared : -compared
  })
}
