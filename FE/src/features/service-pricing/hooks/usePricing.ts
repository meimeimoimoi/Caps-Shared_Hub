import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createTier,
  getAiBilling,
  getCreditPackages,
  getPricing,
  savePackage,
  scheduleTierChange,
  setAiBilling,
  setAiPrices,
} from '../api/pricingApi'
import type { NewTierInput, PackageInput, TierChangeInput } from '../types'

const KEY = ['private', 'admin', 'pricing'] as const

/** Admin list of credit packages; under KEY so saving a package refreshes it too */
export function useCreditPackages() {
  return useQuery({
    queryKey: [...KEY, 'packages'],
    queryFn: ({ signal }) => getCreditPackages(signal),
  })
}

export function usePricing(enabled = true) {
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: KEY,
    queryFn: ({ signal }) => getPricing(signal),
    enabled,
  })
  const refresh = () => qc.invalidateQueries({ queryKey: KEY })
  return {
    ...query,
    schedule: (tierId: string, input: TierChangeInput) =>
      scheduleTierChange(tierId, input).then(refresh),
    createTier: (input: NewTierInput) => createTier(input).then(refresh),
    savePackage: (input: PackageInput) => savePackage(input).then(refresh),
  }
}

const AI_BILLING_KEY = [...KEY, 'ai-billing'] as const

/** The paid-AI switch; saving puts the server's answer straight into the cache */
export function useAiBilling(enabled = true) {
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: AI_BILLING_KEY,
    queryFn: ({ signal }) => getAiBilling(signal),
    enabled,
  })
  const mutation = useMutation({
    mutationFn: setAiBilling,
    onSuccess: (saved) => qc.setQueryData(AI_BILLING_KEY, saved),
  })
  const prices = useMutation({
    mutationFn: setAiPrices,
    onSuccess: (saved) => qc.setQueryData(AI_BILLING_KEY, saved),
  })
  return {
    ...query,
    set: mutation.mutateAsync,
    saving: mutation.isPending,
    setPrices: prices.mutateAsync,
  }
}
