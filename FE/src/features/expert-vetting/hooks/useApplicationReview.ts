import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  assignSupplementGroup,
  decideEligibility,
  getApplicationDetail,
  resolveScreeningPoint,
  retryScreening,
} from '../api/adminApi'
import { adminKeys } from '../api/queryKeys'
import { isClaimConflict } from './useReviewClaim'
import {
  ELIGIBILITY_CODES,
  EXPERIENCE_CODE,
  SYSTEM_ACTOR,
  isEligibilityMet,
} from '../constants'
import type {
  EligibilityAssessment,
  EligibilityResult,
  HistoryEntry,
  ScreeningPoint,
  ScreeningPointAction,
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
    // Poll softly while AI extraction is still running; stops once settled or skipped.
    refetchInterval: (query) =>
      query.state.data?.screening?.status === 'RUNNING' ? 3000 : false,
  })
  const detail = detailQuery.data ?? undefined

  // Only the reviewer's edits. A re-review starts from the previous decision: requirements that passed (or were
  // not applicable) keep their result and note, the ones sent back start empty so they are judged again.
  // The experience requirement otherwise starts from the result the declared years point to.
  const [edits, setEdits] = useState<
    Record<string, Partial<EligibilityAssessment>>
  >({})
  // Notes written for "need more information" or "fail", set aside when the reviewer switches to PASS so a
  // passed criterion is not saved with a note that says the opposite; restorable while the page is open
  const [setAside, setSetAside] = useState<Record<string, string>>({})

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

  const screening = detail?.screening ?? null
  const points = screening?.points ?? []
  const unreviewedFlags = screening?.openPointCount ?? 0

  const update = (code: string, change: Partial<EligibilityAssessment>) =>
    setEdits((e) => ({ ...e, [code]: { ...e[code], ...change } }))

  const syncAfterScreeningChange = async (
    updated: Awaited<ReturnType<typeof resolveScreeningPoint>>
  ) => {
    qc.setQueryData(adminKeys.application(id), updated)
    await qc.invalidateQueries({ queryKey: adminKeys.queueAll() })
  }

  const resolveMutation = useMutation({
    mutationFn: (input: {
      pointId: string
      action: ScreeningPointAction
      reason?: string | null
    }) =>
      resolveScreeningPoint(id, input.pointId, {
        action: input.action,
        reason: input.reason ?? null,
      }),
    onSuccess: syncAfterScreeningChange,
    onError: (e: unknown) => {
      if (isClaimConflict(e))
        void qc.invalidateQueries({ queryKey: adminKeys.application(id) })
    },
  })

  const retryMutation = useMutation({
    mutationFn: () => retryScreening(id),
    onSuccess: syncAfterScreeningChange,
    onError: (e: unknown) => {
      if (isClaimConflict(e))
        void qc.invalidateQueries({ queryKey: adminKeys.application(id) })
    },
  })

  const assignGroupMutation = useMutation({
    mutationFn: (input: { evidenceId: string; groupCode: string | null }) =>
      assignSupplementGroup(id, input.evidenceId, input.groupCode),
    onSuccess: syncAfterScreeningChange,
    onError: (e: unknown) => {
      if (isClaimConflict(e))
        void qc.invalidateQueries({ queryKey: adminKeys.application(id) })
    },
  })

  const usePointForSupplement = async (point: ScreeningPoint) => {
    const requestText = (point.suggestedRequest || point.detail).trim()
    await resolveMutation.mutateAsync({
      pointId: point.id,
      action: 'USED_FOR_SUPPLEMENT',
      reason: requestText || null,
    })

    const criterion =
      point.targetCriterion &&
      (ELIGIBILITY_CODES as readonly string[]).includes(point.targetCriterion)
        ? point.targetCriterion
        : EXPERIENCE_CODE

    const existing = assessments.find((a) => a.code === criterion)?.note ?? ''
    const mergedNote = [existing.trim(), requestText]
      .filter((part, idx, arr) => !!part && arr.indexOf(part) === idx)
      .join('\n')

    update(criterion, {
      result: 'NEED_MORE_INFORMATION',
      note: mergedNote,
    })
  }

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
      if (isClaimConflict(e))
        void qc.invalidateQueries({ queryKey: adminKeys.application(id) })
    },
  })

  const screeningHistory: HistoryEntry[] = (screening?.history ?? []).map(
    (h) => ({
      at: h.at,
      actor: h.bySystem ? SYSTEM_ACTOR : '',
      text: h.message,
    })
  )

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
    remaining,
    outcome,
    canDecide:
      !!detail?.canDecide &&
      remaining === 0 &&
      unreviewedFlags === 0 &&
      !decision.isPending,
    decide: (note = '') => decision.mutateAsync(note),
    deciding: decision.isPending,
    screeningPoints: points,
    unreviewedFlags,
    screeningBusy:
      resolveMutation.isPending ||
      retryMutation.isPending ||
      assignGroupMutation.isPending,
    resolvePoint: (
      pointId: string,
      action: ScreeningPointAction,
      reason?: string | null
    ) => resolveMutation.mutateAsync({ pointId, action, reason }),
    usePointForSupplement,
    retryScreening: () => retryMutation.mutateAsync(),
    assignSupplementGroup: (evidenceId: string, groupCode: string | null) =>
      assignGroupMutation.mutateAsync({ evidenceId, groupCode }),
    // Newest first
    history: [...(detail?.history ?? []), ...screeningHistory].sort((a, b) =>
      b.at.localeCompare(a.at)
    ),
  }
}
