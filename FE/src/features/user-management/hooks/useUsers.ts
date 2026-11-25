import { useTableSort } from '@/hooks/useTableSort'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { foldVietnamese, paginate } from '@/lib/utils'
import { useAccount } from '@/features/auth'
import { getUsers, sendPasswordReset, setUserLocked } from '../api/usersApi'
import { usersKeys } from '../api/queryKeys'
import { ALL } from '../constants'
import type { ManagedUser, UserRole } from '../types'

/** Filter users by role, status, name or email before paginating. */
export function useUsers() {
  const qc = useQueryClient()
  const me = useAccount('admin')
  const [role, setRoleState] = useState<UserRole | typeof ALL>(ALL)
  const [status, setStatusState] = useState<ManagedUser['status'] | typeof ALL>(
    ALL
  )
  const [query, setQueryState] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const {
    data: users = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: usersKeys.all,
    queryFn: ({ signal }) => getUsers(signal),
  })
  const refresh = () => qc.invalidateQueries({ queryKey: usersKeys.all })

  const q = foldVietnamese(query.trim())
  const rows = users.filter(
    (u) =>
      (role === ALL || (u.roles ?? [u.role]).includes(role)) &&
      (status === ALL || u.status === status) &&
      (!q ||
        foldVietnamese(u.name).includes(q) ||
        foldVietnamese(u.email).includes(q))
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
      name: (u) => u.name,
      email: (u) => u.email,
      phone: (u) => u.phone,
      createdAt: (u) => Date.parse(u.createdAt),
    },
    { key: 'createdAt', direction: 'desc' }
  )

  return {
    sort: tableSort.sort,
    onSort: (key: string) => {
      tableSort.onSort(key)
      setPage(0)
    },
    isLoading,
    error,
    /** Email tài khoản đang đăng nhập: không cho tự khóa chính mình */
    myEmail: me.email,
    selected: users.find((u) => u.id === selectedId) ?? null,
    select: setSelectedId,
    role,
    setRole: resetting(setRoleState),
    status,
    setStatus: resetting(setStatusState),
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
    setLocked: (id: string, locked: boolean, reason: string) =>
      setUserLocked(id, locked, reason, me.name).then(refresh),
    sendReset: (id: string, reason: string) =>
      sendPasswordReset(id, reason, me.name).then(refresh),
  }
}
