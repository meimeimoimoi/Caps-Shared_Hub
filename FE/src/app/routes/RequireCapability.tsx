import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import {
  EXPERT_APPLICATION_PATH,
  useCapabilities,
  type Capability,
} from '@/features/expert-context'

/**
 * Expert Portal page that needs a capability. ExpertRoute has already loaded the context; an account
 * without the capability (still applying, or not approved yet) goes back to its application.
 * The APIs behind these pages check permissions again.
 */
export function RequireCapability({
  capability,
  children,
}: {
  capability: Capability
  children: ReactNode
}) {
  const { has } = useCapabilities()
  // Keep the query string: demo scenarios (?scenario=) live there
  const { search } = useLocation()
  if (!has(capability))
    return <Navigate to={EXPERT_APPLICATION_PATH + search} replace />
  return <>{children}</>
}

/** /expert lands on the overview when cases are open, otherwise on the application. */
export function ExpertHome() {
  const { has } = useCapabilities()
  const { search } = useLocation()
  return (
    <Navigate
      to={
        (has('cases.work') ? '/expert/overview' : EXPERT_APPLICATION_PATH) +
        search
      }
      replace
    />
  )
}
