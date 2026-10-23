import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { decideEligibility, getApplicationDetail } from '../api/adminApi'
import { adminKeys } from '../api/queryKeys'
import { isClaimConflict } from './useReviewClaim'
import {
  CURRENT_ADMIN,
  ELIGIBILITY_CODES,
  EXPERIENCE_CODE,
  isEligibilityMet,
} from '../constants'
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

  // Only the reviewer's edits. A re-review starts from the previous decision: requirements that passed (or were
  // not applicable) keep their result and note, the ones sent back start empty so they are judged again.
  // The experience requirement otherwise starts from the result the declared years point to.
  const [edits, setEdits] = useState<
    Record<string, Partial<EligibilityAssessment>>
  >({})
  const [flagReviews, setFlagReviews] = useState<Record<string, string>>({}) // flagId → reviewed at
  // Notes written for "need more information" or "fail", set aside when the reviewer switches to PASS so a
  // passed criterion is not saved with a note that says the opposite; restorable while the page is open
  const [setAside, setSetAside] = useState<Record<string, string>>({})
  const [log, setLog] = useState<HistoryEntry[]>([])

  const declarationPassed = detail?.declarationPassedCriteria ?? []
  const assessments: EligibilityAssessment[] = ELIGIBILITY_CODES.map((code) => {
    // Proven by the statement the applicant agreed to: PASS unless the reviewer has grounds and changes it
    if (declarationPassed.includes(code))
      return { code, result: 'PASS', note: '', ...edits[code] }
    const previous = detail?.eligibility.find((item) => item.code === code)
    const passed = !!previous && isEligibilityMet(previous.result)
    return {
      code,
      result: passed
        ? previous.result
        : code === EXPERIENCE_CODE
          ? (detail?.suggestedExperienceResult ?? '')
          : '',
      note: passed ? (previous.note ?? '') : '',
      ...edits[code],
    }
  })
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
      await qc.invalidateQueries({ queryKey: adminKeys.queueAll() })
    },
    // The claim expired or moved to another reviewer: reload to show who holds it now
    onError: (e: unknown) => {
      if (isClaimConflict(e)) void qc.invalidateQueries({ queryKey: adminKeys.application(id) })
    },
  })

  return {
    isLoading: detailQuery.isLoading,
    error: detailQuery.error,
    detail,
    status: detail?.status,
    assessments,
    setResult: (code: string, result: EligibilityResult) => {
      const current = assessments.find((a) => a.code === code)
      const note = current?.note.trim() ?? ''
      if (result === 'PASS' && current && needsNote(current) && note) {
        setSetAside((s) => ({ ...s, [code]: current.note }))
        update(code, { result, note: '' })
        return
      }
      // Back to a result that needs a note: bring the set-aside note back if nothing new was written
      if (result !== 'PASS' && !note && setAside[code]) {
        update(code, { result, note: setAside[code] })
        setSetAside(({ [code]: _, ...rest }) => rest)
        return
      }
      update(code, { result })
    },
    /** Note moved aside when the criterion was switched to PASS, if any */
    setAsideNote: (code: string) => setAside[code],
    restoreNote: (code: string) => {
      if (!setAside[code]) return
      update(code, { note: setAside[code] })
      setSetAside(({ [code]: _, ...rest }) => rest)
    },
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
