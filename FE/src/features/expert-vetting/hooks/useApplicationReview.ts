import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { decideEligibility, getApplicationDetail } from '../api/adminApi'
import { adminKeys } from '../api/queryKeys'
import { CURRENT_ADMIN, ELIGIBILITY_CODES, EXPERIENCE_CODE } from '../constants'
import type {
  EligibilityAssessment,
  EligibilityResult,
  HistoryEntry,
} from '../types'
import { eligibilityOutcome } from '../utils/applications'

/** A result other than PASS must explain what is missing or why it is not met */
export const needsNote = (a: EligibilityAssessment) =>
  !!a.result && a.result !== 'PASS'

export function useApplicationReview(id: string) {
  const qc = useQueryClient()
  const detailQuery = useQuery({
    queryKey: adminKeys.application(id),
    queryFn: ({ signal }) => getApplicationDetail(id, signal),
  })
  const detail = detailQuery.data ?? undefined

  // Only the reviewer's edits; EV-06 starts from the result the declared years point to
  const [edits, setEdits] = useState<
    Record<string, Partial<EligibilityAssessment>>
  >({})
  const [flagReviews, setFlagReviews] = useState<Record<string, string>>({}) // flagId → reviewed at
  const [log, setLog] = useState<HistoryEntry[]>([])

  const assessments: EligibilityAssessment[] = ELIGIBILITY_CODES.map(
    (code) => ({
      code,
      result:
        code === EXPERIENCE_CODE
          ? (detail?.suggestedExperienceResult ?? '')
          : '',
      note: '',
      ...edits[code],
    })
  )
  const remaining = assessments.filter(
    (a) => !a.result || (needsNote(a) && !a.note.trim())
  ).length
  const outcome = eligibilityOutcome(assessments.map((a) => a.result))

  const flags = detail?.screening?.flags ?? []
  const reviewedFlags = Object.keys(flagReviews)
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

  const update = (code: string, change: Partial<EligibilityAssessment>) =>
    setEdits((e) => ({ ...e, [code]: { ...e[code], ...change } }))

  /** Demo AI flags: mark each flagged requirement as needing more information, with the AI's request as note */
  const requestFromFlags = () =>
    setEdits((e) => {
      const next = { ...e }
      for (const f of flags.filter((f) => !reviewedFlags.includes(f.id)))
        next[f.document] = {
          result: 'NEED_MORE_INFORMATION',
          note: [next[f.document]?.note, f.request].filter(Boolean).join('\n'),
        }
      return next
    })

  const decision = useMutation({
    mutationFn: (note: string) =>
      decideEligibility(id, {
        criteria: assessments.map((a) => ({
          code: a.code,
          result: a.result as EligibilityResult,
          note: a.note.trim() || null,
        })),
        note: note.trim() || null,
      }),
    onSuccess: async (updated) => {
      qc.setQueryData(adminKeys.application(id), updated)
      setEdits({})
      await qc.invalidateQueries({ queryKey: adminKeys.applications() })
    },
  })

  return {
    isLoading: detailQuery.isLoading,
    error: detailQuery.error,
    detail,
    status: detail?.status,
    assessments,
    setResult: (code: string, result: EligibilityResult) =>
      update(code, { result }),
    setNote: (code: string, note: string) => update(code, { note }),
    requestFromFlags,
    remaining,
    outcome,
    canDecide: !!detail?.canDecide && remaining === 0 && !decision.isPending,
    decide: (note = '') => decision.mutateAsync(note),
    deciding: decision.isPending,
    reviewedFlags,
    flagReviews,
    toggleFlagReviewed,
    unreviewedFlags,
    // Newest first
    history: [...(detail?.history ?? []), ...log].sort((a, b) =>
      b.at.localeCompare(a.at)
    ),
  }
}
