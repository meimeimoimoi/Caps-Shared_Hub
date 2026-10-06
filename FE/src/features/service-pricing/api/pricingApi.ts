import { api } from '@/lib/api-client'
import { isExpertDemo } from '@/lib/expert-data-source'
import type { PricingOverview } from '../types'

/* Dev chạy demo thì đọc fixtures.
 * TODO(api): đối chiếu lại đường dẫn endpoint với BE khi có Swagger. */
export async function getPricing(signal?: AbortSignal) {
  if (isExpertDemo) return structuredClone((await import('./fixtures')).mockPricing)
  return api.get<PricingOverview>('/api/admin/pricing', { signal })
}
