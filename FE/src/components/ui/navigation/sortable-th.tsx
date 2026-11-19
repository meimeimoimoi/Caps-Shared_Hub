import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { TableSort } from '@/lib/table-sort'

interface SortableThProps {
  column: string
  sort?: TableSort
  onSort?: (key: string) => void
  children: string
  className?: string
}

export function SortableTh({
  column,
  sort,
  onSort,
  children,
  className = '',
}: SortableThProps) {
  const { t } = useTranslation('common')
  if (!sort || !onSort)
    return (
      <th scope="col" className={className}>
        {children}
      </th>
    )
  const active = sort.key === column
  const ascending = active && sort.direction === 'asc'
  const Icon = active ? (ascending ? ArrowUp : ArrowDown) : ArrowUpDown
  return (
    <th
      scope="col"
      aria-sort={active ? (ascending ? 'ascending' : 'descending') : 'none'}
      className={className}
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        aria-label={t(
          ascending ? 'table.sortDescending' : 'table.sortAscending',
          { column: children }
        )}
        className={`hover:text-accent-text focus-visible:outline-accent -my-3 flex min-h-11 w-full cursor-pointer items-center gap-1.5 rounded px-1 py-2 text-inherit transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none ${className.includes('text-right') ? 'justify-end text-right' : 'text-left'} ${active ? 'text-fg-strong font-semibold' : ''}`}
      >
        {children}
        <Icon size={14} className="shrink-0" aria-hidden="true" />
      </button>
    </th>
  )
}
