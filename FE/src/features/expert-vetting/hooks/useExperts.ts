import { useTableSort } from '@/hooks/useTableSort'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { paginate } from '@/lib/utils'
import { getExperts, setExpertServiceStatus } from '../api/adminApi'
import { adminKeys } from '../api/queryKeys'
import type { Expert } from '../types'
import { foldVietnamese } from '../utils/applications'
import { useFieldLabel } from './useLabels'

export const ALL = 'ALL'

export function useExperts() {
  const [status, setStatusState] = useState<
    Expert['serviceStatus'] | typeof ALL
  >(ALL)
  const [field, setFieldState] = useState<string>(ALL)
  const [query, setQueryState] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)

  const qc = useQueryClient()
  const fieldLabel = useFieldLabel()
  const {
    data = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: adminKeys.experts(),
    queryFn: ({ signal }) => getExperts(signal),
  })
  // The API sends field codes; filters and the table work on the labels
  const experts = data.map((e) => ({ ...e, fields: e.fields.map(fieldLabel) }))
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const setServiceStatus = async (
    id: string,
    status: Expert['serviceStatus'],
    note?: string
  ) => {
    await setExpertServiceStatus(id, status, note)
    await qc.invalidateQueries({ queryKey: adminKeys.experts() })
  }
  const fields = [...new Set(experts.flatMap((e) => e.fields))].sort((a, b) =>
    a.localeCompare(b, 'vi')
  )

  const q = foldVietnamese(query.trim())
  const rows = experts.filter(
    (e) =>
      (status === ALL || e.serviceStatus === status) &&
      (field === ALL || e.fields.includes(field)) &&
      (!q ||
        foldVietnamese(e.name).includes(q) ||
        foldVietnamese(e.email).includes(q))
  )

  // Reset to the first page when filters change.
  const resetting =
    <T>(set: (v: T) => void) =>
    (v: T) => {
      set(v)
      setPage(0)
    }

  const tableSort = useTableSort(
    rows,
    {
      name: (e) => e.name,
      service: (e) => e.serviceName,
      fee: (e) => e.fee,
      activeCases: (e) => e.activeCases,
      approvedAt: (e) => Date.parse(e.approvedAt),
    },
    { key: 'approvedAt', direction: 'desc' }
  )

  return {
    sort: tableSort.sort,
    onSort: (key: string) => {
      tableSort.onSort(key)
      setPage(0)
    },
    isLoading,
    error,
    selected: experts.find((e) => e.id === selectedId) ?? null,
    select: setSelectedId,
    setServiceStatus,
    status,
    setStatus: resetting(setStatusState),
    field,
    setField: resetting(setFieldState),
    fields,
    query,
    setQuery: resetting(setQueryState),
    paged: paginate(tableSort.rows, page, pageSize),
    setPage: (value: number) => setPage(value - 1),
    setPageSize: (size: number) => {
      setPageSize(size)
      setPage(0)
    },
    prev: () => setPage((p) => p - 1),
    next: () => setPage((p) => p + 1),
  }
}
