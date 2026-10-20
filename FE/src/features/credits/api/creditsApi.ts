import { api } from '@/lib/api-client'
import { isExpertDemo } from '@/lib/expert-data-source'
import type { CreditOverview } from '../types'

/* Dev chạy demo thì đọc fixtures; production gọi billing service qua Gateway.
 * TODO(api): billing chưa có controller và chưa chốt nghiệp vụ ledger; đối chiếu đường dẫn khi BE có Swagger. */
const fixtures = () => import('./fixtures')

export const creditsKeys = {
  all: ['private', 'client', 'credits'] as const,
  overview: () => [...creditsKeys.all, 'overview'] as const,
}

export async function getCreditOverview(signal?: AbortSignal) {
  if (isExpertDemo)
    return structuredClone((await fixtures()).mockCreditOverview)
  return api.get<CreditOverview>('/api/v1/billing/credits/me', { signal })
}
