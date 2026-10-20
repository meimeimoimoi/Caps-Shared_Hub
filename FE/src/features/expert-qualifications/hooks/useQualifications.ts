import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addQualificationFile,
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
    mutationFn: (file: File) => addQualificationFile(id, file),
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
  return { ...query, upload, remove, supplement }
}
