import { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'

const LoginPage = lazy(() => import('@/pages/LoginPage'))
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))
const ExpertRegistrationPage = lazy(
  () => import('@/pages/ExpertRegistrationPage')
)
const AdminPendingExpertsPage = lazy(() => import('@/pages/AdminPendingExpertsPage'))
const AdminApplicationDetailPage = lazy(() => import('@/pages/AdminApplicationDetailPage'))
const AdminExpertsPage = lazy(() => import('@/pages/AdminExpertsPage'))

function Fallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-sm text-slate-400">
      Loading...
    </div>
  )
}

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Fallback />}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/expert/register" element={<ExpertRegistrationPage />} />
          {/* TODO(auth): bọc ProtectedRoute + check role admin khi có API */}
          <Route path="/admin/experts" element={<AdminExpertsPage />} />
          <Route path="/admin/experts/pending" element={<AdminPendingExpertsPage />} />
          <Route path="/admin/experts/:id" element={<AdminApplicationDetailPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
