import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  decideApplication,
  getApplicationDetail,
  getCriteria,
} from '../api/adminApi'
import { adminKeys } from '../api/queryKeys'
import { CURRENT_ADMIN, DECISION_LOG, DECISION_STATUS } from '../constants'
import type { DecisionRecord, HistoryEntry, ReviewDecision } from '../types'

export function useApplicationReview(id: string) {
  const detailQuery = useQuery({
    queryKey: adminKeys.application(id),
    queryFn: ({ signal }) => getApplicationDetail(id, signal),
  })
  const criteriaQuery = useQuery({
    queryKey: adminKeys.criteria(),
    queryFn: ({ signal }) => getCriteria(signal),
  })
  const detail = detailQuery.data ?? undefined
  const criteria = criteriaQuery.data ?? []

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

  // Lịch sử + thẻ quyết định giữ tại chỗ sau khi API nhận quyết định
  const decide = async (kind: ReviewDecision, note = '') => {
    await decideApplication(id, { kind, note: note.trim(), scores, evidence })
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
    isLoading: detailQuery.isLoading || criteriaQuery.isLoading,
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
    canApprove:
      !decision &&
      criteria.length > 0 &&
      remainingCriteria === 0 &&
      unreviewedFlags === 0,
    decision,
    decide,
    // Mới nhất lên đầu
    history: [...(detail?.history ?? []), ...log].sort((a, b) =>
      b.at.localeCompare(a.at)
    ),
  }
}

