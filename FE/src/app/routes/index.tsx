import { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { ExpertRoute } from './ExpertRoute'
import { ExpertLayout } from '../layouts/expert/ExpertLayout'
import { ExpertDashboardPage, ExpertProfilePage, ExpertSettingsPage, ExpertServicesPage, ExpertCasesPage, ExpertCaseDetailPage } from '@/features/expert-dashboard'
import { ExpertRegistrationPage } from '@/features/expert-registration'

const LoginPage = lazy(() => import('@/features/auth').then((module) => ({ default: module.LoginPage })))
const DashboardPage = lazy(() => import('../pages/DashboardPage'))
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'))
const AdminPendingExpertsPage = lazy(() => import('@/features/admin').then(m => ({ default: m.AdminPendingExpertsPage })))
const AdminApplicationDetailPage = lazy(() => import('@/features/admin').then(m => ({ default: m.AdminApplicationDetailPage })))
const AdminExpertsPage = lazy(() => import('@/features/admin').then(m => ({ default: m.AdminExpertsPage })))

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

          <Route element={<ExpertRoute />}>
            <Route path="/expert" element={<ExpertLayout />}>
              <Route index element={<Navigate to="overview" replace />} />
              <Route path="overview" element={<ExpertDashboardPage />} />
              <Route path="cases" element={<ExpertCasesPage key="cases" />} />
              <Route path="queue" element={<ExpertCasesPage key="queue" />} />
              <Route path="active" element={<ExpertCasesPage key="active" />} />
              <Route path="cases/:id" element={<ExpertCaseDetailPage />} />
              <Route path="services" element={<ExpertServicesPage />} />
              <Route path="profile" element={<ExpertProfilePage />} />
              <Route path="settings" element={<ExpertProfilePage />} />
              <Route path="settings/:section" element={<ExpertSettingsPage />} />
            </Route>
          </Route>
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
