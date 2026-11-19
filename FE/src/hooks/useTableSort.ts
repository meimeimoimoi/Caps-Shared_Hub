import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { sortRows, type TableSort, type SortValue } from '@/lib/table-sort'

export function useSortState(initial: TableSort) {
  const [sort, setSort] = useState(initial)
  const onSort = (key: string) =>
    setSort((current) => ({
      key,
      direction:
        current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }))
  return { sort, onSort, setSort }
}

export function useTableSort<T>(
  items: readonly T[],
  fields: Record<string, (row: T) => SortValue>,
  initial: TableSort
) {
  const state = useSortState(initial)
  const { i18n } = useTranslation('common')
  const selector = fields[state.sort.key]
  return {
    ...state,
    rows: selector
      ? sortRows(items, selector, state.sort.direction, i18n.language)
      : [...items],
  }
}
