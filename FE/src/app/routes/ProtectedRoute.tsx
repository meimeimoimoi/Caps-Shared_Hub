import * as React from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/features/auth'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const location = useLocation()
  if (!isAuthenticated) {
    // fromState: state gốc của trang đích (vd. câu hỏi gõ ở trang chủ), trả lại sau khi đăng nhập
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
  return <>{children}</>
}

/** Admin/Knowledge: dev keeps the demo accounts; production requires a signed-in session.
 * TODO(auth): also check the admin / Knowledge Admin role once BE returns roles. */
export function StaffRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const location = useLocation()
  if (!import.meta.env.DEV && !isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    )
  }
  return <Outlet />
}
