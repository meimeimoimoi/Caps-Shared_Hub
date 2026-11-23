import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { foldVietnamese } from '@/lib/utils'
import {
  getDocuments,
  getPipelineSummary,
  retryDocument,
  uploadDocument,
} from '../api/knowledgeApi'
import { knowledgeKeys } from '../api/queryKeys'
import type { QueueFilter } from '../constants'

/** stage do trang quyết định (vd. lấy từ URL); 'collect' = mọi văn bản */
export function useReviewQueue(stage: QueueFilter) {
  const qc = useQueryClient()
  const [query, setQuery] = useState('')

  const summary = useQuery({
    queryKey: knowledgeKeys.summary(),
    queryFn: ({ signal }) => getPipelineSummary(signal),
  })
  const documents = useQuery({
    queryKey: knowledgeKeys.documents(stage),
    queryFn: ({ signal }) => getDocuments(stage, signal),
  })
  const refreshAll = () => qc.invalidateQueries({ queryKey: knowledgeKeys.all })

  // ponytail: lọc phía client theo trang đã tải; chuyển sang ?q= của API khi danh sách lớn
  const q = foldVietnamese(query.trim())
  const rows = (documents.data ?? [])
    .filter(
      (d) =>
        !q ||
        foldVietnamese(d.title).includes(q) ||
        foldVietnamese(d.number).includes(q)
    )
    .sort((a, b) => a.queuedAt.localeCompare(b.queuedAt)) // cũ nhất trước

  return {
    query,
    setQuery,
    summary: summary.data,
    rows,
    isLoading: documents.isLoading,
    error: documents.error,
    upload: async (...args: Parameters<typeof uploadDocument>) => {
      await uploadDocument(...args)
      await refreshAll()
    },
    retry: (documentId: string) => retryDocument(documentId).then(refreshAll),
  }
}
