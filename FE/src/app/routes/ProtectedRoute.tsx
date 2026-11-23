import * as React from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import {
  hasAnyPermission,
  useAuthStore,
  type PermissionName,
} from '@/features/auth'
import ForbiddenPage from '@/pages/ForbiddenPage'

export function ProtectedRoute({
  children,
}: {
  children: React.ReactNode
}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const pending = useAuthStore(
    (s) => s.user?.status === 'PENDING_VERIFICATION'
  )
  const location = useLocation()
  if (!isAuthenticated) {
    // Preserve the requested page and its state across sign-in.
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname + location.search + location.hash,
          fromState: location.state,
        }}
      />
    )
  }
  // Every signed-in area needs a verified email; the requested page opens after verifying
  if (pending)
    return <PendingVerificationRedirect />
  return <>{children}</>
}

/** Sends an account that has not verified its email to /verify-email, keeping the requested page. */
export function PendingVerificationRedirect() {
  const location = useLocation()
  return (
    <Navigate
      to="/verify-email"
      replace
      state={{
        from: location.pathname + location.search + location.hash,
        fromState: location.state,
      }}
    />
  )
}

/** Staff areas (Admin, Knowledge, Reviewer), in every environment: signed out goes to /login,
 * signed in without any of the permissions sees 403. The APIs behind these pages check again. */
export function PermissionRoute({
  anyOf,
}: {
  anyOf: readonly PermissionName[]
}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)
  const location = useLocation()
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    )
  }
  if (!hasAnyPermission(user, anyOf)) return <ForbiddenPage />
  return <Outlet />
}
