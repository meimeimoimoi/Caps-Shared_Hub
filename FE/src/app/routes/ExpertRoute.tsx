import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth, useAuthStore } from '@/features/auth'
import { useExpertContext } from '@/features/expert-context'
import { ApiError } from '@/shared/lib/api-client'
import { isExpertDemo } from '@/shared/lib/expert-data-source'
import '../layouts/expert/expert-theme.css'

export function ExpertRoute() {
  const authenticated = useAuthStore((s) => s.isAuthenticated)
  const location = useLocation()
  const context = useExpertContext()
  const { logout } = useAuth()
  if (!authenticated && !isExpertDemo) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  const denied = context.error instanceof ApiError && context.error.status === 403
  if (context.isPending) return <div className="expert-portal ep-access"><div role="status"><div className="ep-skeleton ep-skeleton-section" /><p>Checking Expert Portal access…</p></div></div>
  if (context.isError || !context.data?.portalAccess.allowed) return <div className="expert-portal ep-access"><div>
    <h1>{denied || context.data?.portalAccess.allowed === false ? 'Expert Portal access unavailable' : 'Unable to verify access'}</h1>
    <p>{denied ? 'The server has denied access to the Expert Portal for this account.' : context.isError ? 'Your access could not be checked. Retry to reconnect; your permissions have not been determined.' : context.data?.portalAccess.reason ?? 'This account is not permitted to enter the operational Expert Portal.'}</p>
    <div className="ep-access-actions"><button className="ep-button" onClick={() => void context.refetch()} disabled={context.isFetching}>Retry access check</button>{authenticated && <button className="ep-button" onClick={logout}>Sign out</button>}<Link className="ep-link" to="/dashboard">Back to dashboard</Link></div>
  </div></div>
  return <Outlet />
}
