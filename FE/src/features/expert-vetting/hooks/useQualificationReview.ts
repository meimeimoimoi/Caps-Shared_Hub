import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  decideCompetency,
  getQualificationDetail,
} from '../api/qualificationApi'
import { adminKeys } from '../api/queryKeys'
import { COMPETENCY_CODES } from '../constants'
import type { CompetencyAssessment, CompetencyResult } from '../types'
import { competencyOutcome } from '../utils/applications'

/** Every competency needs a note; PASS and FAIL must also cite a file */
export const isComplete = (a: CompetencyAssessment) =>
  !!a.result &&
  !!a.note.trim() &&
  (a.result === 'NEED_MORE_INFORMATION' || a.evidenceIds.length > 0)

export function useQualificationReview(id: string) {
  const qc = useQueryClient()
  const detailQuery = useQuery({
    queryKey: adminKeys.qualification(id),
    queryFn: ({ signal }) => getQualificationDetail(id, signal),
  })
  const detail = detailQuery.data ?? undefined

  // Only the reviewer's edits; every competency starts empty (no auto-pass, BR-E08)
  const [edits, setEdits] = useState<
    Record<string, Partial<CompetencyAssessment>>
  >({})
  const assessments: CompetencyAssessment[] = COMPETENCY_CODES.map((code) => ({
    code,
    result: '',
    note: '',
    evidenceIds: [],
    ...edits[code],
  }))
  const remaining = assessments.filter((a) => !isComplete(a)).length
  const outcome = competencyOutcome(assessments.map((a) => a.result))

  const update = (code: string, change: Partial<CompetencyAssessment>) =>
    setEdits((e) => ({ ...e, [code]: { ...e[code], ...change } }))

  const toggleEvidence = (code: string, evidenceId: string) => {
    const current =
      assessments.find((a) => a.code === code)?.evidenceIds ?? []
    update(code, {
      evidenceIds: current.includes(evidenceId)
        ? current.filter((x) => x !== evidenceId)
        : [...current, evidenceId],
    })
  }

  const decision = useMutation({
    mutationFn: (note: string) =>
      decideCompetency(id, {
        competencies: assessments.map((a) => ({
          code: a.code,
          result: a.result as CompetencyResult,
          note: a.note.trim(),
          evidenceIds: a.evidenceIds,
        })),
        note: note.trim() || null,
      }),
    onSuccess: async (updated) => {
      qc.setQueryData(adminKeys.qualification(id), updated)
      setEdits({})
      await qc.invalidateQueries({ queryKey: adminKeys.qualifications() })
    },
  })

  return {
    isLoading: detailQuery.isLoading,
    error: detailQuery.error,
    detail,
    assessments,
    setResult: (code: string, result: CompetencyResult) =>
      update(code, { result }),
    setNote: (code: string, note: string) => update(code, { note }),
    toggleEvidence,
    remaining,
    outcome,
    canDecide: !!detail?.canDecide && remaining === 0 && !decision.isPending,
    decide: (note = '') => decision.mutateAsync(note),
    deciding: decision.isPending,
    // Newest first
    history: [...(detail?.history ?? [])].sort((a, b) =>
      b.at.localeCompare(a.at)
    ),
  }
}
