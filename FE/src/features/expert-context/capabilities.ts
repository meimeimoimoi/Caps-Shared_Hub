import { useExpertContext } from './hooks/useExpertContext'

/** Expert Portal capabilities granted by the server (GET /api/v1/experts/me/context). */
export const CAPABILITY = {
  application: 'application.view',
  servicesManage: 'services.manage',
  publicProfile: 'profile.public',
  casesWork: 'cases.work',
  incomeView: 'income.view',
} as const

export type Capability = (typeof CAPABILITY)[keyof typeof CAPABILITY]

/** Where an account without the needed capability is sent: its application and review progress. */
export const EXPERT_APPLICATION_PATH = '/expert/application'

/** Capabilities of the signed-in account; false until the context has loaded. */
export function useCapabilities() {
  const { data } = useExpertContext()
  const granted = new Set(data?.portalAccess.capabilities ?? [])
  return {
    ready: !!data,
    has: (capability: Capability) => granted.has(capability),
  }
}
