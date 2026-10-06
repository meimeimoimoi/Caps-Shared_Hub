import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { foldVietnamese } from '@/lib/utils'
import {
  getDocuments,
  getPipelineSummary,
  uploadDocument,
} from '../api/knowledgeApi'
import { knowledgeKeys } from '../api/queryKeys'
import type { PipelineStage } from '../constants'

/** initialStage 'collect' = mọi văn bản (màn Tất cả văn bản) */
export function useReviewQueue(initialStage: PipelineStage = 'review') {
  const qc = useQueryClient()
  const [stage, setStage] = useState<PipelineStage>(initialStage)
  const [query, setQuery] = useState('')

  const summary = useQuery({
    queryKey: knowledgeKeys.summary(),
    queryFn: ({ signal }) => getPipelineSummary(signal),
  })
  const documents = useQuery({
    queryKey: knowledgeKeys.documents(stage),
    queryFn: ({ signal }) => getDocuments(stage, signal),
  })

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
    stage,
    setStage,
    query,
    setQuery,
    summary: summary.data,
    rows,
    isLoading: documents.isLoading,
    error: documents.error,
    upload: async (...args: Parameters<typeof uploadDocument>) => {
      await uploadDocument(...args)
      await qc.invalidateQueries({ queryKey: knowledgeKeys.all })
    },
  }
}
