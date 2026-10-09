import { useState } from 'react'
import { DECISION_LOG, DECISION_STATUS } from '../constants'
import {
  CURRENT_ADMIN,
  getMockApplicationDetail,
  mockCriteria,
} from '../mockData'
import type { DecisionRecord, HistoryEntry, ReviewDecision } from '../types'

export function useApplicationReview(id: string) {
  // MOCK: thay bằng useQuery gọi API chi tiết hồ sơ + tiêu chí (xem features/admin/mockData.ts)
  const detail = getMockApplicationDetail(id)
  const criteria = mockCriteria

  const [scores, setScores] = useState<Record<string, number>>({})
  const [evidence, setEvidence] = useState<Record<string, string>>({})
  const [flagReviews, setFlagReviews] = useState<Record<string, string>>({}) // flagId → thời điểm xem xét
  const [log, setLog] = useState<HistoryEntry[]>([])
  const [decision, setDecision] = useState<DecisionRecord | null>(null)

  const flags = detail?.screening.flags ?? []
  const reviewedFlags = Object.keys(flagReviews)
  const remainingCriteria = criteria.filter(
    (c) => !scores[c.id] || !evidence[c.id]?.trim()
  ).length
  const unreviewedFlags = flags.filter(
    (f) => !reviewedFlags.includes(f.id)
  ).length

  const addLog = (text: string, at = new Date().toISOString()) =>
    setLog((l) => [...l, { at, actor: CURRENT_ADMIN, text }])

  const toggleFlagReviewed = (flagId: string) => {
    const flag = flags.find((f) => f.id === flagId)
    if (flagReviews[flagId]) {
      setFlagReviews((r) =>
        Object.fromEntries(Object.entries(r).filter(([k]) => k !== flagId))
      )
      addLog(`Bỏ đánh dấu đã xem xét mục ${flag?.document}.`)
    } else {
      const at = new Date().toISOString()
      setFlagReviews((r) => ({ ...r, [flagId]: at }))
      addLog(`Đánh dấu đã xem xét mục ${flag?.document}.`, at)
    }
  }

  // MOCK: chưa gửi API. TODO(api): POST quyết định kèm scores + evidence + note
  const decide = (kind: ReviewDecision, note = '') => {
    const at = new Date().toISOString()
    if (remainingCriteria === 0)
      addLog(
        `Chấm ${criteria.length}/${criteria.length} tiêu chí năng lực.`,
        at
      )
    addLog(DECISION_LOG[kind], at)
    setDecision({ kind, at, by: CURRENT_ADMIN, note: note.trim() })
  }

  return {
    detail,
    status: decision ? DECISION_STATUS[decision.kind] : detail?.status,
    criteria,
    scores,
    setScore: (criterionId: string, level: number) =>
      setScores((s) => ({ ...s, [criterionId]: level })),
    evidence,
    setEvidence: (criterionId: string, text: string) =>
      setEvidence((e) => ({ ...e, [criterionId]: text })),
    reviewedFlags,
    flagReviews,
    toggleFlagReviewed,
    remainingCriteria,
    unreviewedFlags,
    canApprove: !decision && remainingCriteria === 0 && unreviewedFlags === 0,
    decision,
    decide,
    // Mới nhất lên đầu
    history: [...(detail?.history ?? []), ...log].sort((a, b) =>
      b.at.localeCompare(a.at)
    ),
  }
}

