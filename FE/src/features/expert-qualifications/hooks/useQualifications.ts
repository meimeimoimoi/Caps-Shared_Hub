import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addQualificationFile,
  addQualificationLink,
  saveCompetencyDescription,
  setEvidenceCompetencies,
  submitQualification,
  getQualification,
  getQualifications,
  qualificationKeys,
  registerForService,
  removeQualificationFile,
  supplementQualification,
} from '../api/qualificationsApi'
import type { Qualification } from '../types'

/** Services the expert can register for, with the latest qualification of each */
export function useQualificationOverview() {
  return useQuery({
    queryKey: qualificationKeys.overview(),
    queryFn: ({ signal }) => getQualifications(signal),
  })
}

/** Keeps the overview and the portal readiness in step after a change */
function useRefresh() {
  const qc = useQueryClient()
  return (updated: Qualification) => {
    qc.setQueryData(qualificationKeys.detail(updated.id), updated)
    void qc.invalidateQueries({ queryKey: qualificationKeys.overview() })
    void qc.invalidateQueries({
      predicate: (q) => q.queryKey.includes('expert-context'),
    })
  }
}

export function useRegisterForService() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: registerForService,
    onSuccess: refresh,
  })
}

/** One qualification with the actions the expert can take on it */
export function useQualification(id: string) {
  const refresh = useRefresh()
  const query = useQuery({
    queryKey: qualificationKeys.detail(id),
    queryFn: ({ signal }) => getQualification(id, signal),
  })
  const upload = useMutation({
    mutationFn: (input: { file: File; competencies: string[] }) =>
      addQualificationFile(id, input.file, input.competencies),
    onSuccess: refresh,
  })
  const addLink = useMutation({
    mutationFn: (input: { url: string; competencies: string[] }) =>
      addQualificationLink(id, input.url, input.competencies),
    onSuccess: refresh,
  })
  const tie = useMutation({
    mutationFn: (input: { evidenceId: string; competencies: string[] }) =>
      setEvidenceCompetencies(id, input.evidenceId, input.competencies),
    onSuccess: refresh,
  })
  const describe = useMutation({
    mutationFn: (input: { code: string; text: string }) =>
      saveCompetencyDescription(id, input.code, input.text),
    onSuccess: refresh,
  })
  const submit = useMutation({
    mutationFn: () => submitQualification(id),
    onSuccess: refresh,
  })
  const remove = useMutation({
    mutationFn: (evidenceId: string) => removeQualificationFile(id, evidenceId),
    onSuccess: refresh,
  })
  const supplement = useMutation({
    mutationFn: (note: string) => supplementQualification(id, note),
    onSuccess: refresh,
  })
  return { ...query, upload, addLink, tie, describe, submit, remove, supplement }
}
