import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getExpertBio, saveExpertBio } from '../api/expertBioApi'
import type { ExpertBioInput } from '../types'

const bioKey = (expertId: string) => ['public', 'expert-bio', expertId] as const

export function useExpertBio(expertId: string | undefined) {
  return useQuery({
    queryKey: bioKey(expertId ?? ''),
    queryFn: () => getExpertBio(expertId!),
    enabled: Boolean(expertId),
    retry: false,
  })
}

export function useSaveExpertBio(expertId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: ExpertBioInput) => saveExpertBio(expertId, input),
    onSuccess: (data) => client.setQueryData(bioKey(expertId), data),
  })
}
