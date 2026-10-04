import { api, ApiError } from '@/shared/lib/api-client'
import { isExpertDemo } from '@/shared/lib/expert-data-source'
import type { DashboardDto } from '../model/types'

export async function getExpertDashboard(signal: AbortSignal, scenario: string): Promise<DashboardDto> {
  if (isExpertDemo) {
    if (scenario === 'error') throw new ApiError('The overview could not be loaded. Please retry.', 503)
    const { createDashboardFixture } = await import('./fixtures')
    return createDashboardFixture(scenario)
  }
  return api.get<DashboardDto>('/api/expert/me/dashboard', { signal })
}
