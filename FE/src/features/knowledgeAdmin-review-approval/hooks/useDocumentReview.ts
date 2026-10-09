import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  approveDocument,
  getDocumentReview,
  markUnitReviewed,
  rejectDocument,
  saveUnitText,
} from '../api/knowledgeApi'
import { knowledgeKeys } from '../api/queryKeys'
import type { ApproveInput } from '../types'
import { articleStatus } from '../utils/review'

export function useDocumentReview(documentId: string) {
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: knowledgeKeys.review(documentId),
    queryFn: ({ signal }) => getDocumentReview(documentId, signal),
  })
  const review = query.data ?? null
  const articles = review?.chapters.flatMap((c) => c.articles) ?? []
  const units = articles.flatMap((a) => a.units)

  const refreshReview = () =>
    qc.invalidateQueries({ queryKey: knowledgeKeys.review(documentId) })
  // Văn bản rời hàng đợi → số đếm và bảng phải đổi theo
  const refreshAll = () => qc.invalidateQueries({ queryKey: knowledgeKeys.all })

  return {
    review,
    isLoading: query.isLoading,
    error: query.error,
    articles,
    reviewedArticles: articles.filter((a) => articleStatus(a) === 'REVIEWED')
      .length,
    warnings: units.filter((u) => u.status === 'WARNING').length,
    markReviewed: (unitId: string) =>
      markUnitReviewed(documentId, unitId).then(refreshReview),
    /** edits: unitId → nội dung mới */
    saveEdits: (edits: Record<string, string>) =>
      Promise.all(
        Object.entries(edits).map(([id, text]) =>
          saveUnitText(documentId, id, text)
        )
      ).then(refreshReview),
    approve: (input: ApproveInput) =>
      approveDocument(documentId, input).then(refreshAll),
    reject: (reason: string) =>
      rejectDocument(documentId, reason).then(refreshAll),
  }
}
