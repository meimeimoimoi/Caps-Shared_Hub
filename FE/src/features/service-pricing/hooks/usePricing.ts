import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createTier,
  getCreditPackages,
  getPricing,
  savePackage,
  scheduleTierChange,
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
