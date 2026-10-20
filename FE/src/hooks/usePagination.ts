import { useState } from 'react'
import { paginate } from '../lib/pagination'

export function usePagination<T>(items: T[], resetKey = '', initialPageSize = 10) {
  const [pageSize, setPageSize] = useState(initialPageSize)
  const [selection, setSelection] = useState({ key: resetKey, index: 0 })
  if (selection.key !== resetKey) {
    setSelection({ key: resetKey, index: 0 })
  }
  const paged = paginate(items, selection.key === resetKey ? selection.index : 0, pageSize)
  return {
    ...paged,
    page: paged.pageIndex + 1,
    setPage: (page: number) => setSelection({ key: resetKey, index: page - 1 }),
    setPageSize: (size: number) => {
      setPageSize(size)
      setSelection({ key: resetKey, index: 0 })
    },
  }
}
