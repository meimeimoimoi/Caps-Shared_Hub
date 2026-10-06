import { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { ExpertRoute } from './ExpertRoute'
import { ExpertLayout } from '../layouts/expert/ExpertLayout'
const LoginPage = lazy(() => import('@/pages/LoginPage'))
const ExpertRegistrationPage = lazy(() => import('@/pages/expert-registration/ExpertRegistrationPage'))
const ExpertDashboardPage = lazy(() => import('@/pages/expert-dashboard/ExpertDashboardPage'))
const ExpertProfilePage = lazy(() => import('@/pages/expert-dashboard/ExpertProfilePage'))
const ExpertSettingsPage = lazy(() => import('@/pages/expert-dashboard/ExpertSettingsPage'))
const ExpertServicesPage = lazy(() => import('@/pages/expert-dashboard/ExpertServicesPage'))
const ExpertCasesPage = lazy(() => import('@/pages/expert-dashboard/ExpertCasesPage'))
const ExpertCaseDetailPage = lazy(() => import('@/pages/expert-dashboard/ExpertCaseDetailPage').then(m => ({ default: m.ExpertCaseDetailPage })))
const ExpertIncomePage = lazy(() => import('@/pages/expert-dashboard/ExpertIncomePage'))

const DashboardPage = lazy(() => import('../../pages/DashboardPage'))
const NotFoundPage = lazy(() => import('../../pages/NotFoundPage'))
const AdminPendingExpertsPage = lazy(() => import('@/pages/admin/AdminPendingExpertsPage'))
const AdminApplicationDetailPage = lazy(() => import('@/pages/admin/AdminApplicationDetailPage'))
const AdminExpertsPage = lazy(() => import('@/pages/admin/AdminExpertsPage'))
const AdminDisputeDetailPage = lazy(() => import('@/pages/admin/AdminDisputeDetailPage'))
const AdminEscrowPage = lazy(() => import('@/pages/admin/AdminEscrowPage'))
const KnowledgeQueuePage = lazy(() => import('@/pages/knowledge-admin/KnowledgeQueuePage'))
const KnowledgeSourcesPage = lazy(() => import('@/pages/knowledge-admin/KnowledgeSourcesPage'))
const KnowledgeVersionPage = lazy(() => import('@/pages/knowledge-admin/KnowledgeVersionPage'))

function Fallback() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-desk-2 text-fg-muted">
      <div role="status" className="flex items-center gap-3 text-sm">
        <span aria-hidden="true" className="size-5 animate-spin rounded-full border-2 border-border border-t-accent motion-reduce:animate-none" />
        <span>Loading…</span>
      </div>
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
          <Route path="/admin/disputes" element={<AdminDisputeDetailPage />} />
          <Route path="/admin/disputes/:id" element={<AdminDisputeDetailPage />} />
          <Route path="/admin/escrow" element={<AdminEscrowPage />} />
          {/* TODO(auth): bọc ProtectedRoute + check role Knowledge Admin khi có API */}
          <Route path="/knowledge" element={<Navigate to="/knowledge/queue" replace />} />
          <Route path="/knowledge/queue" element={<KnowledgeQueuePage />} />
          <Route path="/knowledge/sources" element={<KnowledgeSourcesPage />} />
          <Route path="/knowledge/documents/:id/compare" element={<KnowledgeVersionPage />} />

          <Route element={<ExpertRoute />}>
            <Route path="/expert" element={<ExpertLayout />}>
              <Route index element={<Navigate to="overview" replace />} />
              <Route path="overview" element={<ExpertDashboardPage />} />
              <Route path="cases" element={<ExpertCasesPage key="cases" />} />
              <Route path="queue" element={<ExpertCasesPage key="queue" />} />
              <Route path="active" element={<ExpertCasesPage key="active" />} />
              <Route path="cases/:id" element={<ExpertCaseDetailPage />} />
              <Route path="services" element={<ExpertServicesPage />} />
              <Route path="income" element={<ExpertIncomePage />} />
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
