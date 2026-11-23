import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/store/authStore'

export function DraftRoute() {
  const authenticated = useAuthStore((state) => state.isAuthenticated)
  const location = useLocation()
  if (!authenticated)
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    )
  return <Outlet />
}
