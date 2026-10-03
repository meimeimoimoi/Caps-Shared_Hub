import { useState } from 'react'
import { getMockApplicationDetail, mockCriteria } from '../mockData'
import type { ReviewDecision } from '../types'

export function useApplicationReview(id: string) {
  // MOCK: thay bằng useQuery gọi API chi tiết hồ sơ + tiêu chí (xem features/admin/mockData.ts)
  const detail = getMockApplicationDetail(id)
  const criteria = mockCriteria

  const [scores, setScores] = useState<Record<string, number>>({})
  const [evidence, setEvidence] = useState<Record<string, string>>({})
  const [reviewedFlags, setReviewedFlags] = useState<string[]>([])
  const [decision, setDecision] = useState<ReviewDecision | null>(null)

  const flags = detail?.screening.flags ?? []
  const remainingCriteria = criteria.filter(
    (c) => !scores[c.id] || !evidence[c.id]?.trim()
  ).length
  const unreviewedFlags = flags.filter(
    (f) => !reviewedFlags.includes(f.id)
  ).length

  return {
    detail,
    criteria,
    scores,
    setScore: (criterionId: string, level: number) =>
      setScores((s) => ({ ...s, [criterionId]: level })),
    evidence,
    setEvidence: (criterionId: string, text: string) =>
      setEvidence((e) => ({ ...e, [criterionId]: text })),
    reviewedFlags,
    toggleFlagReviewed: (flagId: string) =>
      setReviewedFlags((r) =>
        r.includes(flagId) ? r.filter((x) => x !== flagId) : [...r, flagId]
      ),
    remainingCriteria,
    unreviewedFlags,
    canApprove: !decision && remainingCriteria === 0 && unreviewedFlags === 0,
    decision,
    // MOCK: chưa gửi API. TODO(api): POST quyết định kèm scores + evidence, rồi điều hướng về danh sách
    decide: setDecision,
  }
}
