import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { foldVietnamese, paginate } from '@/lib/utils'
import { useAccount } from '@/features/auth'
import { getUsers, sendPasswordReset, setUserLocked } from '../api/usersApi'
import { usersKeys } from '../api/queryKeys'
import { ALL } from '../constants'
import type { ManagedUser, UserRole } from '../types'

/** Danh sách người dùng: lọc vai trò/trạng thái, tìm theo tên hoặc email, phân trang; cùng cách useExperts */
export function useUsers() {
  const qc = useQueryClient()
  const me = useAccount('admin')
  const [role, setRoleState] = useState<UserRole | typeof ALL>(ALL)
  const [status, setStatusState] = useState<ManagedUser['status'] | typeof ALL>(
    ALL
  )
  const [query, setQueryState] = useState('')
  const [page, setPage] = useState(0)
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
  const rows = users
    .filter(
      (u) =>
        (role === ALL || u.role === role) &&
        (status === ALL || u.status === status) &&
        (!q ||
          foldVietnamese(u.name).includes(q) ||
          foldVietnamese(u.email).includes(q))
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)) // mới tạo trước

  // Đổi bộ lọc thì quay về trang đầu
  const resetting =
    <T>(set: (v: T) => void) =>
    (v: T) => {
      set(v)
      setPage(0)
    }

  return {
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
    paged: paginate(rows, page),
    prev: () => setPage((p) => p - 1),
    next: () => setPage((p) => p + 1),
    setLocked: (id: string, locked: boolean, reason: string) =>
      setUserLocked(id, locked, reason, me.name).then(refresh),
    sendReset: (id: string) => sendPasswordReset(id, me.name).then(refresh),
  }
}
