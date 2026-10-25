import { api, ApiError } from '@/lib/api-client'
import { useAuthStore } from '@/features/auth/store/authStore'
import { isExpertDemo } from '@/lib/expert-data-source'
import type { ExpertContext } from '../types'

/** Demo scenarios that only narrow access; none of them can grant more than the server would. */
const CONTEXT_SCENARIOS = ['context-error', 'applicant', 'denied']

/**
 * The server decides portal access, so a signed-in account always gets its real context, even in demo
 * mode (demo data only fills pages that have no API yet). Fixtures are used when browsing the demo
 * signed out, or to preview a restricting scenario.
 */
export async function getExpertContext(
  signal: AbortSignal,
  scenario: string
): Promise<ExpertContext> {
  const signedIn = useAuthStore.getState().isAuthenticated
  if (isExpertDemo && (!signedIn || CONTEXT_SCENARIOS.includes(scenario))) {
    const { createExpertContextFixture } = await import('./fixtures')
    const data = createExpertContextFixture()
    if (scenario === 'context-error')
      throw new ApiError(
        'Expert access could not be loaded. Please retry.',
        503
      )
    if (scenario === 'applicant') {
      data.stage = 'APPLICATION'
      data.applicationStatus = 'SUBMITTED'
      data.portalAccess = {
        allowed: true,
        reason: null,
        capabilities: ['application.view'],
      }
    }
    if (scenario === 'denied')
      data.portalAccess = {
        allowed: false,
        reason:
          'This account does not have access to the operational Expert Portal.',
        capabilities: [],
      }
    return data
  }
  const response = await api.get<{ data: ExpertContext }>(
    '/api/v1/experts/me/context',
    { signal }
  )
  return response.data
}

/** Professional name and contact phone, edited from the expert settings; neither may be blank. */
export async function updateExpertContact(body: {
  displayName: string
  phone: string
}): Promise<{ displayName: string; phone: string | null }> {
  const response = await api.put<{
    data: { displayName: string; phone: string | null }
  }>('/api/v1/experts/me/profile', body)
  return response.data
}

/**
 * Whether the signed-in account has an expert profile or application. Used right after sign-in, so an
 * applicant who has not verified the email goes back to the application instead of the verification wall.
 * Failures propagate so a temporary outage cannot misclassify an applicant as a customer.
 */
export async function hasExpertApplication(): Promise<boolean> {
  const response = await api.get<{ data: ExpertContext }>(
    '/api/v1/experts/me/context'
  )
  return response.data.expertId != null || response.data.applicationStatus != null
}
