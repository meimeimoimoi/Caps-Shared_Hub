import { api, ApiError } from '@/lib/api-client'
import { isExpertDemo } from '@/lib/expert-data-source'
import type { ExpertContext } from '../types'

export async function getExpertContext(signal: AbortSignal, scenario: string): Promise<ExpertContext> {
  if (isExpertDemo) {
    const { createExpertContextFixture } = await import('./fixtures')
    const data = createExpertContextFixture()
    if (scenario === 'context-error') throw new ApiError('Expert access could not be loaded. Please retry.', 503)
    if (scenario === 'denied') data.portalAccess = { allowed: false, reason: 'This account does not have access to the operational Expert Portal.', capabilities: [] }
    return data
  }
  return api.get<ExpertContext>('/api/expert/me/context', { signal })
}
