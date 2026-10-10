import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { foldVietnamese, paginate } from '@/lib/utils'
import { useAccount } from '@/features/auth'
import { getEscrows, markRefunded, retryPayout } from '../api/disputesApi'
import { disputesKeys } from '../api/queryKeys'
import type { Escrow } from '../types'

export const ALL = 'ALL'

/** Danh sách Escrow: lọc trạng thái, tìm theo mã hồ sơ / Client / chuyên gia / mã PayOS, phân trang */
export function useEscrows() {
  const qc = useQueryClient()
  const { name } = useAccount('admin')
  const [status, setStatusState] = useState<Escrow['status'] | typeof ALL>(ALL)
  const [query, setQueryState] = useState('')
  const [page, setPage] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const query$ = useQuery({
    queryKey: disputesKeys.escrows(),
    queryFn: ({ signal }) => getEscrows(signal),
  })
  const all = query$.data ?? []

  const q = foldVietnamese(query.trim())
  const matching = all
    .filter(
      (e) =>
        !q ||
        [e.caseId, e.client, e.expert, e.payosRef].some((v) =>
          foldVietnamese(v).includes(q)
        )
    )
    .sort((a, b) => b.paidAt.localeCompare(a.paidAt)) // thanh toán gần nhất trước
  const rows = matching.filter((e) => status === ALL || e.status === status)

  return {
    isLoading: query$.isLoading,
    error: query$.error,
    /** Đã áp dụng tìm kiếm nhưng chưa lọc trạng thái: dùng cho ô tổng theo trạng thái */
    matching,
    /** Đã áp dụng cả tìm kiếm và lọc: dùng cho bảng và file đối soát */
    rows,
    status,
    setStatus: (s: Escrow['status'] | typeof ALL) => {
      setStatusState(s)
      setPage(0)
    },
    query,
    setQuery: (v: string) => {
      setQueryState(v)
      setPage(0)
    },
    paged: paginate(rows, page),
    prev: () => setPage((p) => p - 1),
    next: () => setPage((p) => p + 1),
    selected: all.find((e) => e.caseId === selectedId) ?? null,
    select: setSelectedId,
    // Bảng, dashboard và chuông cùng đổi khi khoản lỗi được chi trả lại
    retryPayout: (caseId: string) =>
      retryPayout(caseId, name).then(() =>
        qc.invalidateQueries({ queryKey: disputesKeys.all })
      ),
    markRefunded: (caseId: string, ref: string) =>
      markRefunded(caseId, ref, name).then(() => qc.invalidateQueries({ queryKey: disputesKeys.all })),
  }
}
