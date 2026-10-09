import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createTier,
  getPricing,
  savePackage,
  scheduleTierChange,
} from '../api/pricingApi'
import type { NewTierInput, PackageInput, TierChangeInput } from '../types'

const KEY = ['private', 'admin', 'pricing'] as const

export function usePricing() {
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: KEY,
    queryFn: ({ signal }) => getPricing(signal),
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
